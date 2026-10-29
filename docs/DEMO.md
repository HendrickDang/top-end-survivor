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

**Summary:** A web and Android micro-game that teaches Northern Territory safety (crocodiles, stingers, cyclones, floods, dust storms, heat, sun, mozzies, lightning, snakes, bushfire) in five-second challenges. Every mini-game is based on official advice and links to its source. Play Classic, the Daily Challenge, or a Journey from Darwin to Uluru with each region's own hazards and landscapes, and earn coins to unlock 7 cheeky Territory Characters. It works offline for remote communities, syncs a live leaderboard, and turns gameplay into data: a booth dashboard shows which safety rules people get wrong most often.

**Tech:** Vanilla JavaScript PWA (no build step), SVG art drawn in code, service-worker offline cache, Node 22 + Express API, SQLite, server-side score validation, Capacitor Android app, GitHub Actions CI (API tests, headless browser test that plays all 19 mini-games and every mode, 200-player load test, APK build), Docker deploy.

**Links:** live game, booth screen, GitHub repo, APK, demo video.

## Booth setup (5 Nov)

- **People's Choice:** when the committee gives you the voting link (even on the morning), open `https://<host>/booth?vote=<link>&token=<ADMIN_TOKEN>` on the booth laptop once. No code change: the link is saved on the server, and within 30 seconds the booth shows a "Vote for Team CAP003" QR; phones and shared devices show it at their next game over. The ADMIN_TOKEN is in Render > Environment: copy it into your phone notes before the day. If the server restarts (free plan), open that address again.
- **Run Booth Battles in the 10:45 to 11:45 showcase:** press `B` on the booth laptop, invite everyone around the table to scan, press Enter. One battle takes about a minute: run one every few minutes so there is always a crowd and a podium on the big screen.
- **Shared phones and tablets:** open `/?kiosk=1` on them. Every visitor gets the gesture hints, the "local or visitor?" question, and big "Take it home" and "Vote for us" QR codes at game over.
- **Kids or older visitors:** turn on 🐢 Relaxed mode on the menu (slower rounds, bigger text).
- **Busy Wi-Fi:** if lots of phones share the venue Wi-Fi, set `WRITE_LIMIT=1000` on Render the day before.

- **Attract mode is automatic:** after 45 s with no new players the booth shows a self-playing demo and a giant QR. Press `A` on the booth laptop to toggle it by hand.
- **Journey for people who stay longer:** "How far can you get from Darwin? Nobody has reached Uluru yet today." Reaching Uluru unlocks a badge.
- **Coins and characters:** tell players their coins are saved on their phone; the next character is only a game or two away, which brings them back.
- **Push the Daily Challenge at the booth:** "Same 10 hazards for everyone today. Can you beat the top score?" Unlimited tries means people keep coming back to the stand during the day.
- **Judge card:** print an A6 card with a QR to `https://<host>/?judge=1` ("Judges: 60-second tour") and leave it on the table.
- **Before the day:** run the load test against the deployed server, then `DELETE /api/admin/loadtest` and reset scores. Quote the numbers in the pitch.
- **Android QR:** put the APK in `server/downloads/top-end-survivor.apk` (see the README in that folder) and a second QR appears on the booth screen.

- Laptop or TV: open `https://<host>/booth` full screen (F11). It shows the QR, top 10 today, and the live "what's catching people out" chart.
- A tablet or phone on a stand running `https://<host>/?kiosk=1` for people without their own phone.
- Morning of: reset scores (`POST /api/admin/reset`, see README).
- **Backup if the internet fails:** run `npm start` on the laptop and use the laptop's hotspot; the game also works fully offline on any phone that loaded it once.
- Bring: chargers, power board, a printed A4 QR code, a phone with the APK installed.

## 2-minute pitch (outline)

1. **Hook (15 s), Minh:** hand the judge a phone. "You've got five seconds. Don't get eaten."
2. **Problem (20 s), Vy:** newcomers and tourists don't read safety PDFs; the Top End's hazards are seasonal and unfamiliar.
3. **Solution (30 s), Vy:** 18 mini-games and 2 bosses, each one an official rule, on a road trip from Darwin to Uluru. Fail, and a cartoon of your character shows exactly what went wrong, then you learn the real rule with its source.
4. **Tech (30 s), Hendrick:** one codebase for web, PWA and Android; offline first with a sync outbox; server re-scores every run so the leaderboard can't be faked; CI plays every game automatically.
5. **Data (15 s), Hendrick:** point at the booth chart: "Right now 70% of people are failing the stinger question. That's the insight a health department would want."
6. **Next (10 s), Vy:** more hazards (Irukandji, remote breakdowns, buffalo), more Journey stops (Tiwi Islands, Tennant Creek), Aboriginal languages, partner with NT Gov / tourism.

Minh keeps the judge playing while Hendrick and Vy talk, and steps in with gameplay and testing answers.

## Likely judge questions

Who answers first: accuracy and design questions, Vy; testing and difficulty, Minh; tech, scale, cheating and data, Hendrick.

- *Is the advice accurate?* Every tip links to an official source; the Safety tips screen lists them all.
- *Where is the music from?* It was AI-generated for the team by Minh; all art and characters are drawn in our own code.
- *How does it scale?* We load-tested it: 500 players finishing games plus 5 full Booth Battles of 40 phones racing at once, 5,615 requests, zero errors, 95% of requests under about 150 ms on a small 2-core machine. The server re-scores every run, SQLite is swappable for Postgres in `server/src/db.js`, and the offline outbox smooths spikes. Honest limit: live battles sit in one server's memory, so going multi-server means moving them to Redis; that's a small, contained change.
- *Does it actually teach anything?* Show the booth's learning panel: survival rate the first time people see a hazard vs. later tries, and the optional before/after quick check.
- *Who would use this after the competition?* NT schools (open `/class` and show the teacher dashboard), and agencies: the "locals vs visitors" panel shows which rules newcomers and tourists miss, which is what NT Government and Tourism NT campaigns need to know.
- *Isn't it too easy?* (Minh) Turn on 🔥 Hard mode: 40% less time, no hints, shuffled answers, its own leaderboard. Then hand them Roos at Dusk, the one-button rhythm runner: hold to brake, roos hop across on the beat, and braking for the decoys makes you miss the roadhouse.
- *Is it accessible?* Gesture hints for first-timers, Relaxed mode (more time, bigger text), big touch targets, reduced-motion support, and a Real help screen with checked emergency numbers.
- *How do you stop cheating?* The server ignores the client score and recomputes it from per-round results, checks timing and the 3-life rule, and rate-limits writes.
- *Privacy?* No accounts, no personal data. A random device id is used only to let you attach a name to your own run; the CSV export excludes it.
- *Why not Unity/Flutter?* No build step means the whole team can edit content, the game loads instantly on slow connections, and the same files become the Android app.
