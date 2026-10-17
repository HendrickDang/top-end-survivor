# Android app download

To let people download the Android app from the game (`/app.apk`, shown on the install sheet):

1. Open the latest green run on GitHub > Actions > CI.
2. Download the `top-end-survivor-debug-apk` artifact and unzip it.
3. Rename `app-debug.apk` to `top-end-survivor.apk` and put it in this folder.
4. Commit and push. The server serves it automatically.
