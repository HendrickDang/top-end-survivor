# Top End Survivor

A fast, funny micro-game that teaches real Northern Territory safety rules in ten-second bursts: crocodiles, box jellyfish, cyclones, flooded roads, flash floods, dust storms, heat, sun, mozzies, lightning, snake bites and bushfire.

Built for the **CDU IT Code Fair 2026, Coding Competition (Capable Coders, Group, ID CAP003)** by Van Hoi (Hendrick) Dang, Le Nhat Minh Tran and Phuong Vy Ho.

> Play on the web, install it as an app (PWA), or sideload the Android APK. It works fully offline, and scores sync when you get signal back.

---

## Why

Every year newcomers and visitors to the Top End get hurt by hazards locals take for granted. Official safety advice exists, but it lives in PDFs and media releases that few people read. Short, playful games are proven to make safety messages stick, so Top End Survivor turns each official rule into a five-second challenge you can't help replaying.

Each mini-game maps to one official source (NT Government, NT Health, SecureNT, NTPFES, AVRU, Cancer Council, RACV). After every round the player sees the real rule, and the game-over screen lists the lessons they "learned the hard way" with links to the source.

## The mini-games

| Mini-game | You must... | Real rule it teaches | Source |
|---|---|---|---|
| STEP BACK! | Tap to back a fisher past the 5 m line | Stand at least 5 m from the water when fishing | Be Crocwise (NT Gov) |
| SWIM? | Decide from the sign | Only swim in signed swimming areas | Be Crocwise |
| PITCH IT FAR! | Drag the tent past 50 m | Camp at least 50 m from the water's edge | Be Crocwise |
| TREAT THE STING! | Drag the right bottle onto a sting | Vinegar, never fresh water; call 000 | NT Health |
| SUIT UP! | Pick the stinger suit | Stinger season is Oct to May | NT Health |
| PACK THE KIT! | Tap only the essentials | Water, torch, battery radio, first aid | SecureNT |
| FLOODED ROAD! | Turn around in time | If it's flooded, forget it | NTPFES |
| HYDRATE! | Keep tapping water, avoid the fizzy drink | 2 to 3 L of water a day, skip sugary drinks | NT Health |
| FIRST AID! | Drag the wide bandage onto the bite | Pressure immobilisation; don't cut, suck or tourniquet | AVRU, Uni Melbourne |
| SMOKE! | Choose to leave | Leaving early is the safest choice | NTPFES |
| STORM! EVERYONE OUT! | Tap every swimmer out of the pool | Leave the water when a storm is close; wait 30 min after the last thunder | Swimming NT |
| MOZZIES! | Drag the repellent onto the camper | Repellent and long, light sleeves at dusk and dawn | NT Health |
| SLIP SLOP SLAP! | Tap the 3 sun-safe items | Slip, slop, slap, seek, slide | Cancer Council |
| TRAP IT! | Tap when the croc is in the rangers' trap | Report croc sightings, never touch a croc trap, stand back | Be Crocwise |
| GET OUT! | Drag everyone out of the rock hole | Only swim in signed swimming areas; crocs move into waterholes after the wet | Be Crocwise |
| DUST STORM! | Drag the ute off the road | Slow down, lights and hazards on, pull over and wait in the car | RACV |
| DRY RIVER! | Tap to climb the bank | Never camp or walk in a dry river bed; flash floods come fast | NTPFES |
| BOSS: Cyclone Night | 3 decisions: kit and radio, strongest room, stay in during the eye | SecureNT cyclone shelter advice | SecureNT |
| BOSS: Croc Creek | 3 decisions: no swimming, 5 m back, never wade in for a lure | Be Crocwise | NT Government |

### Booth Battle, classrooms and help for everyone (v1.5)

