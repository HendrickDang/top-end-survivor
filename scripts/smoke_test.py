"""End-to-end smoke test: plays every micro-game in a real (headless) phone browser.

Usage:
    cd server && PORT=8099 npm start      # in one terminal
    python3 scripts/smoke_test.py http://localhost:8099 [screenshot_dir]

Requires: pip install playwright && playwright install chromium
"""
import sys, time, pathlib
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8099'
SHOTS = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None
if SHOTS: SHOTS.mkdir(parents=True, exist_ok=True)

GAMES = ['croc-edge', 'swim-sign', 'croc-camp', 'stinger-vinegar', 'stinger-suit',
         'cyclone-kit', 'flood-road', 'heat-drink', 'snake-bite', 'bushfire-leave',
         'lightning-pool', 'mozzie-dusk', 'sun-slip', 'boss-cyclone', 'boss-croc']

SVG_PT = """([x, y]) => { const svg = document.querySelector('#stage svg'); const p = svg.createSVGPoint();
  p.x = x; p.y = y; const r = p.matrixTransform(svg.getScreenCTM()); return [r.x, r.y]; }"""
CENTER = """(sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect();
  return [r.x + r.width / 2, r.y + r.height / 2]; }"""


def svg_point(page, x, y):
    return page.evaluate(SVG_PT, [x, y])


def drag(page, sel, to_svg):
    sx, sy = page.evaluate(CENTER, sel)
    tx, ty = svg_point(page, *to_svg)
    page.mouse.move(sx, sy); page.mouse.down()
    for i in range(1, 9):
        page.mouse.move(sx + (tx - sx) * i / 8, sy + (ty - sy) * i / 8)
    page.mouse.up()


def tap(page, x, y):
    page.mouse.click(x, y)


def win(page, gid):
    if gid == 'croc-edge':
        x, y = svg_point(page, 180, 300)
        for _ in range(9): tap(page, x, y); time.sleep(0.05)
    elif gid in ('swim-sign', 'flood-road', 'bushfire-leave'):
        page.click('.choice-ok')
    elif gid == 'croc-camp':
        drag(page, '[data-ok="true"]', (180, 80))
    elif gid == 'stinger-vinegar':
        drag(page, '[data-ok="true"]', (150, 185))
    elif gid == 'snake-bite':
        drag(page, '[data-ok="true"]', (190, 175))
    elif gid == 'stinger-suit':
        page.click('[data-ok="true"]')
    elif gid == 'cyclone-kit':
        for _ in range(3):
            page.locator('[data-ok="true"]').filter(has_not=page.locator('xx')).first.dispatch_event('pointerdown')
            page.evaluate("document.querySelector('[data-ok=\"true\"]').removeAttribute('data-ok')")
            time.sleep(0.05)
    elif gid in ('lightning-pool', 'sun-slip'):
        for _ in range(3):  # the game removes data-ok from each item once tapped
            page.locator('[data-ok="true"]').first.dispatch_event('pointerdown')
            time.sleep(0.05)
    elif gid == 'mozzie-dusk':
        drag(page, '[data-ok="true"]', (180, 270))
    elif gid.startswith('boss-'):
        for _ in range(3):
            page.locator('.choice-ok').first.dispatch_event('pointerdown')
            time.sleep(0.2)
    elif gid == 'heat-drink':
        x, y = svg_point(page, 100, 400)
        end = time.time() + 7
        while time.time() < end and page.evaluate("document.querySelector('#screen-game').classList.contains('active')"):
            tap(page, x, y); time.sleep(0.15)


