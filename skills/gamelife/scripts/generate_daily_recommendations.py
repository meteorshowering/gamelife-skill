#!/usr/bin/env python3
"""Generate an idempotent four-slot daily recommendation set."""

from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

try:
    from .validate_state import load_state
except ImportError:  # Running the file directly from scripts/.
    from validate_state import load_state


PRIORITY_SCORE = {"urgent": 40, "high": 30, "medium": 20, "low": 10}
ACTIVE_STATUSES = {"todo", "in_progress"}


def today_key() -> str:
    return date.today().isoformat()


def _due_score(task: dict[str, Any], day: date) -> tuple[int, str | None]:
    raw = task.get("due_date") or ""
    if not raw:
        return 0, None
    try:
        due = date.fromisoformat(raw[:10])
    except ValueError:
        return 0, None
    delta = (due - day).days
    if delta <= 0:
        return 34, "截止日期临近或已经到期"
    if delta <= 2:
        return 27, "截止日期很近"
    if delta <= 7:
        return 16, "本周需要推进"
    return 5, "有明确的后续截止日期"


def score_task(task: dict[str, Any], chapters: dict[str, dict[str, Any]], day: date) -> tuple[int, str]:
    score = PRIORITY_SCORE.get(task.get("priority"), 0)
    reasons: list[str] = []
    if task.get("priority") in {"urgent", "high"}:
        reasons.append("优先级较高")
    due_score, due_reason = _due_score(task, day)
    score += due_score
    if due_reason:
        reasons.append(due_reason)
    if task.get("status") == "in_progress":
        score += 12
        reasons.append("已经开始，适合保持推进")
    chapter = chapters.get(task.get("chapter_id"), {})
    if chapter.get("type") == "main":
        score += 6
        reasons.append("属于主线冒险")
    if not reasons:
        reasons.append("从未完成任务中选择一个适合今天开始的行动")
    return score, "；".join(reasons)


def generate(state: dict[str, Any], day_key: str, force: bool = False) -> dict[str, Any]:
    existing = state.get("daily_recommendations", {}).get(day_key)
    if existing and not force:
        return existing

    day = date.fromisoformat(day_key)
    chapters = {chapter["id"]: chapter for chapter in state.get("chapters", [])}
    candidates = [
        task for task in state.get("tasks", [])
        if task.get("status") in ACTIVE_STATUSES
    ]
    ranked = sorted(
        candidates,
        key=lambda task: (
            score_task(task, chapters, day)[0],
            task.get("updated_at", ""),
            task.get("id", ""),
        ),
        reverse=True,
    )

    items: list[dict[str, Any]] = []
    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    for rank in range(1, 5):
        task = ranked[rank - 1] if rank <= len(ranked) else None
        if task:
            _, reason = score_task(task, chapters, day)
            items.append({
                "id": f"recommendation-{day_key}-{rank}",
                "task_id": task["id"],
                "rank": rank,
                "title_snapshot": task["title"],
                "reason": reason,
                "status": "suggested",
            })
        else:
            items.append({
                "id": f"recommendation-{day_key}-{rank}",
                "task_id": None,
                "rank": rank,
                "title_snapshot": "待补充",
                "reason": "当前可选任务不足四项；需要用户确认后再创建新行动",
                "status": "placeholder",
            })
    return {"date": day_key, "generated_at": generated_at, "items": items}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", required=True, help="Path to a GameLife JSON state file")
    parser.add_argument("--date", default=today_key(), help="Date in YYYY-MM-DD format")
    parser.add_argument("--force", action="store_true", help="Replace an existing set for the date")
    parser.add_argument("--write", action="store_true", help="Write the generated set back to the state file")
    args = parser.parse_args()

    state_path = Path(args.state)
    state = load_state(state_path)
    recommendation = generate(state, args.date, force=args.force)
    if args.write:
        state.setdefault("daily_recommendations", {})[args.date] = recommendation
        state["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"[OK] wrote four recommendations for {args.date} to {state_path}")
    else:
        print(json.dumps(recommendation, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