- **Live Booth Battle:** press `B` (or the ⚔️ button) on the booth screen. It shows a join QR and a 4-letter code; everyone who scans (or taps ⚔️ Booth Battle on the menu) appears in the lobby with their character. Press Enter and every phone counts down together, then plays the same 5 hazards. The big screen shows a live race (green and red squares per round) and a podium with confetti. No lives: everyone plays all 5, highest score wins. The server keeps score and saves every finished race for the learning stats.
- **Locals vs visitors:** after a game, one optional tap: Local, New to the NT, or Visiting. The booth's new panel shows which safety topics each group gets wrong, with a headline like "Visitors fail croc rounds N× as often as locals", and the judge tour shows it too. On shared booth devices the answer is asked every game and never remembered.
- **Gesture hints:** the first time someone meets a mini-game, a ghost hand shows the gesture (tap, keep tapping, drag, or pick a button) and the timer waits an extra second. Hints never show the answer, only how to play. On shared booth devices (`?kiosk=1`) and in Relaxed mode they show every run.
- **Relaxed mode:** a menu toggle for kids, older players and anyone who wants it: 60% more time every round and bigger text. Relaxed scores stay off the leaderboards and Town Battle but still count in the learning stats.
- **🆘 Real help:** one tap from the menu, Safety tips and game over: 000, NT Emergency Service 132 500, Poisons Information 13 11 26, healthdirect 1800 022 222, NT Police 131 444, urgent croc reporting lines for Darwin and Katherine, plus SecureNT, BOM, Road Report NT and the PFES incident map. Every number was checked against the official sites in October 2026.
- **Classroom mode:** a teacher opens `/class`, names the class and gets a QR code and class code. Students join by scanning (no accounts). The teacher's live dashboard shows students, games, the hazards the class misses most (with the rule and the official source), quick check before → after, first try vs later tries, top scores, a print button and a 15-minute lesson plan. The teacher link (`/class#t=CODE.KEY`) opens the dashboard on another device; without the key nobody else can see the report.
- **People's Choice and take it home:** when the committee gives you the voting link (even on the day), open `/booth?vote=<link>&token=<ADMIN_TOKEN>` once on the booth laptop. The link is saved on the server, so the booth shows a "Vote for Team CAP003" QR and every phone shows a vote button at game over, with no code change and no redeploy. (Alternatives: the `VOTE_URL` environment variable on Render, or `VOTE_URL` in `web/js/config.js`.) On shared booth devices the game over screen shows big "Take it home" and "Vote for us" QR codes, so people vote and install on their own phone.

### Road trip, characters and a soundtrack (v1.4)

Minh's Journey, characters, fail cartoons and music, merged with everything from v1.3.

- **Journey mode:** a road trip across the Territory in 8 stops: Darwin, Kakadu, Litchfield, Katherine, Arnhem Land, Barkly, Alice Springs and the Uluru Region. Each stop is 5 rounds of that region's own hazards, played over that region's landscape, with a "Now arriving" card in between. Three lives for the whole trip; after Uluru it loops back to Darwin for lap 2. Your furthest stop shows on the menu, reaching Uluru unlocks the *Red Centre* badge, and the server checks every Journey round really came from that stop.
- **4 new hazards:** croc traps (Kakadu), rock holes (Arnhem Land), dust storms (Barkly) and flash floods in dry river beds (Alice Springs). 17 hazards plus 2 bosses in total.
- **Territory Characters:** 7 cheeky locals to play as, from Backpacker Barry (free) to Market Stall Sheila (600 coins). Every game earns 1 coin per 10 points, and game over says how close the next one is. Your character is the menu avatar, celebrates your wins and stars in your fails. Their skin and shirt carry into every mini-game, with your wardrobe hats, shirts and specs on top.
- **A fail cartoon for every hazard:** after the in-game fail animation, the result card plays a looping cartoon of exactly what went wrong (the croc drags the tent into the billabong, the ute floats away, lobster mode in the sun), starring your character.
- **Location backdrops:** every round is drawn over a real NT landscape: the stop you are at in Journey, or the hazard's home region in Classic and Daily.
- **Soundtrack:** a looping track that fades in on the first tap, speeds up as rounds get faster (and a lot for bosses), ducks under the fail sounds, pauses in a background tab and is cached for offline play. The mute button covers music and effects.
- **Admin tester** (`/?admin=1` or `/admin`): search for any mini-game, pick a location, or start a full Classic, Daily or Journey sandbox run. Nothing is saved.

### Friends, towns and proof it works (v1.3)

