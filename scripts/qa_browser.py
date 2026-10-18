#!/usr/bin/env python3
"""Optional real-browser QA. Requires Python Playwright; no application dependency.
Serve a fresh `npm run build` output, then:
  CHROMIUM_PATH=/path/to/chromium python3 scripts/qa_browser.py
Optional: JMD_QA_URL, JMD_QA_ARTIFACTS (outside the checkout), AXE_PATH.
WhatsApp clicks are intercepted locally; this suite never sends messages.
"""
import json
import os
import time
import unittest
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright

BASE = os.environ.get('JMD_QA_URL', 'http://127.0.0.1:8001').rstrip('/')
ARTIFACTS = Path(os.environ.get('JMD_QA_ARTIFACTS', '/tmp/jmd-browser-qa'))


class WebsiteQA(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ARTIFACTS.mkdir(parents=True, exist_ok=True)
        cls.runtime = sync_playwright().start()
        options = {'headless': True}
        if os.environ.get('CHROMIUM_PATH'):
            options['executable_path'] = os.environ['CHROMIUM_PATH']
        cls.browser = cls.runtime.chromium.launch(**options)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.runtime.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1366, 'height': 768}, reduced_motion='no-preference')
        self.errors = []
        self.page = self.context.new_page()
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.add_init_script("""window.__qaMessages=[];
          document.addEventListener('click',function(event){
            const link=event.target.closest('a');
            if(link && link.href.startsWith('https://wa.me/')) {
              event.preventDefault(); window.__qaMessages.push(link.href);
            }
          }, true);""")

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [], 'Uncaught JavaScript errors')

    def home(self):
        self.page.goto(BASE, wait_until='domcontentloaded')
        self.page.wait_for_function('window.__jmdMain === true')

    def message(self):
        url = self.page.evaluate('window.__qaMessages.at(-1)')
        self.assertIsNotNone(url)
        self.assertEqual(urlparse(url).netloc, 'wa.me')
        self.assertEqual(urlparse(url).path, '/34687111168')
        return parse_qs(urlparse(url).query)['text'][0]

    def test_01_viewports_and_motion(self):
        for width, height in [(1920, 1080), (1366, 768), (768, 1024), (390, 844)]:
            with self.subTest(width=width):
                self.page.set_viewport_size({'width': width, 'height': height})
                self.home()
                self.page.wait_for_timeout(2600)
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                self.assertEqual(self.page.locator('.hero__img').evaluate('(image)=>image.naturalWidth'), 1536)
                self.assertEqual(self.page.locator('.hero__scroll').count(), 0)
                self.assertGreater(self.page.evaluate('ScrollTrigger.getAll().length'), 0)
                self.assertEqual(self.page.evaluate("[...document.querySelectorAll('[data-reveal]')].filter(e=>getComputedStyle(e).opacity==='0').length"), 0)
                self.page.screenshot(path=str(ARTIFACTS / f'hero-{width}.png'))
                self.page.locator('#paqueteria').scroll_into_view_if_needed()
                self.page.wait_for_timeout(900)
                self.assertGreater(float(self.page.locator('#calc-form').evaluate('(e)=>getComputedStyle(e).opacity')), .99)
                self.page.screenshot(path=str(ARTIFACTS / f'parcel-{width}.png'))

    def test_02_preference_changes_and_cleanup(self):
        self.home()
        self.page.wait_for_timeout(2600)
        self.page.emulate_media(reduced_motion='reduce')
        self.page.wait_for_timeout(250)
        self.assertEqual(self.page.evaluate('ScrollTrigger.getAll().length'), 0)
        self.assertTrue(self.page.locator('[data-board-toggle]').is_disabled())
        self.assertEqual(self.page.locator('[data-plane]').evaluate('(e)=>e.style.transform'), '')
        self.assertEqual(self.page.evaluate("[...document.querySelectorAll('[data-reveal]')].filter(e=>getComputedStyle(e).opacity==='0').length"), 0)
        self.page.emulate_media(reduced_motion='no-preference')
        self.page.wait_for_timeout(2600)
        self.assertGreater(self.page.evaluate('ScrollTrigger.getAll().length'), 0)
        self.assertEqual(self.page.evaluate('gsap.globalTimeline.getChildren(true,true,false).filter(t=>t.isActive()).length'), 0)
        self.page.emulate_media(reduced_motion='reduce')
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function('window.__jmdMain')
        self.assertEqual(self.page.evaluate('ScrollTrigger.getAll().length'), 0)
        self.page.emulate_media(reduced_motion='no-preference')
        self.page.wait_for_timeout(200)
        self.assertGreater(self.page.evaluate('ScrollTrigger.getAll().length'), 0)

    def test_03_flight_validation_and_message(self):
        self.home()
        form = self.page.locator('#flight-form')
        form.locator('[type=submit]').click()
        self.assertEqual(self.page.locator('#f-dest').get_attribute('aria-invalid'), 'true')
        self.page.locator('#f-dest').select_option('lima')
        self.page.locator('#f-name').fill('Cliente de prueba')
        self.page.locator('#f-depart').fill('2000-01-01')
        self.page.locator('#f-return').fill((date.today() + timedelta(days=30)).isoformat())
        form.locator('[type=submit]').click()
        self.assertEqual(self.page.locator('#f-depart').get_attribute('aria-invalid'), 'true')
        self.page.locator('#f-depart').fill((date.today() + timedelta(days=10)).isoformat())
        self.page.locator('#f-adults').fill('0')
        form.locator('[type=submit]').click()
        self.assertEqual(self.page.locator('#f-adults').get_attribute('aria-invalid'), 'true')
        self.page.locator('#f-adults').fill('2')
        form.locator('[type=submit]').click()
        text = self.message()
        self.assertIn('Lima', text)
        self.assertIn('2 adultos', text)
        self.assertIn('2 maletas de 23 kg', text)
        self.assertIn('• Vuelta:', text)
        self.page.locator('input[value="solo ida"]').check()
        self.assertTrue(self.page.locator('[data-return]').is_hidden())
        self.page.locator('#f-dest').select_option('otro')
        self.page.locator('#f-dest-other').fill('Santiago, Chile')
        form.locator('[type=submit]').click()
        self.assertIn('Santiago, Chile', self.message())
        self.assertNotIn('• Vuelta:', self.message())
        self.page.locator('[data-quote="bogota"]').click()
        self.assertEqual(self.page.locator('#f-dest').input_value(), 'bogota')
        self.assertEqual(self.page.url.split('#')[0].rstrip('/'), BASE)

    def test_04_calculator_parcel_and_invalid_counts(self):
        self.home()
        self.page.locator('#c-l').fill('60')
        self.page.locator('#c-w').fill('40')
        self.page.locator('#c-h').fill('40')
        self.page.locator('#c-kg').fill('12')
        self.assertEqual(self.page.locator('[data-out="bill"]').inner_text(), '19,5')
        self.page.locator('[data-calc-use]').click()
        self.assertEqual(self.page.locator('#p-kg').input_value(), '19.5')
        self.page.locator('#p-name').fill('Remitente de prueba')
        self.page.locator('#p-district').select_option(label='Miraflores')
        self.page.locator('#p-content').fill('Libros y ropa')
        self.page.locator('#p-pcs').fill('0')
        self.page.locator('#parcel-form [type=submit]').click()
        self.assertEqual(self.page.locator('#p-pcs').get_attribute('aria-invalid'), 'true')
        self.page.locator('#p-pcs').fill('2')
        self.page.locator('#parcel-form [type=submit]').click()
        self.assertIn('19,5 kg', self.message())
        self.assertIn('Miraflores', self.message())
        self.assertIn('• Bultos: 2', self.message())
        self.page.locator('#c-l').fill('-1')
        self.assertTrue(self.page.locator('[data-calc-use]').is_disabled())
        self.assertEqual(self.page.locator('[data-out="bill"]').inner_text(), '—')

    def test_05_contact_and_privacy(self):
        self.home()
        self.page.locator('#k-name').fill('Cliente de prueba')
        self.page.locator('#k-phone').fill('+34 600 111 222')
        self.page.locator('#k-email').fill('incorrecto')
        self.page.locator('#k-msg').fill('Quiero consultar un vuelo a Lima.')
        self.page.locator('#contact-form [type=submit]').click()
        self.assertEqual(self.page.locator('#k-email').get_attribute('aria-invalid'), 'true')
        self.assertEqual(self.page.locator('#k-rgpd').get_attribute('aria-invalid'), 'true')
        self.page.locator('#k-email').fill('')
        self.page.locator('#k-rgpd').check()
        self.page.locator('#contact-form [type=submit]').click()
        self.assertIn('Quiero consultar un vuelo a Lima.', self.message())
        self.assertEqual(self.page.evaluate('localStorage.length'), 0)
        self.assertEqual(self.context.cookies(), [])

    def test_06_menu_keyboard_and_faq(self):
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.home()
        burger = self.page.locator('[data-burger]')
        burger.click()
        self.assertEqual(burger.get_attribute('aria-expanded'), 'true')
        self.assertTrue(self.page.locator('main').evaluate('(e)=>e.inert'))
        self.page.keyboard.press('Shift+Tab')
        self.assertEqual(self.page.evaluate('document.activeElement.hasAttribute("data-burger")'), True)
        self.page.keyboard.press('Escape')
        self.assertEqual(burger.get_attribute('aria-expanded'), 'false')
        self.assertFalse(self.page.locator('main').evaluate('(e)=>e.inert'))
        burger.click()
        self.page.set_viewport_size({'width': 1366, 'height': 768})
        self.assertEqual(burger.get_attribute('aria-expanded'), 'false')
        self.page.locator('.acc summary').nth(0).click()
        self.assertTrue(self.page.locator('.acc').nth(0).evaluate('(e)=>e.open'))
        self.page.locator('.acc summary').nth(1).click()
        self.page.wait_for_timeout(100)
        self.assertFalse(self.page.locator('.acc').nth(0).evaluate('(e)=>e.open'))
        self.assertTrue(self.page.locator('.acc').nth(1).evaluate('(e)=>e.open'))

    def test_07_vendor_failure_and_nojs_fallback(self):
        self.page.route('**/assets/vendor/**', lambda route: route.abort())
        self.home()
        self.assertEqual(self.page.locator('[data-requires-js]:disabled').count(), 0)
        self.assertTrue(self.page.locator('h1').is_visible())
        self.assertEqual(self.page.locator('[data-reveal]').evaluate_all('(es)=>es.filter(e=>getComputedStyle(e).opacity==="0").length'), 0)
        nojs = self.browser.new_context(java_script_enabled=False, viewport={'width': 390, 'height': 844})
        page = nojs.new_page()
        page.goto(BASE, wait_until='domcontentloaded')
        self.assertTrue(page.locator('nav[data-menu]').is_visible())
        self.assertTrue(page.locator('#flight-form button[type=submit]').is_disabled())
        self.assertGreater(page.locator('noscript a[href^="https://wa.me/"]').count(), 0)
        self.assertFalse(page.evaluate('document.documentElement.scrollWidth > innerWidth'))
        nojs.close()

    def test_08_all_pages_and_anchors(self):
        for path in ['/', '/404.html', '/aviso-legal.html', '/privacidad.html', '/cookies.html', '/condiciones.html']:
            with self.subTest(path=path):
                response = self.page.goto(BASE + path, wait_until='domcontentloaded')
                self.assertEqual(response.status, 200)
                self.page.wait_for_function('window.__jmdMain')
                self.assertEqual(self.page.locator('h1').count(), 1)
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                self.assertEqual(self.page.evaluate("[...document.querySelectorAll('a[href^=\"#\"]')].map(a=>a.hash.slice(1)).filter(id=>id&&!document.getElementById(id))"), [])

    @unittest.skipUnless(os.environ.get('AXE_PATH'), 'Optional axe-core script not supplied')
    def test_09_accessibility(self):
        self.home()
        self.page.wait_for_timeout(2600)
        # Exercise lazy-image failures and revealed content before checking contrast.
        self.page.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(image=>image.loading='eager')")
        self.page.wait_for_timeout(1200)
        self.page.add_script_tag(path=os.environ['AXE_PATH'])
        for width, height in [(1366, 768), (390, 844)]:
            with self.subTest(width=width):
                self.page.set_viewport_size({'width': width, 'height': height})
                self.page.wait_for_timeout(250)
                result = self.page.evaluate("axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                (ARTIFACTS / f'axe-{width}.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
                self.assertEqual([(v['id'], len(v['nodes'])) for v in result['violations']], [])


    def test_10_board_opt_in_and_reduce(self):
        self.home()
        self.page.locator('[data-board]').scroll_into_view_if_needed()
        toggle = self.page.locator('[data-board-toggle]')
        self.assertEqual(toggle.inner_text(), 'Animar destinos')
        before = self.page.locator('.board__cell--city').all_text_contents()
        toggle.click()
        self.assertEqual(toggle.get_attribute('aria-pressed'), 'true')
        self.page.wait_for_timeout(3800)
        after = self.page.locator('.board__cell--city').all_text_contents()
        self.assertNotEqual(before, after)
        self.page.emulate_media(reduced_motion='reduce')
        self.page.wait_for_timeout(3800)
        self.assertEqual(self.page.locator('.board__cell--city').all_text_contents(), after)
        self.assertTrue(toggle.is_disabled())

    def test_11_map_loads_only_on_request(self):
        self.page.route('https://www.google.com/**', lambda route: route.fulfill(status=200, content_type='text/html', body='<html lang="es"><title>Mapa de prueba</title><body>Simulación local del mapa</body></html>'))
        self.home()
        self.assertEqual(self.page.locator('[data-map] iframe').count(), 0)
        self.page.locator('[data-map-load]').click()
        frame = self.page.locator('[data-map] iframe')
        self.assertIn('www.google.com/maps?', frame.get_attribute('src'))
        self.assertIn('Alcalá', frame.get_attribute('title'))
        self.assertEqual(self.page.locator('.map__overlay').count(), 0)



    def test_12_delayed_main_restores_menu_enhancement(self):
        self.page.set_viewport_size({'width': 390, 'height': 844})
        def delayed_main(route):
            response = route.fetch()
            time.sleep(3.3)  # Past the head's 3s progressive-enhancement watchdog.
            route.fulfill(response=response)
        self.page.route('**/assets/js/main.js', delayed_main)
        self.home()
        self.assertTrue(self.page.evaluate('document.documentElement.classList.contains("js")'))
        self.assertTrue(self.page.locator('[data-burger]').is_visible())
        self.assertEqual(self.page.locator('[data-requires-js]:disabled').count(), 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
