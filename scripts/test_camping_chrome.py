"""Run with: python3 -m unittest discover -s scripts -p 'test_camping_chrome.py'."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('camping_integration', ROOT / 'scripts/integrate-camping-studio.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
CHROME = (ROOT / 'assets/js/camping-site-chrome.js').read_text(encoding='utf-8')

class CampingChromeTests(unittest.TestCase):
    def source(self):
        return '<html><head><title>Preview</title><meta name="robots" content="noindex"></head><body><header class="site-header"></header><section id="hiace-atelier"></section><footer class="site-footer"></footer>' + ''.join('<script id="'+key+'">const '+key.replace('-', '_')+'=1;</script>' for key in ['hiace-launch','hiace-model','hiace-worker','hiace-app']) + '</body></html>'

    def test_preserves_all_hiace_scripts(self):
        original = self.source()
        merged = module.integrate(original, CHROME)
        self.assertEqual(module.scripts(original), module.scripts(merged))
        self.assertIn('id="camping-site-chrome"', merged)
        self.assertNotIn('content="noindex"', merged)

    def test_rejects_double_integration(self):
        merged = module.integrate(self.source(), CHROME)
        with self.assertRaises(ValueError):
            module.integrate(merged, CHROME)

    def test_rejects_wrong_input(self):
        with self.assertRaises(ValueError):
            module.integrate('<html><body>Not a studio</body></html>', CHROME)

    def test_all_original_chapters_and_pages(self):
        for section in ['why','layouts','base-car','foundation','interior','galley','electrical','ff-heater','roof-ac','registration','costs']:
            self.assertIn('href="#'+section+'"', CHROME)
        for page in ['index.html','camping.html','drive-routes/','apps.html','maintenance.html']:
            self.assertIn('href="'+page+'"', CHROME)
        for marker in ['mobile-toggle','mobile-menu','scrollToTop','すべての挑戦者へ。','×AI ADVENTURE']:
            self.assertIn(marker, CHROME)

if __name__ == '__main__':
    unittest.main()