- **Challenge a mate:** game over gives a link like `/?vs=42`. Your mate sees "Hendrick challenged you! Beat 820", plays with your score as a 🎯 target, and gets a "You beat Hendrick by 120!" (or a Rematch button). Your menu then shows who took you on.
- **Town Battle:** pick your town (Darwin, Palmerston, Litchfield, Katherine, Alice Springs...). Each player's best score today counts for their town. New *Towns* tab on the leaderboard and a live NT map on the booth screen.
- **Wardrobe:** every badge unlocks gear for your character (croc hat, stinger suit, hi-vis, boss crown, graduate cap...). 23 badges, 27 pieces of gear.
- **Optional quick safety check:** 3 questions before your first game and the same 3 after it, once per device, always skippable. Plus a zero-effort measure: survival rate the first time someone meets a hazard vs. later tries. Both show live on the booth.
- **Judge's tour** (`/?judge=1`, or the link on the menu): 6 steps, about 60 seconds, with a live demo, live learning numbers, load test results and the team.
- **Load test:** `scripts/load_test.mjs` simulates hundreds of players finishing games at once. Latest local run: 500 players, 3,000 requests, 0 errors, 95% of requests under about 210 ms. CI runs 200 players on every push.

### Play every day (v1.2)

- **Daily Challenge:** everyone in the NT gets the same 9 hazards plus a boss each day (seeded by the Darwin date, checked by the server). Unlimited tries, your best score counts on the Daily board, and a Wordle-style emoji result to share in group chats. Day streaks and a "Daily Regular" badge reward coming back.
- **3 new hazards:** storm over the pool (lightning), mozzies at dusk, slip slop slap in the sun.
- **Boss rounds** every 10th round: *Cyclone Night* and *Croc Creek*, 3 decisions in a row, +200 if you survive.
- **In season now:** hazards in season in the Top End right now (stingers, cyclones, extreme heat) appear more often, and the menu says so.
- **Install it:** one-tap "Install the game" button (Android/desktop), step-by-step help on iPhone, and an optional direct Android APK download (`server/downloads/`). Installing unlocks the "Local" badge.
- **Your weak spot:** game over shows the hazard you miss most, with the rule to remember.
- **Booth attract mode:** after 45 seconds with no new players, the booth screen shows a self-playing demo with a giant QR code. It switches back the moment someone plays (press `A` to toggle). New "played again" stat shows how many people came back for another go.

### Fun factor (v1.1)

- **Cartoon fail for every hazard:** croc jaws snap shut, a jellyfish zaps you, the cyclone blows your stuff away, floodwater rises, you get "cooked like a snag", dizzy stars for the wrong first aid, smoke for leaving too late.
- **Juice:** confetti, screen shake, floating points, win streaks (from 3 in a row: +20 to +100 bonus, scored the same way on the server).
- **Sound:** themed sound effects made in code (chomp, splash, zap, sizzle) and music that speeds up each round, with a mute button.
- **12 badges:** one per safety topic, plus On a Roll, Top End Tourist, Top End Legend, Never Say Die and Read the Rules (for opening the Safety tips screen).
- **Share card:** a PNG with your score, badges and a QR code back to the game, shared through the phone's share sheet.
- **Booth boss mode:** a live "just now" ticker of how players got caught out, a crowd challenge to beat today's #1, and a "NEW #1!" celebration with confetti.

Rounds get faster as you go (5.5 s down to 2.6 s). Three lives. Points: 100 per survived round plus 10 per round reached.

All characters and art (including Frilly the frill-neck lizard, who runs the character store, and the 7 Territory Characters) are original and drawn in code. The concept is inspired by public-safety games in general; no third-party art or names are used. Sound effects are synthesised live with the Web Audio API. The soundtrack, *Clockwork Catastrophe* (`web/audio/`), was AI-generated for the team by Le Nhat Minh Tran.

## How it meets the judging criteria

- **Innovation**: safety education as a crowd game with a live "what's catching people out" analytics board. Every round played becomes data on which safety rules people actually misunderstand.
- **Functionality**: 17 mini-games and 2 boss rounds across 8 NT locations, three modes (Classic, Daily, Journey), 7 unlockable characters, offline play, leaderboards, booth screen with QR code, Android app, admin tools, CSV export.
- **Usability**: one-tap play, no sign-up, portrait phone layout, big touch targets, reduced-motion support, works with no signal.
- **Scalability**: stateless API + SQLite (swap for Postgres with one module), server-side score validation, rate limiting, offline outbox so spiky booth traffic never loses a score. New mini-games are a single object in `web/js/games.js`.

## Architecture

