---
name: gamelife
description: "管理 GameLife 任务：整理当前对话中的工作内容、拆解大任务、维护可交互 HTML 任务面板，并生成当天四条行动推荐。"
---

# GameLife

Use this skill when the user wants to turn work or life actions into a GameLife task, inspect or update the task panel, break a large task into executable subtasks, or decide what four actions to focus on today.

## Scope for version 0.1

This skill is the `gamelife-skill` package's first core release. Keep the work centered on:

1. A complete task panel: show all tasks, search/filter them, inspect details and subtasks, create/edit/complete/archive/delete tasks, and preserve the Adventure Log visual language.
2. New-task decomposition: convert a large or multi-step task into an editable preview of a parent task and executable subtasks; only persist after the user confirms.
3. Four daily recommendations: on the first GameLife run for a calendar date, choose four focus actions from unfinished tasks, explain the reasons, and avoid duplicating that day's set.

Do not expand version 0.1 into habits, achievements, levels, maps, social features, cloud sync, or an independent backend unless a current task cannot work without a compatibility field.

## Operating workflow

1. Read the relevant local state and the current conversation context before making a change. When the user asks about another conversation, treat “other conversations” as Codex or ChatGPT conversations only.
2. Classify the request as capture/update, decompose, recommend, query, or panel edit. Use the narrowest mode that satisfies the request.
3. Produce a structured change preview before mutating task state. Separate user-stated facts, inferences, and suggestions; keep evidence/source text when available.
4. Ask for confirmation when creating a task from an ambiguous input, persisting a decomposition, changing several tasks, deleting/archiving, or replacing a daily recommendation.
5. Apply confirmed changes through the state contract in `references/data-schema.md`, then update the HTML workbench or generate a fresh copy from `assets/gamelife.html`.
6. Report what changed, what remains uncertain, and where the HTML artifact was written. Never claim to have read an inaccessible historical conversation.

## Conversation access boundary

Version 0.1 does not accept exported or uploaded Codex/ChatGPT conversations, and it must not pretend to retrieve history that the current environment does not expose. Use only the current conversation and explicitly available context. If a requested historical conversation is unavailable, say so and continue with the information that is available.

## Task decomposition rules

- A task that is already one clear action should remain a task; do not split it merely to create more rows.
- For a complex task, propose a small sequence of concrete subtasks with order, dependency, and estimated minutes when supported by the input.
- Mark missing due dates, scope, completion criteria, or technical choices as `needs_confirmation`; do not invent them.
- Let the user edit, reorder, merge, or remove proposed subtasks before confirmation.
- A completed parent or subtask must reflect evidence from the user or an explicit UI action, not an Agent guess.

## Daily recommendation rules

- Use the local calendar date as the idempotency key; opening the workbench repeatedly must not append another set for the same date.
- Prefer unfinished tasks with high urgency/importance, approaching deadlines, ready-to-start work, unblocker value, and a realistic daily workload.
- Return exactly four recommendation slots. If fewer than four existing tasks are suitable, leave slots as `待补充` or offer clearly marked “建议新建” candidates that require confirmation; never fabricate existing tasks.
- Store each recommendation's task id (when applicable), reason, order, date, and generated timestamp.

## HTML workbench contract

The HTML is a real user interface, not a screenshot. Preserve the existing GameLife visual direction: light blue background, dark navy-to-teal hero gradient, gold progress accent, rounded translucent cards, Adventure Log/task language, and responsive layout.

The desktop layout is the primary `0.1` acceptance target. Keep the same HTML responsive so it remains usable on mobile; if a conflict appears, preserve task operations and readable mobile cards before decorative fidelity.

Read `references/ui-contract.md` before changing the HTML and `references/data-schema.md` before changing stored fields. Use the deterministic helpers in `scripts/` for state validation and daily selection when available.

## Safety and truthfulness

- Never silently overwrite the whole task state.
- Never report an action as complete until it is represented in the state and the generated HTML.
- Preserve stable ids and `schema_version` when updating existing data.
- Treat AI output as a proposal until the user confirms it.
