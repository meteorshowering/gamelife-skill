# GameLife 0.1 数据契约

## 顶层结构

```json
{
  "schema_version": "1.0",
  "version": "0.1.0",
  "updated_at": "2026-08-27T00:00:00.000Z",
  "profile": {
    "nickname": "旅行者"
  },
  "chapters": [],
  "tasks": [],
  "daily_recommendations": {},
  "sources": [],
  "settings": {
    "daily_recommendation_count": 4
  }
}
```

字段命名在状态文件中统一使用 `snake_case`。HTML 内部可以使用 JavaScript 常用的 camelCase，但持久化前必须转换或保持本契约字段。

## 章节

```json
{
  "id": "chapter-main-study",
  "title": "大学学业",
  "description": "长期方向说明",
  "type": "main",
  "status": "active",
  "progress": 0,
  "order": 1
}
```

- `type`：`main` 或 `side`。
- `status`：`active`、`paused`、`completed`、`archived`。
- `progress`：0–100 的整数。

## 任务

```json
{
  "id": "task-example",
  "chapter_id": "chapter-main-study",
  "title": "完成本周课程复盘",
  "description": "整理笔记并记录未掌握的知识点",
  "type": "study",
  "status": "in_progress",
  "priority": "high",
  "progress": 35,
  "due_date": "",
  "subtasks": [],
  "ai_generated": false,
  "ai_reason": "",
  "created_at": "2026-08-27T00:00:00.000Z",
  "updated_at": "2026-08-27T00:00:00.000Z",
  "completed_at": ""
}
```

- `type`：`study`、`work`、`health`、`creative`、`life`、`review`、`other`。
- `status`：`todo`、`in_progress`、`completed`、`cancelled`、`archived`。
- `priority`：`low`、`medium`、`high`、`urgent`。
- `progress`：0–100 的整数；完成任务必须为 100。
- `subtasks` 可以为空数组，也可以包含子任务对象。

## 子任务

```json
{
  "id": "subtask-example",
  "task_id": "task-example",
  "title": "整理课堂笔记",
  "description": "把散落笔记合并到一个文档",
  "status": "todo",
  "order": 1,
  "estimated_minutes": 30,
  "needs_confirmation": false,
  "created_at": "2026-08-27T00:00:00.000Z",
  "updated_at": "2026-08-27T00:00:00.000Z",
  "completed_at": ""
}
```

- `status`：`todo`、`completed`、`cancelled`。
- `estimated_minutes` 没有可靠依据时使用 `0`，不要伪造精确时间。
- `needs_confirmation` 为 `true` 时，必须在用户确认后才写入正式状态。

## 每日推荐

`daily_recommendations` 是以 `YYYY-MM-DD` 为键的对象：

```json
{
  "2026-08-27": {
    "date": "2026-08-27",
    "generated_at": "2026-08-27T00:00:00.000Z",
    "items": [
      {
        "id": "recommendation-2026-08-27-1",
        "task_id": "task-example",
        "rank": 1,
        "title_snapshot": "完成本周课程复盘",
        "reason": "优先处理高优先级且已开始的任务",
        "status": "suggested"
      }
    ]
  }
}
```

每日 `items` 应有四个位置。任务不足时，`task_id` 可以为 `null`，标题使用“待补充”或“建议新建：……”，并明确这是空位/建议，不是既有事实。

- `status`：`suggested`、`accepted`、`skipped`、`completed`、`placeholder`。
- 生成当天已有记录时，默认复用，不追加第二组。
- 用户明确要求重新安排时，先确认，再替换当天记录，并保留替换原因。

## 来源与事实边界

每个由 Agent 识别出的任务或子任务尽量关联一个 `sources` 条目：

```json
{
  "id": "source-1",
  "kind": "current_conversation",
  "label": "当前对话",
  "quote": "用户原话的短摘录",
  "captured_at": "2026-08-27T00:00:00.000Z"
}
```

`0.1` 不接受其他 Codex/ChatGPT 对话的导出或上传；如果指定历史对话没有被运行环境提供，不创建虚假的来源记录。

## 迁移规则

- 新增字段应有默认值。
- 修改字段含义或删除字段时提升 `schema_version`。
- 旧版本数据不得被静默覆盖；迁移前保留原文件。
- 任务、子任务和推荐记录的 `id` 不因重绘 HTML 而改变。
