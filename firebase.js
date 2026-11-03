// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAvuP7zQJZEQgvBhBELCf9wbnA-kvhqo54",
  authDomain: "phantom-link-b316c.firebaseapp.com",
  projectId: "phantom-link-b316c",
  storageBucket: "phantom-link-b316c.firebasestorage.app",
  messagingSenderId: "231578498847",
  appId: "1:231578498847:web:c523a0256ec3051ea6222a",
  measurementId: "G-MNKZ46B7YP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
