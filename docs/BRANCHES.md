# Branch convergence

The former `dev` direction has been integrated into the `main` working tree.

The merged implementation keeps current behaviour on dsh-TUI `0.10.1`:

- `registerAmbient` is used only when a compatible host explicitly exposes it;
- otherwise the plugin falls back to `registerView({ maxRows: 3 })`;
- `layout=compact` always selects the bounded surface;
- `layout=auto` and `layout=full` safely degrade to the bounded surface;
- teardown disposes whichever surface was registered.

The remote `dev` branch should be treated as historical after the merged change is
committed and verified. The remaining adaptive-rendering work is tracked in
[ROADMAP.md](ROADMAP.md).
