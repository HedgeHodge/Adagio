
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

function getFirebaseServices() {
  if (typeof window === 'undefined') {
    console.warn("[Firebase Services] Attempted to access Firebase services on server-side. Returning dummy objects.");
    return { auth: {} as Auth, db: {} as Firestore, analytics: undefined };
  }

  if (!app) {
    if (getApps().length === 0) {
      if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
        try {
          app = initializeApp(firebaseConfig);
          console.log('[Firebase Diagnostics] Firebase app initialized successfully.');
        } catch (error) {
          console.error("[Firebase Diagnostics] Firebase app initialization error:", error);
          return { auth: {} as Auth, db: {} as Firestore, analytics: undefined };
        }
      } else {
        app = getApps()[0]!;
        console.log('[Firebase Diagnostics] Firebase app was already initialized.');
      }
    } else {
      const missingKeys: string[] = [];
      if (!firebaseConfig.apiKey) missingKeys.push("NEXT_PUBLIC_FIREBASE_API_KEY");
      if (!firebaseConfig.authDomain) missingKeys.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
      if (!firebaseConfig.projectId) missingKeys.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");

      console.error(`[Firebase Diagnostics] Critical Firebase configuration missing: ${missingKeys.join(', ')}. Firebase App cannot be initialized.`);
      return { auth: {} as Auth, db: {} as Firestore, analytics: undefined };
    }
  }

  if (!app) {
    console.warn("[Firebase Diagnostics] Firebase App is not initialized. Returning dummy services.");
    return { auth: {} as Auth, db: {} as Firestore, analytics: undefined };
  }

    const auth = getAuth(app);
    const db = getFirestore(app);
    let analytics: Analytics | undefined = undefined;

    isSupported().then((supported) => {
      if (supported && firebaseConfig.measurementId) {
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
    analytics = undefined;
  }
} else {
  // Server-side or non-browser environment
  analytics = undefined;
}

  return { auth, db, analytics };
}

export { getFirebaseServices };
