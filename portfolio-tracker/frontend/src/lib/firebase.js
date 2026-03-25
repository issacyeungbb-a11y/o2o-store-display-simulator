import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDbRqRb0_XYNZ3FtwWMvj1yQmjZxFRgdQ8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0762394242.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0762394242",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0762394242.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "647082742458",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:647082742458:web:4bc014bf8f29907065a883",
};

const requiredKeys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];

export const firebaseReady = requiredKeys.every((key) => Boolean(firebaseConfig[key]));
export const collectionName = import.meta.env.VITE_FIREBASE_COLLECTION || "portfolio_assets_public";
export const aiEndpoint = import.meta.env.VITE_FIREBASE_AI_ENDPOINT || "";

let app = null;
let db = null;

if (firebaseReady) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export { app, db };
