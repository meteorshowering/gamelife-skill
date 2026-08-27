# gamelife-skill

`gamelife-skill` 是一个对话驱动的 GameLife Skill / Codex 插件包。它把用户在当前对话中表达的工作内容，整理成可执行任务，并配合一个可直接打开的 HTML 任务工作台。

当前版本：`0.0.2`（任务状态模型精简版本）

## 0.0.2 的核心能力

- 任务面板：展示全部任务，按主线/支线、状态和关键词查看，编辑、完成、删除任务，并查看子任务状态。
- 任务拆解：用户输入一个复杂目标，Agent 先给出主任务和可执行子任务的预览，用户确认后再保存。
- 每日四项行动：每天首次调用 Skill 或打开工作台时，按优先级、截止时间、开始条件和解阻塞价值生成四个推荐位，重复打开不会追加重复推荐。
- HTML 双端目标：同一份 HTML 使用响应式布局，电脑端是 `0.0.2` 的主要验收端，手机浏览器同步适配。

## 使用方式

显式调用：

```text
$gamelife
```

例如：

```text
$gamelife 我今天要把毕业论文的实验部分推进起来，帮我拆成今天能开始的任务。
```

Skill 会先展示拟写入的任务变化；复杂任务的拆解需要用户确认后才落库。它不会把推断出来的时间、指标或完成结果当作事实。

## HTML 工作台

直接打开 `assets/gamelife.html` 可以查看和操作示例工作台。需要把某份已确认状态渲染成用户工作台时，执行：

```powershell
python skills\gamelife\scripts\render_workbench.py --output-dir <目标目录> --state <状态文件>
```

工作台提供：

- 简洁任务工作台的任务总览、状态统计和筛选。
- 今日四项行动推荐。
- 新建任务、编辑任务、完成任务、删除任务。
- 大任务的本地拆解预览和子任务编辑。
- 浏览器本地保存；不依赖后端或第三方服务。

HTML 是交互呈现层，状态字段和 Agent 使用的结构化约定见：

- `skills/gamelife/references/data-schema.md`
- `skills/gamelife/references/ui-contract.md`
- `skills/gamelife/references/rendering.md`

## 历史对话边界

用户所说的其他对话可以指 Codex 或 ChatGPT 对话，但 `0.0.2` 不接受对话导出或上传，也不假设 Skill 可以无条件搜索全部历史对话。只有当运行环境明确提供某个历史对话的上下文时，Agent 才能使用它；否则必须说明无法读取，不能伪装成已经读取。

## 本地校验

在仓库根目录执行：

```powershell
python skills\gamelife\scripts\validate_state.py tests\fixtures\state.json
python skills\gamelife\scripts\generate_daily_recommendations.py --state tests\fixtures\state.json --date 2026-08-27
python -m unittest discover -s tests -p "test_*.py"
```

正式发布前还需要使用目标 Codex 环境的 Skill 校验器检查 frontmatter、`agents/openai.yaml`、插件清单和资源引用。

## 版本管理

- `0.1.0`：任务面板、任务拆解、每日四项行动推荐的首个核心基线。
- `0.1.1`：增加从状态文件渲染可交付 HTML 工作台的能力，并修复资源路径问题。
- `0.0.x`：修复、兼容性、样式和文案调整，不改变核心数据契约。
- `0.2.0`：再考虑历史对话连接器、复盘、批量操作和更多 GameLife 模块。
- 每次发布同步更新 `.codex-plugin/plugin.json`、`CHANGELOG.md`、Skill 说明、测试和 `schema_version` 迁移说明。

详细范围见 `PLAN.md`，变更记录见 `CHANGELOG.md`。
