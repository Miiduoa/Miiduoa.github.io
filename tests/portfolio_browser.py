"""Browser regression checks for the portfolio landing page.

Run with Python 3.11+ and playwright==1.57.0 after installing Chromium.
Screenshots are captured from the served page, with source images loaded.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'test-results'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    OUTPUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    results = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context(reduced_motion='reduce')
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            for width in (320, 360, 390, 768, 1024, 1440):
                page.set_viewport_size({'width': width, 'height': 1000})
                response = page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='networkidle')
                assert response and response.ok, 'Landing page did not load'
                page.evaluate("document.querySelectorAll('main img[src]').forEach(img => img.loading = 'eager')")
                page.wait_for_function("[...document.querySelectorAll('main img[src]')].every(img => img.complete && img.naturalWidth > 0)", timeout=45000)
                assert page.locator('h1').count() == 1
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Overflow at {width}px'
                assert page.evaluate("[...document.querySelectorAll('a[href^=\"#\"]')].every(a => document.getElementById(a.hash.slice(1)))"), 'Broken in-page navigation'
                gallery = page.locator('a[data-preview]')
                gallery.first.click()
                assert page.locator('dialog').evaluate('(el) => el.open')
                page.wait_for_function('document.querySelector("#preview-image").naturalWidth > 0')
                assert page.locator('#preview-count').inner_text() == '1 / 2'
                page.keyboard.press('ArrowRight')
                assert page.locator('#preview-count').inner_text() == '2 / 2'
                page.locator('#preview-prev').click()
                assert page.locator('#preview-count').inner_text() == '1 / 2'
                for _ in range(6):
                    page.keyboard.press('Tab')
                    assert page.locator('dialog').evaluate('(el) => el.contains(document.activeElement)'), 'Focus escaped modal'
                page.keyboard.press('Escape')
                assert not page.locator('dialog').evaluate('(el) => el.open')
                assert gallery.first.evaluate('(el) => document.activeElement === el'), 'Focus did not return to image link'
                summary = page.locator('.more-tools summary')
                summary.focus()
                page.keyboard.press('Enter')
                assert page.locator('.more-tools').get_attribute('open') is not None
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Expanded tools overflow'
                page.keyboard.press('Enter')
                page.evaluate('document.activeElement.blur(); window.scrollTo(0,0)')
                if width in (390, 1440):
                    page.screenshot(path=str(OUTPUT / f'portfolio-{width}.png'), full_page=True)
                results.append({'width': width, 'images_loaded': True, 'overflow': False, 'keyboard_and_gallery': 'passed'})
            assert not errors, errors
            plain = browser.new_context(java_script_enabled=False, viewport={'width':390,'height':844})
            no_js = plain.new_page()
            no_js.goto(f'http://127.0.0.1:{server.server_port}/')
            assert no_js.locator('a[data-preview]').first.get_attribute('href').startswith('https://raw.githubusercontent.com/')
            no_js.locator('.more-tools summary').click()
            assert no_js.locator('.more-tools').get_attribute('open') is not None
            browser.close()
    finally:
        server.shutdown()
        (OUTPUT / 'browser-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print(json.dumps({'viewports': results, 'without_javascript': 'passed'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
