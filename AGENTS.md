# AGENTS.md — dsh-astra

## Identity
- **Repository**: `lql341/dsh-astra`
- **Package**: `dsh-astra` (npm)
- **Type**: dsh-TUI ecosystem plugin (Cordis runtime plugin)
- **Language**: TypeScript, ESM only
- **License**: MIT
- **Node**: `^22.19 || >=24`

## Branches
- `main` is the single intended development line and includes the former `dev` capability-detection direction.
- Remove the old `dev` branch after the merged implementation is committed and host-verified.

## Plugin contract
Exports `name`, `Config` (type), `Config` (schema), `apply(ctx, config)`.
No default export. Patched via `cordis.patch.yml`.

## Key design decisions
1. **Independent clock** — 4–20 fps, not per-token
2. **Testable star math** — deterministic for an explicit seed; startup uses a time-based seed
3. **Adaptive host seam** — prefer optional ambient, otherwise use `registerView({ maxRows: 3 })`
4. **Degradation chain** — truecolor → 256 → 16 → plain glyphs; auto mode disables on non-TTY/light theme
5. **Full viewport needs host support** — dsh-TUI 0.10.1 currently exposes only the three-row status seam

## Current implementation gaps
- `src/settings.ts` is not registered by `apply()`.
- Command changes are in-memory and are not persisted.
- A view is registered only when startup mode is on; `/astra on` cannot register a missing view.
- Thinking/working transforms are fixed state poses, not accumulating motion.

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