```
 Phone / tablet / Android app                    Server (Node 22 + Express)
 ┌──────────────────────────┐   HTTPS JSON   ┌──────────────────────────────┐
 │ web/  (vanilla JS PWA)   │ ─────────────► │ POST /api/runs  validate +   │
 │  games.js  19 mini-games │                │                 rescore      │
 │  main.js   engine        │ ◄───────────── │ GET  /api/leaderboard        │
 │  api.js    offline outbox│                │ GET  /api/stats (analytics)  │
 │  sw.js     offline cache │                │ GET  /api/qr.svg             │
 └──────────────────────────┘                │ SQLite: runs + per-round     │
 Booth screen: /booth (polls every 5 s)      │ results                      │
 Android: Capacitor wraps the same web/ dir  └──────────────────────────────┘
```

- **No build step.** The game is plain HTML, CSS and ES modules, so anyone on the team can edit it.
- **Rate limits.** Writes are limited per IP address (`WRITE_LIMIT`, default 300 a minute; Booth Battle updates `BATTLE_LIMIT`, default 1,500). At an event most phones share the venue Wi-Fi, so they all look like one IP: raise these if the booth gets very busy.
- **Anti-cheat.** The server ignores the client's score and recomputes it from per-round results; runs must end on the third life, bosses must be on rounds 10, 20, 30, Daily runs must match the day's sequence, Journey rounds must come from the stop they were played at, rounds can't be faster than humanly possible, and names pass a profanity filter.
- **Offline first.** Finished runs go into a localStorage outbox and upload when online. The service worker caches the whole game.

## Run it locally

