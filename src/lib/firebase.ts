
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics, isSupported } from "firebase/analytics";

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

let app: FirebaseApp | undefined = undefined; // Initialize as undefined
let auth: Auth;
let db: Firestore;
let analytics: Analytics | undefined;

if (typeof window !== 'undefined') { // Ensure Firebase is initialized only on the client-side or where appropriate
  if (getApps().length === 0) {
    if (firebaseConfig.apiKey) {
      try {
        app = initializeApp(firebaseConfig);
      } catch (error) {
        console.error("Firebase app initialization error:", error);
      }
    } else {
      console.error("Firebase API key is missing. Firebase App could not be initialized.");
    }
  } else {
    app = getApps()[0]!;
  }

  if (app) {
    auth = getAuth(app);
    db = getFirestore(app);
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      } else {
        console.warn("Firebase Analytics is not supported in this environment.");
      }
    }).catch(error => {
      console.error("Error checking Firebase Analytics support:", error);
    });
  } else {
    // @ts-ignore
    auth = {} as Auth;
    // @ts-ignore
    db = {} as Firestore;
    console.warn("Firebase services (Auth, Firestore, Analytics) could not be initialized because Firebase App failed to initialize.");
  }
} else {
  // Fallback for server-side or non-browser environments if direct initialization is attempted
  // @ts-ignore
  auth = {} as Auth;
  // @ts-ignore
  db = {} as Firestore;
}


export { app, auth, db, analytics };
