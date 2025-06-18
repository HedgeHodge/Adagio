
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase'; 
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'; 
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface AuthContextType {
  currentUser: User | null;
  isPremium: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  upgradeUserToPremium: () => Promise<void>;
  togglePremiumStatus: () => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>; 
  signInWithEmailPassword: (email: string, password: string) => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchUserPremiumStatus = async (userId: string) => {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists() && docSnap.data()?.isPremium === true) {
      setIsPremium(true);
    } else {
      setIsPremium(false);
      // If user doc exists but no isPremium field, or it's false, ensure it's set to false
      if (docSnap.exists() && docSnap.data()?.isPremium !== true) {
         await setDoc(userDocRef, { isPremium: false }, { merge: true });
      }
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        // Check if user doc exists, if not, create it
        const userDocRef = doc(db, 'users', result.user.uid);
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          await setDoc(userDocRef, { 
            isPremium: false, 
            email: result.user.email, 
            displayName: result.user.displayName, 
            photoURL: result.user.photoURL,
            createdAt: Timestamp.now() 
          }, { merge: true });
           setIsPremium(false);
        }
        // onAuthStateChanged will handle setting current user and fetching premium status
      }
    } catch (error: any) {
      if (!isMobile) {
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
          console.info("Google sign-in popup cancelled/closed by user.");
        } else {
          console.error("Error signing in with Google (popup):", error);
          toast({ title: "Google Sign-In Error", description: error.message || "An error occurred.", variant: "destructive" });
        }
      } else {
         console.error("Error initiating Google sign-in (redirect):", error);
         toast({ title: "Google Sign-In Error", description: error.message || "An error occurred.", variant: "destructive" });
      }
      // setLoading(false); // Re-throw to be caught by modal or calling UI
      throw error;
    }
    // setLoading is primarily handled by onAuthStateChanged
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set currentUser to null and loading to false.
      // isPremium will be set to false by onAuthStateChanged.
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Sign-Out Error",
        description: "An error occurred while signing out.",
        variant: "destructive",
      });
    }
  };

  const upgradeUserToPremium = async () => {
    if (!currentUser) {
      toast({ title: "Not signed in", description: "You need to be signed in to upgrade.", variant: "destructive" });
      return;
    }
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, { isPremium: true, lastUpdated: Timestamp.now() }, { merge: true });
      setIsPremium(true);
      toast({ title: "Upgrade Successful!", description: "You now have access to premium features." });
    } catch (error) {
      console.error("Error upgrading to premium:", error);
      toast({ title: "Upgrade Failed", description: "Could not upgrade to premium. Please try again.", variant: "destructive" });
    }
  };

  const togglePremiumStatus = async () => {
    if (!currentUser) {
      toast({ title: "Not signed in", description: "You need to be signed in to toggle premium status.", variant: "destructive" });
      return;
    }
    const newPremiumStatus = !isPremium;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, { isPremium: newPremiumStatus, lastUpdated: Timestamp.now() }, { merge: true });
      setIsPremium(newPremiumStatus);
      toast({ title: "Premium Status Toggled", description: `You are now on the ${newPremiumStatus ? 'Premium' : 'Free'} tier.` });
    } catch (error) {
      console.error("Error toggling premium status:", error);
      toast({ title: "Toggle Failed", description: "Could not toggle premium status. Please try again.", variant: "destructive" });
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDocRef, { 
        isPremium: false, 
        email: userCredential.user.email, 
        createdAt: Timestamp.now() 
      }, { merge: true });
      // setIsPremium(false); // onAuthStateChanged will call fetchUserPremiumStatus
      toast({ title: "Account Created!", description: "Welcome to Adagio!" });
      // onAuthStateChanged will set user and loading status
    } catch (error: any) {
      console.error("Error signing up with email/password:", error);
      let message = "An unexpected error occurred during sign up.";
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email address is already in use.';
      } else if (error.code === 'auth/weak-password') {
        message = 'The password is too weak.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'The email address is not valid.';
      }
      toast({ title: "Sign Up Failed", description: message, variant: "destructive" });
      // setLoading(false); // Re-throw for modal to handle
      throw error; 
    }
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle user state and premium status.
    } catch (error: any) {
      console.error("Error signing in with email/password:", error);
      let message = "Failed to sign in. Please check your email and password.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-email') {
        message = 'Invalid email or password.';
      }
      toast({ title: "Sign In Failed", description: message, variant: "destructive" });
      // setLoading(false); // Re-throw for modal to handle
      throw error;
    }
  };

  useEffect(() => {
    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
        console.warn("[AuthContext] Firebase Auth not fully initialized yet, delaying onAuthStateChanged listener setup.");
        const timer = setTimeout(() => {
            if (auth && typeof auth.onAuthStateChanged === 'function') {
                const unsubscribe = onAuthStateChanged(auth, async (user) => {
                    setCurrentUser(user);
                    if (user) {
                      await fetchUserPremiumStatus(user.uid);
                    } else {
                      setIsPremium(false);
                    }
                    setLoading(false);
                });
                return () => unsubscribe();
            } else {
                 setLoading(false);
                 console.error("[AuthContext] Firebase Auth failed to initialize properly after delay.");
            }
        }, 1000);
        return () => clearTimeout(timer);
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserPremiumStatus(user.uid);
      } else {
        setIsPremium(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Process redirect result for Google Sign-In (mobile)
    // setLoading(true) here could interfere if onAuthStateChanged already ran.
    // We rely on onAuthStateChanged to set initial loading state.
    if (auth && typeof auth.onAuthStateChanged === 'function') { // Ensure auth is ready
      getRedirectResult(auth)
        .then(async (result) => {
          if (result && result.user) {
            // User signed in via redirect
            // Ensure user document exists
            const userDocRef = doc(db, 'users', result.user.uid);
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
                await setDoc(userDocRef, { 
                    isPremium: false, 
                    email: result.user.email, 
                    displayName: result.user.displayName, 
                    photoURL: result.user.photoURL,
                    createdAt: Timestamp.now() 
                }, { merge: true });
            }
            // onAuthStateChanged should pick up this user if not already, 
            // and fetchUserPremiumStatus will be called there.
            console.log("Google sign-in redirect processed for user:", result.user.displayName);
          }
          // No specific setLoading(false) here; onAuthStateChanged handles overall loading state.
        })
        .catch((error) => {
          console.error("Error processing Google sign-in redirect:", error);
          if (error.code !== 'auth/redirect-cancelled' && error.code !== 'auth/redirect-operation-pending') {
            toast({ title: "Google Sign-In Error", description: error.message || "An error occurred during redirect.", variant: "destructive" });
          }
          // No specific setLoading(false) here.
        });
    }
  }, [isMobile, toast]); // Rerun if isMobile changes, though auth readiness is more critical

  const value = {
    currentUser,
    isPremium,
    loading,
    signInWithGoogle,
    signOut,
    upgradeUserToPremium,
    togglePremiumStatus,
    signUpWithEmailPassword, 
    signInWithEmailPassword, 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

    