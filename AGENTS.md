# AGENTS.md — dsh-astra

## Identity
- **Repository**: `lql341/dsh-astra`
- **Package**: `dsh-astra` (npm)
- **Type**: dsh-TUI ecosystem plugin (Cordis runtime plugin)
- **Language**: TypeScript, ESM only
- **License**: MIT
- **Node**: `^22.19 || >=24`

## Plugin contract
Exports `name`, `Config` (type), `Config` (schema), `apply(ctx, config)`.
No default export. Patched via `cordis.patch.yml`.

## Key design decisions
1. **Independent clock** — 4–20 fps, not per-token
2. **Pure star math** — deterministic, frame-rate-independent
3. **Status-view integration** — `ctx.tuiStatus.registerView()` (stable seam)
4. **Degradation chain** — truecolor → 256 → 16 → disabled
5. **Future ambient seam** — when dsh-TUI adds `ctx.tuiAmbient`, upgrade to full-viewport

## Boundaries
- Must NOT import from dsh-TUI `src/` internals
- Must NOT import `@deepseek-ai/*` beyond `cordis` + `schemastery`
- Must NOT write to stdout directly
- Must NOT leak timers after teardown

## Publishing
```sh
pnpm build && git tag v0.1.0 && git push --tags
# npm publish
```
