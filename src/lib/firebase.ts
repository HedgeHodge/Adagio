
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics, isSupported } from "firebase/analytics";

// Firebase configuration sourced from environment variables.
// IMPORTANT: 
// 1. These variables MUST be prefixed with NEXT_PUBLIC_ to be available on the client-side.
// 2. They MUST be defined in a .env.local file in the root of your project.
// 3. You MUST restart your development server after creating or modifying .env.local.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
};

let app: FirebaseApp | undefined = undefined;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | undefined;

// Ensure Firebase is initialized only on the client-side
if (typeof window !== 'undefined') {
  // Diagnostic log to show what environment variables are being read on the client
  console.log('[Firebase Diagnostics] Attempting to initialize Firebase. Environment variable values:');
  console.log('[Firebase Diagnostics] NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT SET');
  console.log('[Firebase Diagnostics] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'NOT SET');
  console.log('[Firebase Diagnostics] NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET');
  console.log('[Firebase Diagnostics] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'SET' : 'NOT SET');
  console.log('[Firebase Diagnostics] NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'SET' : 'NOT SET');
  console.log('[Firebase Diagnostics] NEXT_PUBLIC_FIREBASE_APP_ID:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'SET' : 'NOT SET');
  console.log('[Firebase Diagnostics] NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:', process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ? 'SET (Optional)' : 'NOT SET (Optional)');


  if (getApps().length === 0) {
    // Check if essential config values are present
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      try {
        app = initializeApp(firebaseConfig);
        console.log('[Firebase Diagnostics] Firebase app initialized successfully.');
      } catch (error) {
        console.error("[Firebase Diagnostics] Firebase app initialization error:", error);
        // To prevent downstream errors, ensure app is undefined if init fails
        app = undefined;
      }
    } else {
      console.error("[Firebase Diagnostics] Firebase API key or Project ID is missing. Ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are set in your .env.local file and that you've restarted your development server. Firebase App cannot be initialized.");
      app = undefined; // Ensure app is undefined
    }
  } else {
    app = getApps()[0]!; // Use the already initialized app
    console.log('[Firebase Diagnostics] Firebase app was already initialized.');
  }

  if (app) {
    auth = getAuth(app);
    db = getFirestore(app);
    isSupported().then((supported) => {
      if (supported && firebaseConfig.measurementId) { // Also check if measurementId is present
        analytics = getAnalytics(app);
        console.log('[Firebase Diagnostics] Firebase Analytics initialized.');
      } else if (supported && !firebaseConfig.measurementId) {
        // console.log("[Firebase Diagnostics] Firebase Analytics measurementId is missing, Analytics not initialized.");
      } else if (!supported) {
        console.warn("[Firebase Diagnostics] Firebase Analytics is not supported in this environment.");
      }
    }).catch(error => {
      console.error("[Firebase Diagnostics] Error checking Firebase Analytics support:", error);
    });
  } else {
    console.warn("[Firebase Diagnostics] Firebase App is not initialized. Firebase services (Auth, Firestore, Analytics) will not be available.");
    // Assign fallback typed objects to prevent runtime errors if accessed,
    // though ideally consumers should check if services are truly available.
    auth = {} as Auth; // Fallback
    db = {} as Firestore; // Fallback
    analytics = undefined;
  }
} else {
  // Server-side or non-browser environment
  // console.log('[Firebase Diagnostics] Firebase initialization skipped (not in browser).');
  // Assign fallback typed objects
  auth = {} as Auth; // Fallback
  db = {} as Firestore; // Fallback
  analytics = undefined;
}

export { app, auth, db, analytics };
