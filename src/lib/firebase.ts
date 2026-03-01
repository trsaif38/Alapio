import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Helper to strip quotes from env variables
const cleanEnv = (val: any) => typeof val === 'string' ? val.replace(/['"]+/g, '') : val;

const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  databaseURL: cleanEnv(import.meta.env.VITE_FIREBASE_DATABASE_URL),
};

// Debug config (only logs keys, not values for security)
if (import.meta.env.DEV) {
  console.log("Firebase Config Keys present:", Object.keys(firebaseConfig).filter(k => !!(firebaseConfig as any)[k]));
}

// Check if config is valid
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "" &&
  firebaseConfig.projectId
);

let app: any;
if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

export const auth = isFirebaseConfigured ? getAuth(app) : null as any;

// Use initializeFirestore with long polling for better compatibility in sandboxed environments
export const db = isFirebaseConfigured ? initializeFirestore(app, {
  experimentalForceLongPolling: true,
}) : null as any;

export const storage = isFirebaseConfigured ? getStorage(app) : null as any;
export const rtdb = isFirebaseConfigured ? getDatabase(app) : null as any;
export const googleProvider = new GoogleAuthProvider();

// Enable offline persistence
if (isFirebaseConfigured && typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a a time.
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn('Firestore persistence failed: Browser not supported');
    }
  });
}
