# ✨ dsh-astra

> Astra-style starfield visual plugin for dsh-TUI — idle shimmer, thinking convergence,
> working flow, completed burst.

<p align="center">
  <img alt="npm" src="https://img.shields.io/npm/v/dsh-astra?style=flat-square&color=4b6fff">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-263146?style=flat-square">
  <img alt="status" src="https://img.shields.io/badge/status-experimental-7da1de?style=flat-square">
</p>

---

## Preview

<p align="center">
  <img alt="dsh-astra full-screen starfield preview" src="docs/astra-demo.png">
</p>

Full-screen rendering is selected automatically when the host exposes an ambient
rendering surface. Hosts with a limited status area use the available height
instead of assuming a fixed three-row layout.

## Quick start

```sh
dsh plugin --profile dsh-tui add dsh-astra
```

Then launch dsh-TUI as usual:

```sh
dsh --profile dsh-tui
# or: dst
```

The starfield appears in the largest safe rendering area available on dark terminals.

---

## Controls

| Command | Effect |
|---------|--------|
| `/astra on` | Enable starfield |
| `/astra off` | Disable starfield |
| `/astra toggle` | Toggle on/off |
| `/astra status` | Show config: density, fps, env |

In `/settings` → **dsh-astra 星空特效** you can adjust:

- **启用星空特效** — toggle on/off
- **星点密度** — `稀疏` / `正常` / `密集`
- **动画帧率** — 4–20 fps (default 10)

---

## Environment

| Variable | Values | Default |
|----------|--------|---------|
| `DSH_TUI_ASTRA_EFFECT` | `auto`, `on`, `off` | `auto` |

- `auto` — on for dark TTY terminals; off for light themes / non-TTY
- `on` — force enable
- `off` — force disable

---

## Visual states

| Agent state | Starfield |
|-------------|-----------|
| **idle** | Sparse stars, independent twinkle |
| **thinking** | Stars converge toward centre |
| **working** | Horizontal drift / flow |
| **completed** | Brief brightness burst → decay |
| **interrupted / error** | Dim to 25% |

---

## Architecture

```
dsh-TUI
  ↓ ctx.tuiStatus.registerView()
dsh-astra
  ├── starfield.ts    — star generation + twinkle (pure, deterministic)
  ├── states.ts       — session events → AgentState
  ├── renderer.ts     — Ink/React starfield component
  ├── compat.ts       — terminal capability detection + degradation
  ├── commands.ts     — /astra slash commands
  └── settings.ts     — /settings integration
```

The plugin uses `ctx.tuiStatus.registerView()` (stable candidate seam, no host changes).

---

## Terminal support

| Terminal | Colour | Detail |
|----------|--------|--------|
| iTerm2, Kitty, WezTerm, Ghostty, Warp | 16M TrueColor | Full sparkle glyphs ✦ ⋆ ✧ |
| xterm-256color, tmux, screen | 256-colour | Greyscale dots, 4fps cap in multiplexers |
| xterm, linux console | 16-colour | Bold / normal / faint |
| Non-TTY / light theme | — | Auto-disabled |

---

## Install from npm

```sh
npm install -g dsh-astra
```

Then add to your dsh-TUI profile:

```sh
dsh plugin --profile dsh-tui add dsh-astra
```

---

## Development

```sh
git clone https://github.com/lql341/dsh-astra.git
cd dsh-astra
pnpm install
pnpm build
pnpm test
```

---

## License

MIT — see [LICENSE](LICENSE).
