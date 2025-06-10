
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics } from "firebase/analytics";

// Firebase configuration should be sourced from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | undefined;

// Initialize Firebase App
// Check if Firebase has already been initialized
if (getApps().length === 0) {
  if (firebaseConfig.apiKey) { // Ensure config is present before initializing
    app = initializeApp(firebaseConfig);
  } else {
    console.error("Firebase API key is missing. Firebase App could not be initialized.");
    // Throw an error or handle appropriately if app cannot be initialized
    // For now, we'll let it proceed, but app-dependent services will fail.
    // A better approach might be to prevent app usage if config is missing.
  }
} else {
  app = getApps()[0]!;
}

// Initialize other Firebase services if the app was initialized
// @ts-ignore app might be uninitialized if apiKey was missing
if (app) {
  auth = getAuth(app);
  db = getFirestore(app);

  if (typeof window !== 'undefined') {
    try {
      analytics = getAnalytics(app);
    } catch (error) {
      console.error("Firebase Analytics initialization error:", error);
    }
  }
} else {
  // Fallback for auth and db if app is not initialized
  // This is to prevent runtime errors if app initialization failed
  // @ts-ignore
  auth = {} as Auth;
  // @ts-ignore
  db = {} as Firestore;
  console.warn("Firebase services (Auth, Firestore, Analytics) could not be initialized because Firebase App failed to initialize.")
}

export { app, auth, db, analytics };
