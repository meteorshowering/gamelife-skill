import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / "assets" / "gamelife.css").read_text(encoding="utf-8")


class TodayFirstLayoutTests(unittest.TestCase):
    def test_narrow_panel_has_two_by_two_daily_recommendations(self):
        self.assertIn("@media (min-width: 390px) and (max-width: 760px)", CSS)
        self.assertIn(".recommendation-grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));", CSS)
        self.assertIn("min-height: 108px", CSS)


if __name__ == "__main__":
    unittest.main()
