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
         'lightning-pool', 'mozzie-dusk', 'sun-slip', 'croc-trap', 'rock-hole', 'dust-storm', 'flash-flood', 'roo-dusk',
         'boss-cyclone', 'boss-croc']

SVG_PT = """([x, y]) => { const svg = document.querySelector('#stage svg'); const p = svg.createSVGPoint();
  p.x = x; p.y = y; const r = p.matrixTransform(svg.getScreenCTM()); return [r.x, r.y]; }"""
# Roos at Dusk autopilot: hold the brake only when driving on would put the ute in the lane with an animal.
ROO_AUTOPILOT = """() => new Promise((done) => {
  const svg = document.querySelector('#stage svg'); const r = svg.__roo; let held = false;
  const press = (on) => { if (on === held) return; held = on;
    svg.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { bubbles: true, pointerId: 1 })); };
  const t0 = performance.now();
  const step = () => {
    if (!document.querySelector('#screen-game.active') || !document.body.contains(svg)) { press(false); return done(true); }
    const d = r.d, F = r.plan.F, bar = document.querySelector('#timer-bar');
    const p = 1 - (new DOMMatrix(getComputedStyle(bar).transform).a);
    const t = p * window.__TES__.state.ctx.seconds;
    let brake = false;
    for (const a of r.plan.items) {
      if (d > a.Y + 92) continue;
      const bandIn = a.start + a.C * ((220 - a.half) / 440), bandOut = bandIn + a.C * (2 * a.half / 440);
      const tFront = t + Math.max(0, a.Y - 4 - d) / F, tBack = t + (a.Y + 92 - d) / F + .12;
      if (tFront < bandOut + .08 && tBack > bandIn - .08 && tFront - t < .6) brake = true;
    }
    press(brake);
    if (performance.now() - t0 < 15000) requestAnimationFrame(step); else done(false);
  };
  requestAnimationFrame(step);
})"""
# Roo Run autopilot: dodge `n` animals with the same rule as above, then stop braking and crash.
ROO_RUN_AUTOPILOT = """(n) => new Promise((done) => {
  const svg = document.querySelector('#stage svg'); const r = svg.__rooRun; let held = false;
  const press = (on) => { if (on === held) return; held = on;
    svg.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { bubbles: true, pointerId: 1 })); };
  const step = () => {
    if (!document.querySelector('#screen-game.active')) { press(false); return done(Number(document.querySelector('#hud-score').textContent)); }
    const dodged = Number(document.querySelector('#hud-score').textContent);
    let brake = false;
    if (dodged < n) for (const a of r.actors) {
      if (a.passed || a.Y - r.d > 480) continue;
      const bandIn = a.start + a.C * ((220 - a.half) / 440), bandOut = bandIn + a.C * (2 * a.half / 440);
      const tFront = r.t + Math.max(0, a.Y - 4 - r.d) / a.F, tBack = r.t + (a.Y + 92 - r.d) / a.F + .12;
      if (tFront < bandOut + .08 && tBack > bandIn - .08 && tFront - r.t < .6) brake = true;
    }
    press(brake);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
})"""
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
    elif gid == 'rock-hole':
        # draggable() moves the grabbed node to the front of the DOM, so bind to the
        # element handle before dragging rather than re-querying the selector.
        for _ in range(2):
            handle = page.query_selector('[data-ok="true"]')
            if not handle:
                break
            box = handle.bounding_box()
            sx, sy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            tx, ty = svg_point(page, 100, 445)
            page.mouse.move(sx, sy); page.mouse.down()
            for i in range(1, 9):
                page.mouse.move(sx + (tx - sx) * i / 8, sy + (ty - sy) * i / 8)
            page.mouse.up()
            handle.evaluate("n => n.removeAttribute('data-ok')")
            time.sleep(0.15)
    elif gid == 'dust-storm':
        drag(page, '[data-ok="true"]', (60, 400))
    elif gid == 'croc-trap':
        for _ in range(80):
            cx = page.evaluate("() => { const n = document.querySelector('[data-croc]'); if (!n) return -999;"
                               " const m = n.getAttribute('transform').match(/translate\\(([-0-9.]+)/);"
                               " return m ? parseFloat(m[1]) : -999; }")
            if abs(cx - 190) < 34:
                tap(page, *svg_point(page, 190, 300))
                break
            time.sleep(0.05)
    elif gid == 'roo-dusk':
        page.wait_for_function("document.querySelector('#stage svg') && document.querySelector('#stage svg').__roo")
        page.evaluate(ROO_AUTOPILOT)
    elif gid == 'flash-flood':
        x, y = svg_point(page, 180, 300)
        for _ in range(8):
            tap(page, x, y)
            time.sleep(0.05)
    elif gid == 'heat-drink':
        x, y = svg_point(page, 100, 400)
        end = time.time() + 7
        while time.time() < end and page.evaluate("document.querySelector('#screen-game').classList.contains('active')"):
            tap(page, x, y); time.sleep(0.15)


