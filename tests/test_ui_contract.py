import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "assets" / "gamelife.html").read_text(encoding="utf-8")
CSS = (ROOT / "assets" / "gamelife.css").read_text(encoding="utf-8")


class UserFacingUiTests(unittest.TestCase):
    def test_final_page_uses_compact_summary_instead_of_marketing_hero(self):
        self.assertIn('class="summary-strip page-section"', HTML)
        self.assertNotIn('class="hero-section page-section"', HTML)
        self.assertNotIn("对话整理", HTML)
        self.assertNotIn("任务拆解", HTML)
        self.assertIn('id="completed-count"', HTML)
        self.assertIn('id="active-count"', HTML)
        self.assertNotIn('overall-progress', HTML)
        self.assertNotIn('task-progress', HTML)

    def test_styles_have_separate_narrow_panel_density_mode(self):
        self.assertIn("@media (min-width: 1100px)", CSS)
        self.assertIn("@media (min-width: 641px) and (max-width: 1099px)", CSS)
        self.assertIn(".summary-strip", CSS)


if __name__ == "__main__":
    unittest.main()
