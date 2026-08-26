#!/usr/bin/env python3
"""Validate a GameLife 0.1 JSON state file without third-party dependencies."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


TOP_LEVEL_FIELDS = {
    "schema_version",
    "version",
    "updated_at",
    "profile",
    "chapters",
    "tasks",
    "daily_recommendations",
    "sources",
    "settings",
}
TASK_STATUSES = {"todo", "in_progress", "completed", "cancelled", "archived"}
SUBTASK_STATUSES = {"todo", "completed", "cancelled"}
PRIORITIES = {"low", "medium", "high", "urgent"}
CHAPTER_TYPES = {"main", "side"}
CHAPTER_STATUSES = {"active", "paused", "completed", "archived"}


class ValidationError(ValueError):
    """Raised when a state file violates the GameLife contract."""


def _require_string(obj: dict[str, Any], key: str, path: str, errors: list[str]) -> None:
    if not isinstance(obj.get(key), str) or not obj[key].strip():
        errors.append(f"{path}.{key} must be a non-empty string")


def _check_progress(value: Any, path: str, errors: list[str]) -> None:
    if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= 100:
        errors.append(f"{path} must be an integer from 0 to 100")


def validate_state(state: Any) -> bool:
    """Return True or raise ValidationError with all detected problems."""

    errors: list[str] = []
    if not isinstance(state, dict):
        raise ValidationError("state must be a JSON object")

    for field in ("schema_version", "version", "updated_at"):
        _require_string(state, field, "state", errors)
    for field in ("chapters", "tasks", "sources"):
        if not isinstance(state.get(field), list):
            errors.append(f"state.{field} must be an array")
    if not isinstance(state.get("daily_recommendations"), dict):
        errors.append("state.daily_recommendations must be an object")
    if not isinstance(state.get("profile"), dict):
        errors.append("state.profile must be an object")
    if not isinstance(state.get("settings"), dict):
        errors.append("state.settings must be an object")

    if errors:
        raise ValidationError("\n".join(errors))

    chapters = state["chapters"]
    tasks = state["tasks"]
    chapter_ids: set[str] = set()
    task_ids: set[str] = set()

    for index, chapter in enumerate(chapters):
        path = f"state.chapters[{index}]"
        if not isinstance(chapter, dict):
            errors.append(f"{path} must be an object")
            continue
        _require_string(chapter, "id", path, errors)
        _require_string(chapter, "title", path, errors)
        chapter_id = chapter.get("id")
        if isinstance(chapter_id, str):
            if chapter_id in chapter_ids:
                errors.append(f"duplicate chapter id: {chapter_id}")
            chapter_ids.add(chapter_id)
        if chapter.get("type") not in CHAPTER_TYPES:
            errors.append(f"{path}.type must be one of {sorted(CHAPTER_TYPES)}")
        if chapter.get("status") not in CHAPTER_STATUSES:
            errors.append(f"{path}.status must be one of {sorted(CHAPTER_STATUSES)}")
        _check_progress(chapter.get("progress"), f"{path}.progress", errors)

    for index, task in enumerate(tasks):
        path = f"state.tasks[{index}]"
        if not isinstance(task, dict):
            errors.append(f"{path} must be an object")
            continue
        for field in ("id", "title", "description", "type", "status", "priority"):
            _require_string(task, field, path, errors)
        task_id = task.get("id")
        if isinstance(task_id, str):
            if task_id in task_ids:
                errors.append(f"duplicate task id: {task_id}")
            task_ids.add(task_id)
        if task.get("chapter_id") not in chapter_ids:
            errors.append(f"{path}.chapter_id references an unknown chapter")
        if task.get("status") not in TASK_STATUSES:
            errors.append(f"{path}.status must be one of {sorted(TASK_STATUSES)}")
        if task.get("priority") not in PRIORITIES:
            errors.append(f"{path}.priority must be one of {sorted(PRIORITIES)}")
        _check_progress(task.get("progress"), f"{path}.progress", errors)
        if task.get("status") == "completed" and task.get("progress") != 100:
            errors.append(f"{path} completed tasks must have progress 100")
        if not isinstance(task.get("subtasks", []), list):
            errors.append(f"{path}.subtasks must be an array")
            continue
        subtask_ids: set[str] = set()
        for sub_index, subtask in enumerate(task.get("subtasks", [])):
            sub_path = f"{path}.subtasks[{sub_index}]"
            if not isinstance(subtask, dict):
                errors.append(f"{sub_path} must be an object")
                continue
            for field in ("id", "task_id", "title", "description", "status"):
                _require_string(subtask, field, sub_path, errors)
            if subtask.get("task_id") != task.get("id"):
                errors.append(f"{sub_path}.task_id does not match parent task")
            sub_id = subtask.get("id")
            if isinstance(sub_id, str):
                if sub_id in subtask_ids:
                    errors.append(f"duplicate subtask id in {task.get('id')}: {sub_id}")
                subtask_ids.add(sub_id)
            if subtask.get("status") not in SUBTASK_STATUSES:
                errors.append(f"{sub_path}.status must be one of {sorted(SUBTASK_STATUSES)}")
            minutes = subtask.get("estimated_minutes", 0)
            if not isinstance(minutes, int) or isinstance(minutes, bool) or minutes < 0:
                errors.append(f"{sub_path}.estimated_minutes must be a non-negative integer")

    for date_key, recommendation in state["daily_recommendations"].items():
        path = f"state.daily_recommendations[{date_key!r}]"
        if not isinstance(recommendation, dict):
            errors.append(f"{path} must be an object")
            continue
        if recommendation.get("date") != date_key:
            errors.append(f"{path}.date must match its key")
        items = recommendation.get("items")
        if not isinstance(items, list) or len(items) != 4:
            errors.append(f"{path}.items must contain exactly four recommendation slots")
            continue
        seen_ranks: set[int] = set()
        for item_index, item in enumerate(items):
            item_path = f"{path}.items[{item_index}]"
            if not isinstance(item, dict):
                errors.append(f"{item_path} must be an object")
                continue
            rank = item.get("rank")
            if rank not in (1, 2, 3, 4) or rank in seen_ranks:
                errors.append(f"{item_path}.rank must be a unique integer from 1 to 4")
            else:
                seen_ranks.add(rank)
            task_id = item.get("task_id")
            if task_id is not None and task_id not in task_ids:
                errors.append(f"{item_path}.task_id references an unknown task")

    if errors:
        raise ValidationError("\n".join(errors))
    return True


def load_state(path: str | Path) -> dict[str, Any]:
    file_path = Path(path)
    try:
        state = json.loads(file_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValidationError(f"state file not found: {file_path}") from exc
    except json.JSONDecodeError as exc:
        raise ValidationError(f"invalid JSON at line {exc.lineno}, column {exc.colno}: {exc.msg}") from exc
    validate_state(state)
    return state


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("state", help="Path to a GameLife JSON state file")
    args = parser.parse_args()
    try:
        load_state(args.state)
    except ValidationError as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1
    print(f"[OK] valid GameLife state: {args.state}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
