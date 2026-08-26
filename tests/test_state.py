import json
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from skills.gamelife.scripts.decompose_task import decompose
from skills.gamelife.scripts.generate_daily_recommendations import generate
from skills.gamelife.scripts.validate_state import ValidationError, load_state, validate_state


FIXTURE = ROOT / "tests" / "fixtures" / "state.json"


class StateContractTests(unittest.TestCase):
    def test_fixture_is_valid(self):
        state = load_state(FIXTURE)
        self.assertTrue(validate_state(state))

    def test_daily_recommendations_have_four_slots_and_are_idempotent(self):
        state = load_state(FIXTURE)
        first = generate(state, "2026-08-27")
        self.assertEqual(len(first["items"]), 4)
        self.assertEqual(first["items"][0]["task_id"], "task-course-review")

        state["daily_recommendations"]["2026-08-27"] = first
        second = generate(state, "2026-08-27")
        self.assertEqual(second, first)

    def test_decomposition_is_small_and_actionable(self):
        subtasks = decompose("开发一个任务面板", "需要支持筛选和完成任务", "work")
        self.assertGreaterEqual(len(subtasks), 2)
        self.assertLessEqual(len(subtasks), 5)
        self.assertTrue(all(item["title"] and item["estimated_minutes"] > 0 for item in subtasks))

    def test_invalid_completed_progress_is_rejected(self):
        state = load_state(FIXTURE)
        state["tasks"][0]["status"] = "completed"
        state["tasks"][0]["progress"] = 80
        with self.assertRaises(ValidationError):
            validate_state(state)


if __name__ == "__main__":
    unittest.main()
