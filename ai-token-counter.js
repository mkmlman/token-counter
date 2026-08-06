/*!
 * AITokenCounter v1.0.0
 *
 * A small, dependency-free widget that displays an AI token count with a
 * verified/estimated badge, cost, and model label. Designed to be dropped
 * into any static site with a single <script> + <link> include.
 *
 * Usage:
 *   AITokenCounter.init({
 *     target: "#ai-counter",   // CSS selector or Element
 *     tokens: 2841921,
 *     verified: true,
 *     estimated: false,
 *     model: "GPT-5",
 *     cost: 42.18,
 *     theme: "auto"            // "auto" | "light" | "dark"
 *   });
 *
 * The public surface is intentionally small: init() returns an instance
 * handle with update()/destroy() so hosts can drive it from their own code
 * (live updates, API polling, framework wrappers) without touching the
 * internals. Everything else lives in a closure — the only global added is
 * `AITokenCounter`.
 *
 * MIT License
 */
(function (root, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    // CommonJS — handy for bundlers / future npm packaging
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    // AMD
    define([], factory);
  } else {
    // Browser global
    root.AITokenCounter = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0.0";

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------

  // Central defaults. Future options are stubbed here (and normalized in
  // normalizeOptions) so adding them later never changes the public API:
  //   source    — URL of an API endpoint that returns { tokens, ... }
  //   live      — poll/reconnect for live updates
  //   models    — multiple model entries
  //   template  — custom render function
  //   themes    — custom theme objects
  var DEFAULTS = {
    target: null,
    tokens: 0,
    verified: false,
    estimated: false,
    badge: true, // show the ✓ Verified / Estimated pill (set false to hide)
    model: null,
    cost: null,
    label: "tokens",
    theme: "auto", // "auto" | "light" | "dark"
    duration: 1400, // count-up animation length (ms)
    // future: source, live, models, template, themes
  };

  function normalizeOptions(opts) {
    var out = {};
    var key;
    for (key in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
        out[key] = DEFAULTS[key];
      }
    }
    if (!opts || typeof opts !== "object") return out;
    for (key in opts) {
      if (Object.prototype.hasOwnProperty.call(opts, key) && opts[key] != null) {
        out[key] = opts[key];
      }
    }
    // `estimated` may be given explicitly; otherwise derive from `verified`.
    if (opts.estimated === undefined || opts.estimated === null) {
      out.estimated = !out.verified;
    }
    out.tokens = clampNonNegative(toNumber(out.tokens));
    if (out.cost != null) out.cost = toNumber(out.cost);
    return out;
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  function toNumber(value) {
    var n = Number(value);
    return isNaN(n) ? 0 : n;
  }

  function clampNonNegative(n) {
    return n < 0 ? 0 : n;
  }

  // Format 2841921 -> "2.84M", 845000 -> "845K", 1234 -> "1.2K", 42 -> "42".
  function formatTokens(value) {
    var n = toNumber(value);
    if (n >= 1e9) return trimDigits(n / 1e9, 2) + "B";
    if (n >= 1e6) return trimDigits(n / 1e6, 2) + "M";
    if (n >= 1e3) return trimDigits(n / 1e3, 1) + "K";
    return String(Math.round(n));
  }

  // Round to `places` and drop trailing zeros: 2.8400 -> "2.84", 845.0 -> "845".
  function trimDigits(value, places) {
    var fixed = value.toFixed(places);
    if (fixed.indexOf(".") !== -1) {
      fixed = fixed.replace(/0+$/, "").replace(/\.$/, "");
    }
    return fixed;
  }

  function formatCost(value) {
    if (value == null || isNaN(value)) return null;
    return "$" + Number(value).toFixed(2);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function shallowCopy(obj) {
    var copy = {};
    var key;
    for (key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = obj[key];
      }
    }
    return copy;
  }

  // ---------------------------------------------------------------------------
  // Theme
  // ---------------------------------------------------------------------------

  // Resolve the effective theme. "auto" prefers an explicit data-theme on the
  // document root (the convention this site and many others use), falling
  // back to the OS preference.
  function resolveTheme(preference) {
    if (preference === "light" || preference === "dark") return preference;
    var rootTheme =
      document.documentElement && document.documentElement.getAttribute("data-theme");
    if (rootTheme === "light" || rootTheme === "dark") return rootTheme;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function buildMarkup(state) {
    var badgeClass = state.verified ? "aitc__badge--verified" : "aitc__badge--estimated";
    var badgeText = state.verified ? "\u2713 Verified" : "Estimated";

    var modelHtml = state.model
      ? '<span class="aitc__model">' + escapeHtml(state.model) + "</span>"
      : "";
    var cost = formatCost(state.cost);
    var costHtml = cost ? '<span class="aitc__cost">' + cost + "</span>" : "";
    var metaHtml = modelHtml + costHtml;
    if (metaHtml) metaHtml = '<div class="aitc__meta">' + metaHtml + "</div>";

    var badgeHtml = state.badge
      ? '<span class="aitc__badge ' +
        badgeClass +
        '">' +
        badgeText +
        "</span>"
      : "";

    return (
      '<div class="aitc" data-aitc-theme="' +
      state.theme +
      '">' +
      '<div class="aitc__card">' +
      '<div class="aitc__top">' +
      '<span class="aitc__label">' +
      escapeHtml(state.label) +
      "</span>" +
      badgeHtml +
      "</div>" +
      '<div class="aitc__count" role="text" aria-label="' +
      escapeHtml(formatTokens(state.tokens)) +
      " tokens" +
      '">' +
      formatTokens(state.tokens) +
      "</div>" +
      metaHtml +
      "</div>" +
      "</div>"
    );
  }

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  function animateCount(el, from, to, duration, done) {
    // Respect reduced-motion preferences: skip straight to the final value.
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.textContent = formatTokens(to);
      if (done) done();
      return;
    }

    var startTime = null;

    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutCubic for a satisfying settle
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = from + (to - from) * eased;
      el.textContent = formatTokens(value);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else if (done) {
        done();
      }
    }

    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------------------
  // Instance lifecycle
  // ---------------------------------------------------------------------------

  // Kept private so only one instance exists per target element.
  var instances = [];

  function createInstance(options) {
    var state = normalizeOptions(options);
    var target =
      typeof options.target === "string"
        ? document.querySelector(options.target)
        : options.target;

    if (!target) {
      // Graceful degradation: a missing target must never break the host page.
      if (typeof console !== "undefined" && console.warn) {
        console.warn("AITokenCounter: target not found, widget not rendered.");
      }
      return null;
    }

    var existing = target.querySelector(".aitc");
    if (existing && existing.aitcInstance) {
      return existing.aitcInstance;
    }

    target.innerHTML = buildMarkup(state);
    var rootEl = target.querySelector(".aitc");
    var countEl = rootEl.querySelector(".aitc__count");

    // The host keeps its element; we render a single .aitc root inside it.
    var handle = {
      element: target,
      _state: state, // mutable state (see updateInstance)
      update: function (patch) {
        return updateInstance(handle, patch);
      },
      destroy: function () {
        return destroyInstance(handle);
      },
      getState: function () {
        return shallowCopy(state);
      },
    };

    rootEl.aitcInstance = handle;
    instances.push(handle);

    // Animate only on first render (count-up from zero); later update() calls
    // re-render in place without re-animating.
    animateCount(countEl, 0, state.tokens, state.duration);

    return handle;
  }

  function updateInstance(handle, patch) {
    if (!handle) return null;
    // Mutate the handle's own state so getState() reflects the latest values.
    var state = handle._state;
    if (patch && typeof patch === "object") {
      var key;
      for (key in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, key) && patch[key] != null) {
          state[key] = patch[key];
        }
      }
      if (patch.estimated === undefined || patch.estimated === null) {
        state.estimated = !state.verified;
      }
      state.tokens = clampNonNegative(toNumber(state.tokens));
      if (state.cost != null) state.cost = toNumber(state.cost);
    }
    // Re-render inside the same host element; the widget root is re-created,
    // so rebind the instance reference to the fresh node.
    handle.element.innerHTML = buildMarkup(state);
    var rootEl = handle.element.querySelector(".aitc");
    rootEl.aitcInstance = handle;
    return handle;
  }

  function destroyInstance(handle) {
    if (!handle || !handle.element) return;
    handle.element.innerHTML = "";
    delete handle.element.aitcInstance;
    var idx = instances.indexOf(handle);
    if (idx !== -1) instances.splice(idx, 1);
  }

  // ---------------------------------------------------------------------------
  // Theme watching
  // ---------------------------------------------------------------------------

  // When any instance uses "auto" and the document theme changes, re-paint so
  // the widget follows the host (light <-> dark toggle, OS changes).
  var themeWatchers = [];

  function repaintThemes() {
    var i, handle, state;
    for (i = 0; i < themeWatchers.length; i++) {
      handle = themeWatchers[i];
      if (!handle || !handle.element) continue;
      state = handle.getState();
      var rootEl = handle.element.querySelector(".aitc");
      if (rootEl) {
        rootEl.setAttribute("data-aitc-theme", resolveTheme(state.theme));
      }
    }
  }

  function watchThemes() {
    if (themeWatchers.length) return; // already watching
    if (typeof window.matchMedia === "function") {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", repaintThemes);
    }
    // Listen for data-theme attribute changes on <html> (theme toggles).
    if (typeof MutationObserver !== "undefined") {
      new MutationObserver(repaintThemes).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    }
  }

  function registerThemeWatcher(handle) {
    themeWatchers.push(handle);
    watchThemes();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    version: VERSION,
    init: function (options) {
      var opts = options || {};
      // Defer if the document is still parsing (script in <head>).
      if (document.readyState === "loading") {
        var initFn = function () {
          var handle = createInstance(opts);
          if (handle) registerThemeWatcher(handle);
          return handle;
        };
        document.addEventListener("DOMContentLoaded", initFn, { once: true });
        return { deferred: true };
      }
      var instance = createInstance(opts);
      if (instance) registerThemeWatcher(instance);
      return instance;
    },
    formatTokens: formatTokens,
  };
});
