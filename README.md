# Top End Survivor

A fast, funny micro-game that teaches real Northern Territory safety rules in ten-second bursts: crocodiles, box jellyfish, cyclones, flooded roads, heat, snake bites and bushfire.

Built for the **CDU IT Code Fair 2026, Coding Competition (Capable Coders, Group, ID CAP003)** by Van Hoi (Hendrick) Dang, Le Nhat Minh Tran and Phuong Vy Ho.

> Play on the web, install it as an app (PWA), or sideload the Android APK. It works fully offline, and scores sync when you get signal back.

---

## Why

Every year newcomers and visitors to the Top End get hurt by hazards locals take for granted. Official safety advice exists, but it lives in PDFs and media releases that few people read. Short, playful games are proven to make safety messages stick, so Top End Survivor turns each official rule into a five-second challenge you can't help replaying.

Each mini-game maps to one official source (NT Government, NT Health, SecureNT, NTPFES, AVRU). After every round the player sees the real rule, and the game-over screen lists the lessons they "learned the hard way" with links to the source.

## The ten mini-games

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

### Fun factor (v1.1)

- **Cartoon fail for every hazard:** croc jaws snap shut, a jellyfish zaps you, the cyclone blows your stuff away, floodwater rises, you get "cooked like a snag", dizzy stars for the wrong first aid, smoke for leaving too late.
- **Juice:** confetti, screen shake, floating points, win streaks (from 3 in a row: +20 to +100 bonus, scored the same way on the server).
- **Sound:** a chiptune music loop that speeds up each round, plus themed sound effects (chomp, splash, zap, sizzle). All made in code, with a mute button.
- **12 badges:** one per safety topic, plus On a Roll, Top End Tourist, Top End Legend, Never Say Die and Read the Rules (for opening the Safety tips screen).
- **Share card:** a PNG with your score, badges and a QR code back to the game, shared through the phone's share sheet.
- **Booth boss mode:** a live "just now" ticker of how players got caught out, a crowd challenge to beat today's #1, and a "NEW #1!" celebration with confetti.

Rounds get faster as you go (5.5 s down to 2.6 s). Three lives. Points: 100 per survived round plus 10 per round reached.

All characters and art (including Frilly the frill-neck lizard) are original and drawn in code. The concept is inspired by public-safety games in general; no third-party art, names or audio are used.

## How it meets the judging criteria

- **Innovation**: safety education as a crowd game with a live "what's catching people out" analytics board. Every round played becomes data on which safety rules people actually misunderstand.
- **Functionality**: 10 mini-games, offline play, leaderboard, booth screen with QR code, Android app, admin tools, CSV export.
- **Usability**: one-tap play, no sign-up, portrait phone layout, big touch targets, reduced-motion support, works with no signal.
- **Scalability**: stateless API + SQLite (swap for Postgres with one module), server-side score validation, rate limiting, offline outbox so spiky booth traffic never loses a score. New mini-games are a single object in `web/js/games.js`.

## Architecture

```
 Phone / tablet / Android app                    Server (Node 22 + Express)
 ┌──────────────────────────┐   HTTPS JSON   ┌──────────────────────────────┐
 │ web/  (vanilla JS PWA)   │ ─────────────► │ POST /api/runs  validate +   │
 │  games.js  10 mini-games │                │                 rescore      │
 │  main.js   engine        │ ◄───────────── │ GET  /api/leaderboard        │
 │  api.js    offline outbox│                │ GET  /api/stats (analytics)  │
 │  sw.js     offline cache │                │ GET  /api/qr.svg             │
 └──────────────────────────┘                │ SQLite: runs + per-round     │
 Booth screen: /booth (polls every 5 s)      │ results                      │
 Android: Capacitor wraps the same web/ dir  └──────────────────────────────┘
```

- **No build step.** The game is plain HTML, CSS and ES modules, so anyone on the team can edit it.
- **Anti-cheat.** The server ignores the client's score and recomputes it from per-round results; runs must end on the third life, rounds can't be faster than humanly possible, and names pass a profanity filter.
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

Kiosk mode for a shared tablet: open `/?kiosk=1` (clears the name box and returns to the menu after 45 s).

## Add a new mini-game

1. Add an object to `GAMES` in `web/js/games.js` (see the comment at the top of the file).
2. Add its tip and source to `LESSONS` and a label to `GAME_LABELS` in `web/js/lessons.js`.
3. Add its id to `GAME_IDS` in `server/src/scoring.js` (a test checks they match).
4. Add a win strategy to `scripts/smoke_test.py`, bump `CACHE` in `web/sw.js`.

## Project structure

```
web/                 the game (also the Android app's content)
  index.html         screens
  booth.html         big-screen leaderboard + live analytics + QR
  js/games.js        the 10 mini-games
  js/lessons.js      tips + official sources (edit wording here)
  js/main.js         engine: rounds, timer, scoring, screens
  js/api.js          leaderboard client with offline outbox
  js/art.js          all characters and items, drawn as SVG in code
  sw.js              offline cache
server/              Express API + SQLite
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

This game is a learning tool, not medical advice. In an emergency call 000.

## License

MIT