Requires Node 22.5+ (uses Node's built-in SQLite).

```bash
npm install --prefix server
npm start                     # http://localhost:8080  (game)
                              # http://localhost:8080/booth  (booth screen)
npm test                      # API tests
```

Phones on the same Wi-Fi can play via `http://<your-laptop-ip>:8080`.

## Deploy (free)

1. Push this repo to GitHub.
2. On [render.com](https://render.com): New > Blueprint > select the repo. `render.yaml` sets everything up.
3. Copy the URL Render gives you, put it in `render.yaml` (`PUBLIC_URL`) and `web/js/config.js` (`ANDROID_API_BASE`), and push again.

Any Docker host works too: `docker build -t tes . && docker run -p 8080:8080 -v tes-data:/data tes`.

## Android app

The `android/` folder is a Capacitor project that wraps `web/`.

- **Easiest:** push to GitHub. The CI workflow builds the APK; download `top-end-survivor-debug-apk` from the Actions run and install it on any Android phone (allow "install unknown apps").
- **Locally:** install Android Studio, then `npm install && npx cap sync android && npx cap open android`, and press Run.
- After changing anything in `web/`, run `npx cap sync android`.
- To regenerate launcher icons: `python3 scripts/make_android_icons.py`.

## Load test

```bash
npm start                                   # in one terminal (or use your deployed URL)
node scripts/load_test.mjs --url http://localhost:8080 --players 500 --concurrency 50 --save
```

`--save` writes `web/load-test.json`, which the Judge's tour displays. Fake players use client ids starting with `loadtest-`; remove them with `curl -X DELETE -H "X-Admin-Token: $TOKEN" <url>/api/admin/loadtest`. Don't run it against the live server on competition day.

## Admin (competition day)

Set `ADMIN_TOKEN` (Render generates one; see the service's Environment tab).

```bash
# wipe test scores the morning of the event
curl -X POST -H "X-Admin-Token: $TOKEN" https://<host>/api/admin/reset
# remove one rude entry
curl -X DELETE -H "X-Admin-Token: $TOKEN" https://<host>/api/admin/runs/42
# download anonymised per-round data for analysis
curl -H "X-Admin-Token: $TOKEN" https://<host>/api/admin/export.csv -o rounds.csv
```

Kiosk mode for a shared tablet: open `/?kiosk=1` (clears the name box, skips the quick check and returns to the menu after 45 s).

Booth Battle: on the booth screen press `B` (or click ⚔️ Booth Battle), wait for players, press Enter to start, Esc to close.

Classroom dashboard: `/class`. People's Choice QR: open `/booth?vote=<link>&token=<ADMIN_TOKEN>` once (saved for every device), or `curl -X POST -H "X-Admin-Token: $TOKEN" -H "Content-Type: application/json" -d '{"voteUrl":"<link>"}' https://<host>/api/admin/config`.

Mini-game tester: `/admin` (or `/?admin=1`). Search any mini-game, pick a location for the backdrop, start a full Classic / Daily / Journey sandbox run, slow the round timer down, and turn on the debug overlay. Scores, lives, coins, badges and the leaderboard are untouched.

Judge's tour: `/?judge=1`. Booth keys: `A` toggles attract mode, `N` shows the next stats panel (hazards, Town Battle, learning).

## Add a new mini-game

1. Add an object to `GAMES` in `web/js/games.js` (see the comment at the top of the file).
2. Add its tip and source to `LESSONS`, a label to `GAME_LABELS` and an icon to `GAME_ICONS` in `web/js/lessons.js`.
3. Add its id to `REGULAR` in `web/js/daily.js` (the server imports it; a test checks it matches the lessons).
4. Add it to at least one location's `games` list in `web/js/locations.js`, and optionally a fail cartoon in `web/js/fails.js`.
5. Add a win strategy to `scripts/smoke_test.py`, bump `CACHE` in `web/sw.js`.

## Project structure

```
web/                 the game (also the Android app's content)
  index.html         screens
  booth.html         big-screen leaderboard + live analytics + QR
  js/games.js        the 17 mini-games + 2 bosses
  js/lessons.js      tips + official sources (edit wording here)
  js/main.js         engine: modes, rounds, timer, scoring, screens
  js/battle.js       Booth Battle on the phone: join, lobby, countdown, podium
  js/hints.js        first-time gesture hints for every mini-game
  js/classroom.js    joining a class from a teacher's link
  js/groups.js       locals vs visitors, topic names, class and battle codes (shared with the server)
  js/locations.js    the 8 Journey stops: card art and round backdrops
  js/characters.js   the 7 Territory Characters + coins
  js/fails.js        a looping fail cartoon for each mini-game
  js/fx.js           in-game fail animations, confetti, toasts
  js/sound.js        sound effects + the soundtrack
  js/api.js          leaderboard client with offline outbox
  js/art.js          the player, items and props, drawn as SVG in code
  audio/             the soundtrack
  class.html         teacher dashboard for classroom mode
  sw.js              offline cache
server/              Express API + SQLite (src/battles.js: live Booth Battles, in memory)
android/             Capacitor Android project
scripts/             smoke test (plays every game), icon generator
docs/DEMO.md         submission checklist and demo-day plan
```

## Sources

- NT Government, *Crocodile safety: Be Crocwise* - https://nt.gov.au/emergency/community-safety/crocodile-safety-be-crocwise/how-to-stay-safe
- NT Health, *Box jellyfish fact sheet* - https://health.nt.gov.au/media/pdf/phu/cdc-factsheets/box-jellyfish-nt-health-factsheet.pdf
- SecureNT, *Cyclones* - https://securent.nt.gov.au/prepare-for-an-emergency/cyclones
- NTPFES, *Flooded road rescue: "If it's flooded, forget it"* - https://pfes.nt.gov.au/newsroom/2018/flooded-road-rescue-old-bynoe-road
- NT Government, *Heat stress* - https://nt.gov.au/wellbeing/health-conditions-treatments/heat-stress
- Australian Venom Research Unit, *Pressure immobilisation first aid* - https://biomedicalsciences.unimelb.edu.au/departments/pharmacology/engage/avru/discover/first-aid/pressure-immobilisation-first-aid
- NTPFES, *Bushfire survival plan* - https://pfes.nt.gov.au/file/download/36012
- Swimming NT, *Lightning policy* - https://nt.swimming.org.au/sites/default/files/assets/documents/SNT%20Lightning%20Policy%20-%20SNT-POL-007.pdf
- NT Health, *Murray Valley encephalitis public health alert* (mosquito protection) - https://health.nt.gov.au/news/2023/murray-valley-encephalitis-public-health-alert2
- Cancer Council, *Slip, slop, slap, seek, slide* - https://www.cancercouncil.com.au/cancer-prevention/sun-protection/preventing-skin-cancer/slip-slop-slap-seek-slide/
- SecureNT, *Emergency plan: evacuate or stay* (cyclone shelter) - https://securent.nt.gov.au/prepare-for-an-emergency/weather-events/cyclones/emergency-plan-evacuate-or-stay
- RACV, *Safe driving tips during dust storms* - https://www.racv.com.au/about-racv/newsroom/dust-storm-driving-tips.html

This game is a learning tool, not medical advice. In an emergency call 000.

## License

Copyright © 2026 Saltie Studios (Van Hoi (Hendrick) Dang, Le Nhat Minh Tran, Phuong Vy Ho). All rights reserved. See [LICENSE](LICENSE).
