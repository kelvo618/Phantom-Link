# Phantom Link (core build)

## What works
Email/password sign-up with unique usernames, login/logout, password reset, email verification email, user search by username, real-time one-to-one chat (send, delete own), unread counters, online/last-seen presence, installable PWA with offline app shell, locked-down Firestore rules.

## Not built yet
Profile editing/photos, replies/edit/reactions/forwarding, read receipts, typing indicators, media + voice messages (Storage), WebRTC voice/video calls with TURN, FCM push (needs a Cloud Function + VAPID key), groups, contacts/blocking, statuses, call history, settings/themes, E2E encryption.

## Setup
1. console.firebase.google.com → Add project → Add a Web app → copy config into `firebase.js`.
2. Build → Authentication → Sign-in method → enable Email/Password.
3. Build → Firestore Database → Create (production mode) → Rules tab → paste `firestore.rules` → Publish.
4. Authentication → Settings → Authorized domains → add your host (e.g. `youruser.github.io`).

## Run locally
`npx serve .` (or `python3 -m http.server`) and open the URL. Service workers need localhost or HTTPS.

## Deploy to GitHub Pages
Push the folder to a repo → Settings → Pages → deploy from `main` / root. All paths are relative, so project sub-paths work.

## Test
Open two browsers (one private window), register two accounts, search the other's username, and chat. Watch messages and online status update live.
