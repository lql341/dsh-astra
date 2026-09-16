# dsh-astra 路线图

## 目标

让 Astra 成为一个与宿主 UI 解耦的终端视觉效果插件：同一份核心逻辑根据宿主提供的渲染能力，自适应使用满屏区域、若干状态栏行，或其他可用的 UI 容器。

“三行”只是当前 dsh-TUI 的一种宿主限制，不是 Astra 的固定设计。其他工具可能提供四行、五行、固定高度面板，甚至完整的可定位渲染区域；Astra 应该消费宿主声明的能力，而不是假设某个固定行数。

## 近期 TODO

- [x] 将 `dev` 的宿主能力探测与安全回退整合进 `main`。
- [x] 抽象布局策略：`auto`、`full`、`compact`。
- [ ] 将 `compact` 从固定三行改为宿主声明的 `maxRows` / `availableRows`。
- [ ] 支持任意有限高度：例如 1、3、4、5 行，而不是把三行写死。
- [x] 支持宿主声明完整 ambient/render region 时的满屏渲染（fork 已联调，上游尚未发布）。
- [ ] 在终端尺寸变化时重新计算布局，避免遮挡输入区和底部状态区。
- [x] 保留能力探测与安全降级：不支持 ambient 时自动回退到有限行数。
- [x] 将渲染面选择从星空状态、密度、强度和颜色逻辑中分离。
- [ ] 为 `auto`、有限行数和满屏区域补充快照/终端集成测试。

## 当前边界

截至 dsh-TUI 0.10.1，公开接口仅提供 `registerView`，单个视图高度为 1–3 行；
官方发布版尚未提供 `registerAmbient` 或任意 `availableRows`。fork 分支
[`feat/tui-ambient-surface`](https://github.com/lql341/dsh-TUI/tree/feat/tui-ambient-surface)
已通过完整 build 门禁和 dsh-astra 联调；上游接口提案见
[Discussion #905](https://github.com/ccch1mneyyy/dsh-TUI/discussions/905)。因此发布版目前的自适应体现为
“能力选择与安全回退”，实际输出仍是三行状态视图。

## 布局模型

优先级从高到低：

1. 宿主提供完整的 ambient/render region：使用该区域。
2. 宿主提供可用高度：根据 `availableRows` 渲染，保留输入区和宿主底栏。
3. 宿主只提供状态视图注册：使用宿主允许的最大行数。
4. 宿主没有可用扩展能力：禁用视觉效果并给出明确诊断信息。

建议的配置语义：

```text
layout=auto       # 默认，根据宿主能力选择
layout=full       # 请求完整区域；不可用时安全降级
layout=compact    # 使用宿主允许的有限高度
```

插件不应直接指定“三行”。宿主适配器可以声明类似以下能力：

```ts
type AstraRenderSurface =
  | { kind: 'ambient'; width: number; height: number }
  | { kind: 'status'; maxRows: number }
```

## 宿主适配计划

### dsh-TUI

- [x] 支持有限行数状态视图。
- [ ] 在 dsh-TUI 官方发布版提供 ambient 视图注册；fork 实现和插件侧能力探测已验证。
- [ ] 将 ambient 区域尺寸和终端变化暴露给插件。
- [x] 在配置中提供布局策略，并在无可用渲染面时记录降级原因。

### OpenCode

- [ ] 调研并实现 OpenCode TUI 插件适配器。
- [ ] 优先复用其公开的 TUI 插件接口，不依赖内部组件路径。
- [ ] 先支持有限高度面板，再评估完整区域渲染。

参考：[OpenCode Plugins](https://opencode.ai/v2/docs/cli/plugins)

### Claude Code

- [ ] 评估插件、hooks 和外部终端覆盖层三种方式。
- [ ] 如果宿主不开放嵌入式 TUI 区域，提供独立 overlay 模式。
- [ ] 明确区分“事件驱动状态同步”和“直接渲染到 Claude 输入界面”。

参考：[Claude Code Plugins](https://claude.com/blog/claude-code-plugins)

### Codex CLI

- [ ] 评估官方插件、配置、hooks 或 app-server 能力。
- [ ] 优先使用公开扩展接口；避免依赖 Codex 内部 TUI 实现细节。
- [ ] 若无嵌入式渲染接口，提供独立终端 pane/overlay 适配器。

参考：[Codex CLI 入门](https://help.openai.com/en/articles/11096431)

## 设计约束

- Astra 核心不应依赖 React、Ink 或某个具体宿主。
- 满屏不是默认假设，固定行数也不是默认假设；默认行为由能力探测决定。
- 任何宿主能力缺失都必须安全降级，不能导致宿主启动失败。
- 输入框区域不得被覆盖，除非宿主明确授予可渲染区域。
- 宿主适配器应保持薄层，动画、图案、颜色和状态逻辑尽量复用 `astra-core`。
