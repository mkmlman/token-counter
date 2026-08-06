# AITokenCounter

A small, **dependency-free** JavaScript widget that shows an AI token count with a
verified/estimated badge, model, and cost. Drop it into *any* static site with one
`<link>` and one `<script>` — no framework, no build step, no network calls.

![npm](https://img.shields.io/npm/v/ai-token-counter)

## Usage

```html
<link rel="stylesheet" href="ai-token-counter.css">
<div id="ai-counter"></div>
<script src="ai-token-counter.js"></script>
<script>
  AITokenCounter.init({
    target: "#ai-counter",
    tokens: 2841921,
    verified: true,
    estimated: false,
    model: "GPT-5",
    cost: 42.18,
    theme: "auto"   // "auto" | "light" | "dark"
  });
</script>
```

Or via CDN (e.g. jsDelivr):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mkmlman/ai-token-counter@v1.0.0/ai-token-counter.css">
<script src="https://cdn.jsdelivr.net/gh/mkmlman/ai-token-counter@v1.0.0/ai-token-counter.js"></script>
```

## Options

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `target` | string \| Element | — | **required** — CSS selector or element to render into |
| `tokens` | number | `0` | The token count; formats as `2.84M`, `845K`, `1.5B` |
| `verified` | boolean | `false` | Shows the "✓ Verified" badge |
| `estimated` | boolean | — | Overrides `verified` when explicitly set |
| `badge` | boolean | `true` | Set `false` to hide the verified/estimated pill |
| `model` | string | — | Optional model label |
| `cost` | number | — | Optional cost; formats as `$42.18` |
| `label` | string | `"tokens"` | Micro-label above the count |
| `theme` | string | `"auto"` | `"auto"` follows the host's `data-theme` attr then OS; or `"light"`/`"dark"` |
| `duration` | number | `1400` | Count-up animation length (ms) |

All options except `target` are optional — missing `model`/`cost`/`badge` degrade
gracefully, and a missing `target` logs a warning without breaking the page.

## API

`init()` returns an instance handle:

```js
var counter = AITokenCounter.init({ target: "#ai-counter", tokens: 1000 });

counter.getState();                     // { ...current options }
counter.update({ tokens: 2000000 });    // re-render in place (no re-animation)
counter.destroy();                      // remove the widget from the DOM
```

`AITokenCounter.formatTokens(n)` and `AITokenCounter.version` are also exposed.

## Behavior

- **Count-up animation** on first render (`easeOutCubic`, honors `prefers-reduced-motion`).
- **Large-number formatting**: `2841921 → 2.84M`, `845000 → 845K`, `1500000000 → 1.5B`.
- **Theme-aware**: `theme: "auto"` reads the host's `data-theme` attribute first,
  falls back to the OS `prefers-color-scheme`, and re-paints live when either changes.
- **Scoped + themable**: all styles are `aitc__`-namespaced and driven by
  `--aitc-*` CSS custom properties, so a host can restyle without collisions.
- **No globals**: the only global added is `AITokenCounter`. UMD wrapper supports
  browser global, CommonJS, and AMD.
- **Responsive**: collapses gracefully on small screens.

## Future roadmap (not yet implemented)

The code is structured so these can be added without breaking the public API:

- **API endpoint input** — `source` option: fetch `{ tokens, ... }` from a URL
- **Live updates** — `live` option: polling/reconnect on the widget
- **Multiple AI models** — `models` option: per-model breakdowns
- **Custom themes** — `themes` option: named theme objects
- **Custom templates** — `template` option: custom render function
- **Framework wrappers** — thin bindings for React, Vue, Svelte, etc.

## Development

```sh
npm run check   # node --check ai-token-counter.js
npm run demo    # serve the standalone demo at :8080
```

## License

[MIT](LICENSE)
