#!/usr/bin/env python3
"""Provide a small deterministic decomposition fallback for a complex task."""

from __future__ import annotations

import argparse
import json
import re
from typing import Any


def decompose(title: str, description: str = "", task_type: str = "other") -> list[dict[str, Any]]:
    text = f"{title} {description}".lower()
    if any(word in text for word in ("复习", "学习", "课程", "考试", "论文")) or task_type == "study":
        steps = [
            ("整理材料并明确完成标准", "收集需要用到的笔记、资料或题目，写下本次行动的完成标准。", 20),
            ("完成核心学习或练习", "集中处理最关键的一小段内容，不把所有后续工作混在一起。", 40),
            ("检查结果并记录薄弱点", "快速检查输出，记录还不清楚的地方和下一步行动。", 15),
        ]
    elif any(word in text for word in ("开发", "项目", "网站", "代码", "功能")) or task_type == "work":
        steps = [
            ("确认需求和验收标准", "把要解决的问题、边界和完成条件写清楚。", 20),
            ("实现最小可用部分", "先完成能够验证方向的核心实现，不同时扩展无关功能。", 45),
            ("验证并记录待办", "运行检查或手动验证，把问题和下一步记录下来。", 20),
        ]
    elif any(word in text for word in ("写", "文章", "报告", "内容", "创作")) or task_type == "creative":
        steps = [
            ("确定主题和结构", "明确受众、核心观点和内容结构。", 20),
            ("完成第一版草稿", "先形成完整草稿，不在第一遍追求最终表达。", 45),
            ("检查并整理输出", "检查逻辑、格式和遗漏，形成下一步修改清单。", 20),
        ]
    elif any(word in text for word in ("运动", "锻炼", "健康", "散步")) or task_type == "health":
        steps = [
            ("准备行动环境", "准备所需物品并确定可执行的时间和地点。", 10),
            ("完成主要行动", "按当前状态完成一段适度、可持续的训练或活动。", 30),
            ("记录感受和结果", "记录完成情况与身体感受，决定是否需要调整下一次计划。", 10),
        ]
    else:
        steps = [
            ("明确完成标准", "写下这项任务做到什么程度可以算完成。", 15),
            ("完成核心行动", "处理最直接、最能推动任务前进的一步。", 30),
            ("检查结果并安排下一步", "确认结果，记录剩余问题或后续行动。", 15),
        ]

    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or "task"
    return [
        {
            "id": f"subtask-draft-{slug}-{index}",
            "title": step_title,
            "description": step_description,
            "estimated_minutes": minutes,
            "order": index,
            "status": "todo",
            "needs_confirmation": True,
        }
        for index, (step_title, step_description, minutes) in enumerate(steps, start=1)
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("title")
    parser.add_argument("--description", default="")
    parser.add_argument("--type", default="other")
    args = parser.parse_args()
    print(json.dumps(decompose(args.title, args.description, args.type), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