def main():
    errors, failures = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=False,
                                  permissions=['clipboard-read', 'clipboard-write'])
        # The optional quick safety check is tested separately below; skip it here.
        ctx.add_init_script("if (!localStorage.getItem('tes_quiz_v1')) localStorage.setItem('tes_quiz_v1', JSON.stringify({status: 'skipped'}))")
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errors.append(m.text))

        page.goto(BASE + '/'); page.wait_for_timeout(600)
        if SHOTS: page.screenshot(path=str(SHOTS / '00-menu.png'))

        for gid in GAMES:
            page.goto(BASE + '/'); page.wait_for_timeout(300)
            page.evaluate(f"window.__TES_FORCE__ = '{gid}'")
            page.click('#btn-play'); page.wait_for_timeout(700)
            if gid == GAMES[0] and not page.query_selector('#stage .hint-badge'): failures.append('first-time hint')
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
                'lightning-pool': None, 'mozzie-dusk': None, 'sun-slip': '[data-ok="false"]', 'boss-croc': '.choice-bad',
                'croc-trap': None, 'rock-hole': None, 'dust-storm': None, 'flash-flood': None, 'roo-dusk': None}
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
            # then the result card: a looping fail cartoon starring your character
            page.wait_for_selector('#screen-result.active', timeout=5000)
            if not page.query_selector('#result-face.scene svg.fail-scene'): failures.append('fail scene ' + gid)
            if SHOTS and gid in ('lightning-pool', 'mozzie-dusk', 'sun-slip', 'boss-croc', 'croc-trap', 'dust-storm'):
                page.wait_for_timeout(400); page.screenshot(path=str(SHOTS / f'fail-card-{gid}.png'))

        # Journey: "now arriving" card, 5 rounds per stop, then on to Kakadu; the server checks the route.
        page.goto(BASE + '/'); page.wait_for_timeout(300)
        if SHOTS: page.screenshot(path=str(SHOTS / '02-menu-v14.png'))
        page.click('#btn-journey')
        page.wait_for_selector('#loc-intro.show', timeout=3000)
        if 'Darwin' not in page.inner_text('#loc-intro'): failures.append('journey intro')
        if SHOTS: page.screenshot(path=str(SHOTS / '30-journey-intro.png'))
        page.click('#loc-intro')
        for i in range(5):
            page.wait_for_function(f"window.__TES__.state.round === {i + 1} && document.querySelector('#screen-game.active') && !document.querySelector('#loc-intro.show')", timeout=8000)
            page.wait_for_timeout(450)
            if SHOTS and i == 0: page.screenshot(path=str(SHOTS / '31-journey-round.png'))
            if 'Darwin' not in page.inner_text('#hud-location'): failures.append('journey hud')
            page.evaluate("window.__TES__.state.ctx.win()")
        page.wait_for_selector('#loc-intro.show', timeout=8000)
        print('Journey next stop:', page.inner_text('#loc-intro .loc-name'))
        if page.inner_text('#loc-intro .loc-name') != 'Kakadu': failures.append('journey next stop')
        if SHOTS: page.screenshot(path=str(SHOTS / '32-journey-kakadu.png'))
        page.wait_for_selector('#screen-over.active', timeout=60000)
        played = page.evaluate("window.__TES__.state.results.map(r => r.g)")
        locs = page.evaluate("window.__TES__.LOCATIONS.map(l => l.games)")
        if any(g not in locs[0] for g in played[:5]) or any(g not in locs[1] for g in played[5:]): failures.append(f'journey route {played}')
        if 'Kakadu' not in page.inner_text('#over-rounds'): failures.append('journey over text')
        coins = page.inner_text('#over-coins')
        print('Coins:', coins.replace('\n', ' '))
        if '+' not in coins: failures.append('coins')
        page.fill('#player-name', 'JourneyTester')
        page.click('#submit-form button[type=submit]')
        page.wait_for_function("document.querySelector('#submit-msg').textContent.includes('board')", timeout=8000)
        if SHOTS: page.screenshot(path=str(SHOTS / '33-journey-over.png'), full_page=True)
        if page.evaluate("localStorage.getItem('tes_location')") != '1': failures.append('journey furthest')

        # Territory Characters: buy one with coins, it becomes your avatar and dresses the in-game player.
        page.evaluate("localStorage.setItem('tes_coins', '150')")
        page.goto(BASE + '/'); page.wait_for_timeout(300)
        if 'Kakadu' not in page.inner_text('#menu-journey'): failures.append('menu furthest')
        page.click('#btn-chars'); page.wait_for_timeout(300)
        page.locator('.char-card', has_text='Cyclone Cheryl').click(); page.wait_for_timeout(200)
        if 'Not enough' not in page.inner_text('#shop-msg'): failures.append('shop too poor')
        page.locator('.char-card', has_text='Croc-Wrestling Craig').click(); page.wait_for_timeout(300)
        if 'Unlocked' not in page.inner_text('#shop-msg') or page.inner_text('#shop-coins') != '50': failures.append('shop buy')
        if SHOTS: page.screenshot(path=str(SHOTS / '34-characters.png'), full_page=True)
        page.click('#screen-characters [data-back]'); page.wait_for_timeout(200)
        if not page.query_selector('#menu-mascot svg.char.craig'): failures.append('menu avatar')
        page.click('#btn-wardrobe'); page.wait_for_timeout(200)
        if 'Croc-Wrestling Craig' not in page.inner_text('#wardrobe-who'): failures.append('wardrobe character')
        if SHOTS: page.screenshot(path=str(SHOTS / '35-wardrobe-craig.png'))

        # Admin tester: play one chosen mini-game; nothing is queued for the leaderboard.
        outbox_before = page.evaluate("(JSON.parse(localStorage.getItem('tes_outbox_v1')) || []).length")
        page.goto(BASE + '/?admin=1'); page.wait_for_timeout(400)
        if not page.is_visible('#screen-admin'): failures.append('admin screen')
        if SHOTS: page.screenshot(path=str(SHOTS / '36-admin.png'))
        page.locator('#admin-locs .tab', has_text='Barkly').click(); page.wait_for_timeout(200)
        page.locator('.admin-game', has_text='dust-storm').click(); page.wait_for_timeout(600)
        if SHOTS: page.screenshot(path=str(SHOTS / '37-admin-dust-storm.png'))
        page.wait_for_selector('#screen-admin.active', timeout=12000)
        if page.evaluate("(JSON.parse(localStorage.getItem('tes_outbox_v1')) || []).length") != outbox_before: failures.append('admin saved a run')

        # Town Battle: pick a town from the menu chip.
        page.goto(BASE + '/'); page.wait_for_timeout(300)
        page.click('#town-chip'); page.click('[data-town="palmerston"]'); page.wait_for_timeout(300)
        if 'Palmerston' not in page.inner_text('#town-chip'): failures.append('town chip')

        # Full run: do nothing until all lives are gone, then submit a name.
        page.goto(BASE + '/'); page.wait_for_timeout(300)
        page.evaluate("window.__TES_FORCE__ = 'flood-road'")
        page.click('#btn-play')
        page.wait_for_selector('#screen-over.active', timeout=60000)
        page.fill('#player-name', 'SmokeTester')
        page.click('#submit-form button[type=submit]')
        page.wait_for_function("document.querySelector('#submit-msg').textContent.includes('board')", timeout=8000)
        if SHOTS: page.screenshot(path=str(SHOTS / '10-gameover.png'), full_page=True)
        with page.expect_download(timeout=10000) as dl:
            page.click('#btn-share')
        card = dl.value.path()
        print('Share card:', dl.value.suggested_filename)

        # Challenge a mate: get the link, open it on another "phone", accept and play.
        page.click('#btn-challenge'); page.wait_for_timeout(1500)
        link = page.evaluate("navigator.clipboard.readText()").split(' ')[-1]
        print('Challenge link:', link)
        if '?vs=' not in link: failures.append('challenge link')
        mate_ctx = browser.new_context(viewport={'width': 390, 'height': 844})
        mate_ctx.add_init_script("localStorage.setItem('tes_quiz_v1', JSON.stringify({status: 'skipped'}))")
        mate = mate_ctx.new_page()
        mate.on('pageerror', lambda e: errors.append('mate: ' + str(e)))
        mate.goto(link.replace('http://localhost:8099', BASE)); mate.wait_for_timeout(800)
        if 'SmokeTester' not in mate.inner_text('#challenge-text'): failures.append('challenge banner')
        if SHOTS: mate.screenshot(path=str(SHOTS / '16-challenge-banner.png'))
        mate.evaluate("window.__TES_FORCE__ = 'sun-slip'")
        mate.click('#btn-accept'); mate.wait_for_timeout(700)
        if not mate.inner_text('#hud-target').startswith('🎯'): failures.append('challenge target')
        mate.wait_for_selector('#screen-over.active', timeout=60000)
        if mate.is_hidden('#over-challenge'): failures.append('challenge result')
        mate.fill('#player-name', 'MateTester'); mate.click('#submit-form button[type=submit]')
        mate.wait_for_function("document.querySelector('#submit-msg').textContent.includes('board')", timeout=8000)
        if SHOTS: mate.screenshot(path=str(SHOTS / '17-challenge-over.png'), full_page=True)
        mate_ctx.close()
        page.click('#btn-over-menu'); page.wait_for_timeout(1200)
        if 'MateTester' not in page.inner_text('#challenge-results'): failures.append('challenge results on menu')
        if SHOTS: page.screenshot(path=str(SHOTS / '18-menu-challenge-results.png'))
        if SHOTS:
            import shutil; shutil.copy(card, SHOTS / '13-share-card.png')
        page.click('#btn-board'); page.wait_for_timeout(800)
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

        # Towns tab on the leaderboard.
        page.goto(BASE + '/'); page.click('#btn-board'); page.click('.tab[data-period="towns"]'); page.wait_for_timeout(800)
        if 'Palmerston' not in page.inner_text('#board-list'): failures.append('towns board')
        if SHOTS: page.screenshot(path=str(SHOTS / '19-towns-board.png'))

        # Wardrobe: free item can be worn, locked item explains how to unlock it.
        page.goto(BASE + '/'); page.click('#btn-wardrobe'); page.wait_for_timeout(300)
        page.locator('.witem.locked').first.click(); page.wait_for_timeout(200)
        if 'Unlock with' not in page.inner_text('#wardrobe-hint'): failures.append('wardrobe hint')
        page.locator('.witem:not(.locked)').nth(1).click(); page.wait_for_timeout(200)
        if SHOTS: page.screenshot(path=str(SHOTS / '22-wardrobe.png'), full_page=True)
        page.click('.wtab[data-tab="shirt"]'); page.wait_for_timeout(200)
        if SHOTS: page.screenshot(path=str(SHOTS / '23-wardrobe-shirts.png'), full_page=True)

        # Optional quick safety check: offered once, before -> game -> after.
        qctx = browser.new_context(viewport={'width': 390, 'height': 844})
        q = qctx.new_page()
        q.on('pageerror', lambda e: errors.append('quiz: ' + str(e)))
        q.goto(BASE + '/'); q.wait_for_timeout(400)
        q.click('#btn-play'); q.wait_for_timeout(300)
        if q.is_hidden('#quiz-offer'): failures.append('quiz offer')
        if SHOTS: q.screenshot(path=str(SHOTS / '24-quiz-offer.png'))
        q.click('#quiz-yes')
        for _ in range(3):
            q.locator('.quiz-opt').first.click(); q.wait_for_timeout(450)
        if SHOTS: q.screenshot(path=str(SHOTS / '25-quiz-pre-done.png'))
        q.evaluate("window.__TES_FORCE__ = 'flood-road'")
        q.click('#quiz-go')
        q.wait_for_selector('#screen-over.active', timeout=60000)
        if q.is_hidden('#over-quiz'): failures.append('quiz post offer')
        q.click('#btn-quiz-post')
        for _ in range(3):
            q.locator('.quiz-opt').first.click(); q.wait_for_timeout(1400)
        txt = q.inner_text('#quiz-q')
        print('Quiz result:', txt.replace('\n', ' '))
        if 'Before' not in txt: failures.append('quiz result')
        if SHOTS: q.screenshot(path=str(SHOTS / '26-quiz-result.png'))
        qctx.close()

        # Judge's tour: 6 steps with live numbers.
        page.goto(BASE + '/?judge=1'); page.wait_for_timeout(800)
        if not page.is_visible('#screen-judge'): failures.append('judge tour')
        for i in range(6):
            if SHOTS and i in (0, 2, 3, 4): page.screenshot(path=str(SHOTS / f'27-judge-{i + 1}.png'), full_page=True)
            page.click('#judge-next'); page.wait_for_timeout(700 if i != 1 else 300)

        # Booth screen on a 1080p display.
        booth = browser.new_page(viewport={'width': 1920, 'height': 1080})
        booth.on('pageerror', lambda e: errors.append('booth: ' + str(e)))
        booth.goto(BASE + '/booth?attract=0'); booth.wait_for_timeout(2500)
        if 'SmokeTester' not in booth.inner_text('#ticker'): failures.append('booth ticker')
        if 'SmokeTester' not in booth.inner_text('#board'): failures.append('booth')
        if SHOTS: booth.screenshot(path=str(SHOTS / '20-booth.png'))
        booth.keyboard.press('n'); booth.wait_for_timeout(700)
        if 'Palmerston' not in booth.inner_text('#tlist'): failures.append('booth town map')
        if SHOTS: booth.screenshot(path=str(SHOTS / '20b-booth-towns.png'))
        booth.keyboard.press('n'); booth.wait_for_timeout(700)
        if SHOTS: booth.screenshot(path=str(SHOTS / '20c-booth-learning.png'))
        booth.goto(BASE + '/booth?idle=2'); booth.wait_for_timeout(8000)
        if 'show' not in (booth.get_attribute('#attract', 'class') or ''): failures.append('attract mode')
        if SHOTS: booth.screenshot(path=str(SHOTS / '21-booth-attract.png'))

        # ---------- v1.5 ----------
        # Real help: checked numbers, one tap from the menu.
        page.goto(BASE + '/'); page.wait_for_timeout(300)
        page.click('#btn-help'); page.wait_for_timeout(200)
        if not page.query_selector('#screen-help a[href="tel:000"]') or not page.query_selector('#screen-help a[href="tel:132500"]'): failures.append('real help')
        if SHOTS: page.screenshot(path=str(SHOTS / '40-real-help.png'), full_page=True)

        # Relaxed mode: slower rounds, kept off the leaderboard; locals vs visitors tap at game over.
        page.goto(BASE + '/'); page.wait_for_timeout(300)
        page.click('#relaxed-chip'); page.wait_for_timeout(200)
        if 'on' not in page.inner_text('#relaxed-chip'): failures.append('relaxed toggle')
        page.evaluate("window.__TES_FORCE__ = 'flood-road'")
        page.click('#btn-play'); page.wait_for_timeout(500)
        page.wait_for_selector('#screen-over.active', timeout=90000)
        if page.is_visible('#submit-form') or not page.is_visible('#over-relaxed'): failures.append('relaxed game over')
        page.locator('[data-who="visitor"]').click(); page.wait_for_timeout(1200)
        if 'Visitor' not in page.inner_text('#over-who'): failures.append('who answer')
        if SHOTS: page.locator('#over-who').screenshot(path=str(SHOTS / '41-who.png'))
        st = page.evaluate("fetch('/api/stats').then(r => r.json())")
        print('Groups:', st['groups']['players'])
        if st['groups']['players']['visitor'] < 1: failures.append('who saved')
        page.click('#btn-over-menu'); page.click('#relaxed-chip'); page.wait_for_timeout(200)

        # Classroom mode: teacher creates a class, a student joins by link, the report updates.
        teacher = browser.new_page(viewport={'width': 1200, 'height': 900})
        teacher.on('pageerror', lambda e: errors.append('teacher: ' + str(e)))
        teacher.goto(BASE + '/class.html'); teacher.wait_for_timeout(400)
        teacher.fill('#class-name', 'Year 7 Casuarina'); teacher.click('#create-form button'); teacher.wait_for_timeout(800)
        ccode = teacher.inner_text('#ccode')
        print('Class code:', ccode)
        page.goto(BASE + '/?class=' + ccode); page.wait_for_timeout(1000)
        if 'Year 7 Casuarina' not in page.inner_text('#class-chip'): failures.append('class chip')
        page.evaluate("window.__TES_FORCE__ = 'flood-road'")
        page.click('#btn-play'); page.wait_for_selector('#screen-over.active', timeout=60000)
        page.fill('#player-name', 'ClassKid'); page.click('#submit-form button[type=submit]')
        page.wait_for_function("document.querySelector('#submit-msg').textContent.includes('board')", timeout=8000)
        teacher.reload(); teacher.wait_for_timeout(1500)
        if teacher.inner_text('#k-players') != '1' or 'ClassKid' not in teacher.inner_text('#top'): failures.append('class report')
        if SHOTS: teacher.screenshot(path=str(SHOTS / '42-teacher.png'), full_page=True)
        page.goto(BASE + '/'); page.wait_for_timeout(300); page.click('#class-leave'); page.wait_for_timeout(200)
        if page.is_visible('#class-chip'): failures.append('leave class')
        teacher.close()

        # Shared booth device: big "take it home" QR (and a vote QR once VOTE_URL is set).
        kctx = browser.new_context(viewport={'width': 390, 'height': 844})
        kiosk = kctx.new_page()
        kiosk.on('pageerror', lambda e: errors.append('kiosk: ' + str(e)))
        kiosk.goto(BASE + '/?kiosk=1'); kiosk.wait_for_timeout(400)
        kiosk.evaluate("window.TES_CONFIG.VOTE_URL = 'https://example.com/vote'; window.__TES_FORCE__ = 'flood-road'")
        kiosk.click('#btn-play')
        if not kiosk.query_selector('#stage .hint-badge'): failures.append('kiosk hint')
        kiosk.wait_for_selector('#screen-over.active', timeout=60000); kiosk.wait_for_timeout(600)
        if not kiosk.is_visible('#over-home') or not kiosk.is_visible('#vote-qr-box'): failures.append('take-home QR')
        if SHOTS: kiosk.locator('#over-home').screenshot(path=str(SHOTS / '43-take-home.png'))
        kctx.close()

        # Live Booth Battle: the booth opens a battle, 2 phones join with the code, race, podium.
        booth = browser.new_page(viewport={'width': 1920, 'height': 1080})
        booth.on('pageerror', lambda e: errors.append('booth battle: ' + str(e)))
        booth.goto(BASE + '/booth?attract=0'); booth.wait_for_timeout(1200)
        booth.click('#bbtn'); booth.wait_for_function("/^[A-Z]{4}$/.test(document.querySelector('#bcode').textContent)", timeout=5000)
        code = booth.inner_text('#bcode')
        print('Battle code:', code)
        phones = []
        for name in ('Ava', 'Ben'):
            bctx = browser.new_context(viewport={'width': 390, 'height': 844})
            bctx.add_init_script("localStorage.setItem('tes_quiz_v1', JSON.stringify({status: 'skipped'}))")
            ph = bctx.new_page()
            ph.on('pageerror', lambda e, n=name: errors.append(f'{n}: ' + str(e)))
            ph.goto(BASE + '/?battle=' + code); ph.wait_for_timeout(500)
            ph.fill('#battle-name', name); ph.click('#battle-join-form button[type=submit]')
            ph.wait_for_selector('#screen-battle.active', timeout=5000)
            phones.append(ph)
        booth.wait_for_function("document.querySelectorAll('#bplayers .bp').length === 2", timeout=5000)
        if SHOTS: booth.screenshot(path=str(SHOTS / '44-battle-lobby.png'))
        booth.click('#bstart')
        plan = {0: [True] * 5, 1: [True, False, True, True, False]}
        for rnd in range(5):
            for ph in phones:
                ph.wait_for_function(f"window.__TES__.state.mode === 'battle' && window.__TES__.state.round === {rnd + 1} && document.querySelector('#screen-game.active')", timeout=20000)
            time.sleep(0.5)
            for i, ph in enumerate(phones):
                ph.evaluate(f"window.__TES__.state.ctx.{'win' if plan[i][rnd] else 'lose'}()")
            if rnd == 2 and SHOTS:
                booth.wait_for_timeout(1000); booth.screenshot(path=str(SHOTS / '45-battle-live.png'))
        for ph in phones: ph.wait_for_function("document.querySelector('#battle-podium .pod')", timeout=20000)
        print('Battle:', phones[0].inner_text('#battle-wait'), '|', phones[1].inner_text('#battle-wait'))
        if 'won' not in phones[0].inner_text('#battle-wait') or '#2' not in phones[1].inner_text('#battle-wait'): failures.append('battle result')
        booth.wait_for_function("document.querySelector('#battle').dataset.view === 'done'", timeout=10000)
        if 'Ava' not in booth.inner_text('#bpodium'): failures.append('booth podium')
        if SHOTS:
            phones[1].screenshot(path=str(SHOTS / '46-battle-phone.png'))
            booth.wait_for_timeout(800); booth.screenshot(path=str(SHOTS / '47-battle-podium.png'))
        booth.close()

        # Roo Run: endless Roos at Dusk with one life. Dodge 6, crash, get on the Roo Run board.
        rr = ctx.new_page()
        rr.on('pageerror', lambda e: errors.append(str(e)))
        rr.goto(BASE + '/'); rr.wait_for_timeout(400)
        rr.click('#btn-roorun')
        rr.wait_for_function("document.querySelector('#stage svg') && document.querySelector('#stage svg').__rooRun")
        if SHOTS: rr.wait_for_timeout(2500); rr.screenshot(path=str(SHOTS / '50-roorun.png'))
        got = rr.evaluate(ROO_RUN_AUTOPILOT, 6)
        rr.wait_for_selector('#screen-over.active', timeout=20000)
        print('Roo Run: dodged', got, '|', rr.inner_text('#over-rounds'))
        if got < 6: failures.append(f'roo run dodged only {got}')
        if not rr.is_visible('#over-endless'): failures.append('roo run game over note')
        rr.wait_for_timeout(1500)  # a saved name may auto-post first; then rename
        rr.fill('#player-name', 'RooRunner'); rr.click('#submit-form button[type=submit]')
        rr.wait_for_function("document.querySelector('#submit-msg').textContent.startsWith('On the board!')", timeout=8000)
        board = rr.evaluate("fetch('/api/leaderboard?period=endless').then(r => r.json())")
        if not any(e['name'] == 'RooRunner' and e['score'] == got for e in board['entries']): failures.append('roo run board')
        if SHOTS: rr.screenshot(path=str(SHOTS / '51-roorun-over.png'), full_page=True)
        rr.close()
        browser.close()

    print('JS errors:', errors or 'none')
    print('RESULT:', 'ALL PASSED' if not failures and not errors else f'FAILED {failures}')
    sys.exit(1 if failures or errors else 0)


if __name__ == '__main__':
    main()
