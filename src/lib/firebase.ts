
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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, // e.g., NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // e.g., NEXT_PUBLIC_FIREBASE_PROJECT_ID="my-project"
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
  if (getApps().length === 0) {
    // Check if essential config values are present
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      try {
        app = initializeApp(firebaseConfig);
      } catch (error) {
        console.error("Firebase app initialization error:", error);
        // To prevent downstream errors, ensure app is undefined if init fails
        app = undefined;
      }
    } else {
      console.error("Firebase API key or Project ID is missing. Ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are set in your .env.local file and that you've restarted your development server. Firebase App cannot be initialized.");
      app = undefined; // Ensure app is undefined
    }
  } else {
    app = getApps()[0]!; // Use the already initialized app
  }

  if (app) {
    auth = getAuth(app);
    db = getFirestore(app);
    isSupported().then((supported) => {
      if (supported && firebaseConfig.measurementId) { // Also check if measurementId is present
        analytics = getAnalytics(app);
      } else if (supported && !firebaseConfig.measurementId) {
        // console.log("Firebase Analytics measurementId is missing, Analytics not initialized.");
      } else if (!supported) {
        console.warn("Firebase Analytics is not supported in this environment.");
      }
    }).catch(error => {
      console.error("Error checking Firebase Analytics support:", error);
    });
  } else {
    console.warn("Firebase App is not initialized. Firebase services (Auth, Firestore, Analytics) will not be available.");
    // Assign fallback typed objects to prevent runtime errors if accessed,
    // though ideally consumers should check if services are truly available.
    auth = {} as Auth; // Fallback
    db = {} as Firestore; // Fallback
    analytics = undefined;
  }
} else {
  // Server-side or non-browser environment
  // Assign fallback typed objects
  auth = {} as Auth; // Fallback
  db = {} as Firestore; // Fallback
  analytics = undefined;
}

export { app, auth, db, analytics };
