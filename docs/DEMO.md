# Code Fair plan: Top End Survivor (CAP003)

- **Submission deadline:** 30 Oct 2026, end of day, via the "Submit Here" link in the registration email (not by email).
- **Competition day:** 5 Nov 2026, 08:30 to 17:00, Festival Learning Space 1.11/1.12, Danala, CDU Darwin.
- **Judged on:** innovation, functionality, usability, scalability (and similar).

## Timeline

| By | Task | Who |
|---|---|---|
| 17 Oct | Push repo to GitHub, add teammates, check CI builds the APK | |
| 18 Oct | Deploy to Render, set `ANDROID_API_BASE`, test on 3 different phones | |
| 18 to 24 Oct | Merge Minh's existing code / ideas; tune difficulty with friends (aim: average player survives 6 to 9 rounds) | |
| 22 Oct | Proof-read every tip in `web/js/lessons.js` against the sources | |
| 25 Oct | Record a 60 to 90 s demo video (phone screen recording + booth screen) | |
| 27 Oct | Prepare submission text (below), screenshots, APK, repo link | |
| 29 Oct | **Submit** (a day early, in case the form misbehaves) | |
| 4 Nov | Reset scores, charge devices, print QR poster, rehearse pitch | |

## Submission text (draft)

**Title:** Top End Survivor

**Summary:** A web and Android micro-game that teaches Northern Territory safety (crocodiles, stingers, cyclones, floods, heat, snakes, bushfire) in five-second challenges. Every mini-game is based on official NT advice and links to its source. It works offline for remote communities, syncs a live leaderboard, and turns gameplay into data: a booth dashboard shows which safety rules people get wrong most often.

**Tech:** Vanilla JavaScript PWA (no build step), SVG art drawn in code, service-worker offline cache, Node 22 + Express API, SQLite, server-side score validation, Capacitor Android app, GitHub Actions CI (API tests, headless browser test that plays all 10 games, APK build), Docker deploy.

**Links:** live game, booth screen, GitHub repo, APK, demo video.

## Booth setup (5 Nov)

- Laptop or TV: open `https://<host>/booth` full screen (F11). It shows the QR, top 10 today, and the live "what's catching people out" chart.
- A tablet or phone on a stand running `https://<host>/?kiosk=1` for people without their own phone.
- Morning of: reset scores (`POST /api/admin/reset`, see README).
- **Backup if the internet fails:** run `npm start` on the laptop and use the laptop's hotspot; the game also works fully offline on any phone that loaded it once.
- Bring: chargers, power board, a printed A4 QR code, a phone with the APK installed.

## 2-minute pitch (outline)

1. **Hook (15 s):** hand the judge a phone. "You've got five seconds. Don't get eaten."
2. **Problem (20 s):** newcomers and tourists don't read safety PDFs; the Top End's hazards are seasonal and unfamiliar.
3. **Solution (30 s):** ten mini-games, each one an official rule. Fail, and you learn the real rule with its source.
4. **Tech (30 s):** one codebase for web, PWA and Android; offline first with a sync outbox; server re-scores every run so the leaderboard can't be faked; CI plays every game automatically.
5. **Data (15 s):** point at the booth chart: "Right now 70% of people are failing the stinger question. That's the insight a health department would want."
6. **Next (10 s):** more hazards (Irukandji, lightning, remote breakdowns), Aboriginal languages, partner with NT Gov / tourism.

## Likely judge questions

- *Is the advice accurate?* Every tip links to an official source; the Safety tips screen lists them all.
- *How does it scale?* Stateless API behind a load balancer; SQLite can be swapped for Postgres in `server/src/db.js`; offline outbox smooths load spikes.
- *How do you stop cheating?* The server ignores the client score and recomputes it from per-round results, checks timing and the 3-life rule, and rate-limits writes.
- *Privacy?* No accounts, no personal data. A random device id is used only to let you attach a name to your own run; the CSV export excludes it.
- *Why not Unity/Flutter?* No build step means the whole team can edit content, the game loads instantly on slow connections, and the same files become the Android app.
