
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'; 
import { useToast } from '@/hooks/use-toast';

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
  isPremiumSplashVisible: boolean;
  showPremiumSplash: () => void;
  hidePremiumSplash: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isPremiumSplashVisible, setIsPremiumSplashVisible] = useState(false);

  const showPremiumSplash = () => setIsPremiumSplashVisible(true);
  const hidePremiumSplash = () => setIsPremiumSplashVisible(false);

  const handleUser = useCallback(async (user: User | null) => {
    setLoading(true);
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists() && docSnap.data()) {
        setIsPremium(docSnap.data().isPremium === true);
      } else {
        await setDoc(userDocRef, { 
          isPremium: false, 
          email: user.email, 
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: Timestamp.now() 
        }, { merge: true });
        setIsPremium(false);
      }
      setCurrentUser(user);
    } else {
      setCurrentUser(null);
      setIsPremium(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Use local persistence to keep the user signed in across sessions (including offline)
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        const unsubscribe = onAuthStateChanged(auth, handleUser);
        return () => unsubscribe();
      })
      .catch((err) => {
        console.error("Firebase persistence error:", err);
        // Fallback or just continue with default persistence
        const unsubscribe = onAuthStateChanged(auth, handleUser);
        return () => unsubscribe();
      });
  }, [handleUser]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // The onAuthStateChanged listener will handle user creation/update.
      toast({
        title: "Signed In Successfully",
        description: `Welcome back, ${result.user.displayName || result.user.email}!`,
      });
    } catch (error: any) {
        console.error("Error during Google sign-in:", error);
        let title = "Google Sign-In Error";
        let description = "An unknown error occurred during sign-in. Please try again.";

        if (error.code === 'auth/unauthorized-domain') {
          title = "Domain Not Authorized";
          const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'your app domain';
          description = `Sign-in from this domain (${currentHostname}) is not authorized. Please add it to the "Authorized domains" list in your Firebase project's Authentication settings.`;
        } else if (error.code === 'auth/account-exists-with-different-credential') {
          title = "Account Exists";
          description = "An account already exists with this email, but with a different sign-in method (e.g., password). Please sign in using your original method.";
        } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            title = "Sign-in Cancelled";
            description = "You closed the sign-in window before completing the process.";
        } else {
            description = error.message || description;
        }

        toast({ title, description, variant: "destructive" });
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
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
      showPremiumSplash();
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
      if (newPremiumStatus) {
        showPremiumSplash();
      } else {
        toast({ title: "Premium Status Toggled", description: `You are now on the Free tier.` });
      }
    } catch (error) {
      console.error("Error toggling premium status:", error);
      toast({ title: "Toggle Failed", description: "Could not toggle premium status. Please try again.", variant: "destructive" });
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
    toast({ title: "Account Created!", description: "Welcome to Pomodoro Flow!" });
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

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
    isPremiumSplashVisible,
    showPremiumSplash,
    hidePremiumSplash,
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
