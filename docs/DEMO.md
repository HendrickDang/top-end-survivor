# Code Fair plan: Top End Survivor (CAP003)

- **Submission deadline:** 30 Oct 2026, end of day, via the "Submit Here" link in the registration email (not by email).
- **Competition day:** 5 Nov 2026, 08:30 to 17:00, Festival Learning Space 1.11/1.12, Danala, CDU Darwin.
- **Judged on:** innovation, functionality, usability, scalability (and similar).

## Team roles

| Person | Owns | Also helps with |
|---|---|---|
| Van Hoi (Hendrick) Dang | Tech lead: GitHub, deployment, merging code, booth analytics, submission | Proof-reading tips, pitch (tech + data) |
| Le Nhat Minh Tran (Minh) | Tech lead (with Hendrick): phone testing, difficulty tuning, APK checks, demo-day devices | Merging his earlier game ideas, pitch (hook + live demo) |
| Phuong Vy Ho (Vy) | Video and visuals: demo video, screenshots, QR poster, art feedback | Tip wording, pitch (problem + solution + next steps) |

## Timeline

| By | Task | Who |
|---|---|---|
| 17 Oct | Push repo to GitHub, add Minh and Vy as collaborators, check CI builds the APK | Hendrick |
| 18 Oct | Deploy to Render, set `ANDROID_API_BASE`, push again | Hendrick |
| 18 Oct | Test the live game and the APK on at least 3 different phones (Android + iPhone), log bugs as GitHub issues | Minh |
| 18 to 24 Oct | Tune difficulty with friends (aim: average player survives 6 to 9 rounds); share any useful parts of his earlier code | Minh |
| 18 to 24 Oct | Review and merge Minh's changes, fix logged bugs | Hendrick |
| 20 Oct | Visual review of every mini-game (anything unclear, ugly or too small on a phone); list fixes | Vy |
| 22 Oct | Proof-read every tip in `web/js/lessons.js` against the sources | Hendrick (Vy checks the wording reads well) |
| 25 Oct | Record a 60 to 90 s demo video (phone screen recording + booth screen) | Vy (Minh plays, Hendrick runs the booth screen) |
| 27 Oct | Submission text (below) and repo link | Hendrick |
| 27 Oct | Screenshots for the submission | Vy |
| 27 Oct | Download the final APK from GitHub Actions and test-install it | Minh |
| 29 Oct | **Submit** (a day early, in case the form misbehaves) | Hendrick |
| 3 Nov | Print the A4 QR poster and table sign | Vy |
| 4 Nov | Reset scores, charge devices, install the APK on a spare phone, pack the booth kit | Minh |
| 4 Nov | Full pitch rehearsal with a timer, twice | All three |

## Submission text (draft)

**Title:** Top End Survivor

**Summary:** A web and Android micro-game that teaches Northern Territory safety (crocodiles, stingers, cyclones, floods, heat, snakes, bushfire) in five-second challenges. Every mini-game is based on official NT advice and links to its source. It works offline for remote communities, syncs a live leaderboard, and turns gameplay into data: a booth dashboard shows which safety rules people get wrong most often.

**Tech:** Vanilla JavaScript PWA (no build step), SVG art drawn in code, service-worker offline cache, Node 22 + Express API, SQLite, server-side score validation, Capacitor Android app, GitHub Actions CI (API tests, headless browser test that plays all 10 games, APK build), Docker deploy.

**Links:** live game, booth screen, GitHub repo, APK, demo video.

## Booth setup (5 Nov)

- **Attract mode is automatic:** after 45 s with no new players the booth shows a self-playing demo and a giant QR. Press `A` on the booth laptop to toggle it by hand.
- **Push the Daily Challenge at the booth:** "Same 10 hazards for everyone today. Can you beat the top score?" Unlimited tries means people keep coming back to the stand during the day.
- **Android QR:** put the APK in `server/downloads/top-end-survivor.apk` (see the README in that folder) and a second QR appears on the booth screen.

- Laptop or TV: open `https://<host>/booth` full screen (F11). It shows the QR, top 10 today, and the live "what's catching people out" chart.
- A tablet or phone on a stand running `https://<host>/?kiosk=1` for people without their own phone.
- Morning of: reset scores (`POST /api/admin/reset`, see README).
- **Backup if the internet fails:** run `npm start` on the laptop and use the laptop's hotspot; the game also works fully offline on any phone that loaded it once.
- Bring: chargers, power board, a printed A4 QR code, a phone with the APK installed.

## 2-minute pitch (outline)

1. **Hook (15 s), Minh:** hand the judge a phone. "You've got five seconds. Don't get eaten."
2. **Problem (20 s), Vy:** newcomers and tourists don't read safety PDFs; the Top End's hazards are seasonal and unfamiliar.
3. **Solution (30 s), Vy:** ten mini-games, each one an official rule. Fail, and you learn the real rule with its source.
4. **Tech (30 s), Hendrick:** one codebase for web, PWA and Android; offline first with a sync outbox; server re-scores every run so the leaderboard can't be faked; CI plays every game automatically.
5. **Data (15 s), Hendrick:** point at the booth chart: "Right now 70% of people are failing the stinger question. That's the insight a health department would want."
6. **Next (10 s), Vy:** more hazards (Irukandji, lightning, remote breakdowns), Aboriginal languages, partner with NT Gov / tourism.

Minh keeps the judge playing while Hendrick and Vy talk, and steps in with gameplay and testing answers.

## Likely judge questions

Who answers first: accuracy and design questions, Vy; testing and difficulty, Minh; tech, scale, cheating and data, Hendrick.

- *Is the advice accurate?* Every tip links to an official source; the Safety tips screen lists them all.
- *How does it scale?* Stateless API behind a load balancer; SQLite can be swapped for Postgres in `server/src/db.js`; offline outbox smooths load spikes.
- *How do you stop cheating?* The server ignores the client score and recomputes it from per-round results, checks timing and the 3-life rule, and rate-limits writes.
- *Privacy?* No accounts, no personal data. A random device id is used only to let you attach a name to your own run; the CSV export excludes it.
- *Why not Unity/Flutter?* No build step means the whole team can edit content, the game loads instantly on slow connections, and the same files become the Android app.
