import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from skills.gamelife.scripts.render_workbench import render


FIXTURE = ROOT / "tests" / "fixtures" / "state.json"


class RenderingTests(unittest.TestCase):
    def test_render_copies_assets_and_seeds_state(self):
        with tempfile.TemporaryDirectory() as directory:
            html_path = render(directory, FIXTURE)
            output = Path(directory)
            self.assertEqual(html_path, output / "gamelife.html")
            self.assertTrue((output / "gamelife.css").exists())
            self.assertTrue((output / "gamelife.js").exists())
            bootstrap = (output / "gamelife-bootstrap.js").read_text(encoding="utf-8")
            self.assertIn("task-course-review", bootstrap)
            html = html_path.read_text(encoding="utf-8")
            self.assertIn("gamelife-bootstrap.js", html)
            self.assertIn("gamelife.js", html)


if __name__ == "__main__":
    unittest.main()
