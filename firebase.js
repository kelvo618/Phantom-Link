import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvuP7zQJZEQgvBhBELCf9wbnA-kvhqo54",
  authDomain: "phantom-link-b316c.firebaseapp.com",
  projectId: "phantom-link-b316c",
  storageBucket: "phantom-link-b316c.firebasestorage.app",
  messagingSenderId: "231578498847",
  appId: "1:231578498847:web:c523a0256ec3051ea6222a",
  measurementId: "G-MNKZ46B7YP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { localCache: persistentLocalCache() });