def main():
    errors, failures = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=False)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errors.append(m.text))

        page.goto(BASE + '/'); page.wait_for_timeout(600)
        if SHOTS: page.screenshot(path=str(SHOTS / '00-menu.png'))

        for gid in GAMES:
            page.goto(BASE + '/'); page.wait_for_timeout(300)
            page.evaluate(f"window.__TES_FORCE__ = '{gid}'")
            page.click('#btn-play'); page.wait_for_timeout(700)
            if SHOTS: page.screenshot(path=str(SHOTS / f'game-{gid}.png'))
            win(page, gid)
            page.wait_for_timeout(250)
            res = page.evaluate("window.__TES__.state.results")
            ok = bool(res) and res[0]['ok']
            print(f"{'PASS' if ok else 'FAIL'}  {gid}  {res}")
            if not ok: failures.append(gid)
            if SHOTS and gid in ('boss-cyclone',):
                pass
            if SHOTS and gid in ('croc-edge', 'snake-bite', 'boss-cyclone'):
                page.wait_for_timeout(700)
                page.screenshot(path=str(SHOTS / f'result-{gid}.png'))

        # Streak bonus in the browser must match the server formula.
        bonus = page.evaluate("[1,2,3,4,7,9].map(window.__TES__.streakBonus)")
        if bonus != [0, 0, 20, 40, 100, 100]: failures.append(f'streakBonus {bonus}')

        # Cartoon fail animation for each kind of hazard.
        LOSE = {'croc-edge': None, 'stinger-suit': '[data-ok="false"]', 'cyclone-kit': '[data-ok="false"]',
                'flood-road': '.choice-bad', 'heat-drink': None, 'snake-bite': None, 'bushfire-leave': '.choice-bad',
                'lightning-pool': None, 'mozzie-dusk': None, 'sun-slip': '[data-ok="false"]', 'boss-croc': '.choice-bad'}
        for gid, sel in LOSE.items():
            page.goto(BASE + '/'); page.wait_for_timeout(300)
            page.evaluate(f"window.__TES_FORCE__ = '{gid}'")
            page.click('#btn-play'); page.wait_for_timeout(600)
            if sel: page.locator(sel).first.dispatch_event('pointerdown')
            page.wait_for_function("window.__TES__.state.results.length > 0", timeout=9000)
            page.wait_for_timeout(750)
            res = page.evaluate("window.__TES__.state.results")
            print(f"{'PASS' if not res[0]['ok'] else 'FAIL'}  lose {gid}")
            if res[0]['ok']: failures.append('lose ' + gid)
            if SHOTS: page.screenshot(path=str(SHOTS / f'fail-{gid}.png'))

        # Full run: do nothing until all lives are gone, then submit a name.
        page.goto(BASE + '/'); page.wait_for_timeout(300)
        page.evaluate("window.__TES_FORCE__ = 'flood-road'")
        page.click('#btn-play')
        page.wait_for_selector('#screen-over.active', timeout=40000)
        page.fill('#player-name', 'SmokeTester')
        page.click('#submit-form button[type=submit]')
        page.wait_for_function("document.querySelector('#submit-msg').textContent.includes('board')", timeout=8000)
        if SHOTS: page.screenshot(path=str(SHOTS / '10-gameover.png'), full_page=True)
        with page.expect_download(timeout=10000) as dl:
            page.click('#btn-share')
        card = dl.value.path()
        print('Share card:', dl.value.suggested_filename)
        if SHOTS:
            import shutil; shutil.copy(card, SHOTS / '13-share-card.png')
        page.click('#btn-over-menu'); page.click('#btn-board'); page.wait_for_timeout(800)
        board = page.inner_text('#board-list')
        print('Leaderboard:', board.replace('\n', ' | '))
        if 'SmokeTester' not in board: failures.append('leaderboard')
        if SHOTS: page.screenshot(path=str(SHOTS / '11-board.png'))
        page.goto(BASE + '/'); page.click('#btn-learn'); page.wait_for_timeout(300)
        if SHOTS: page.screenshot(path=str(SHOTS / '12-learn.png'), full_page=True)
        page.click('#screen-learn [data-back]'); page.click('#btn-badges'); page.wait_for_timeout(300)
        if 'Unlocked' not in page.inner_text('#badge-grid'): failures.append('reader badge')
        if SHOTS: page.screenshot(path=str(SHOTS / '14-badges.png'))

        # Daily Challenge: fixed sequence, separate board, shareable emoji result.
        page.goto(BASE + '/'); page.wait_for_timeout(400)
        if SHOTS: page.screenshot(path=str(SHOTS / '01-menu-v12.png'))
        page.click('#btn-daily')
        page.wait_for_timeout(500)
        day = page.evaluate("window.__TES__.darwinDay()")
        expect = page.evaluate(f"window.__TES__.dailySequence('{day}')")
        page.wait_for_selector('#screen-over.active', timeout=60000)
        played = [r['g'] for r in page.evaluate("window.__TES__.state.results")]
        if played != expect[:len(played)]: failures.append(f'daily order {played}')
        share = page.evaluate("window.__TES__.dailyShareText()")
        print('Daily share text:\n' + share)
        page.fill('#player-name', 'DailyTester')
        page.click('#submit-form button[type=submit]')
        page.wait_for_function("document.querySelector('#submit-msg').textContent.includes('board')", timeout=8000)
        if SHOTS: page.screenshot(path=str(SHOTS / '15-daily-over.png'), full_page=True)
        page.click('#btn-over-menu'); page.click('#btn-board'); page.click('.tab[data-period="daily"]'); page.wait_for_timeout(800)
        if 'DailyTester' not in page.inner_text('#board-list'): failures.append('daily board')

        # Demo (attract) mode plays itself and never submits a score.
        demo = browser.new_page(viewport={'width': 390, 'height': 760})
        demo.on('pageerror', lambda e: errors.append('demo: ' + str(e)))
        demo.goto(BASE + '/?demo=1'); demo.wait_for_timeout(9000)
        n = demo.evaluate("window.__TES__.state.results.length")
        print('Demo rounds played by the bot:', n)
        if n < 2: failures.append('demo bot')
        demo.close()

        # Booth screen on a 1080p display.
        booth = browser.new_page(viewport={'width': 1920, 'height': 1080})
        booth.on('pageerror', lambda e: errors.append('booth: ' + str(e)))
        booth.goto(BASE + '/booth'); booth.wait_for_timeout(2500)
        if 'SmokeTester' not in booth.inner_text('#ticker'): failures.append('booth ticker')
        booth.goto(BASE + '/booth?idle=2'); booth.wait_for_timeout(8000)
        if 'show' not in (booth.get_attribute('#attract', 'class') or ''): failures.append('attract mode')
        if SHOTS: booth.screenshot(path=str(SHOTS / '21-booth-attract.png'))
        if SHOTS: booth.screenshot(path=str(SHOTS / '20-booth.png'))
        if 'SmokeTester' not in booth.inner_text('#board'): failures.append('booth')
        browser.close()

    print('JS errors:', errors or 'none')
    print('RESULT:', 'ALL PASSED' if not failures and not errors else f'FAILED {failures}')
    sys.exit(1 if failures or errors else 0)


if __name__ == '__main__':
    main()
