
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
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
  signInAnonymously
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
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>; 
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  isPremiumSplashVisible: boolean;
  showPremiumSplash: () => void;
  hidePremiumSplash: () => void;
  togglePremiumStatus: () => void; // For testing
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

  const togglePremiumStatus = async () => {
    if (!currentUser) return;
    const newPremiumStatus = !isPremium;
    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, { isPremium: newPremiumStatus }, { merge: true });
    setIsPremium(newPremiumStatus);
    if(newPremiumStatus) showPremiumSplash();
  }

  const handleUser = useCallback(async (user: User | null) => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists() && docSnap.data()) {
        setIsPremium(docSnap.data().isPremium === true);
      } else {
        const isAnonymousUser = user.isAnonymous;
        await setDoc(userDocRef, { 
          isPremium: isAnonymousUser, 
          email: user.email, 
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: Timestamp.now() 
        }, { merge: true });
        setIsPremium(isAnonymousUser);
      }
      setCurrentUser(user);
      setLoading(false);
    } else {
        setCurrentUser(null);
        setIsPremium(false);
        setLoading(false);
    }
  }, []);

  // Handle redirect result on component mount
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // User successfully signed in. `onAuthStateChanged` will handle the user object.
        }
      })
      .catch((error) => {
        console.error("Error during Google redirect sign-in:", error);
        toast({
          title: "Sign-In Error",
          description: "An error occurred during sign-in. Please try again.",
          variant: "destructive"
        });
      }).finally(() => {
        // This ensures loading is false after checking redirect result
        setLoading(false);
      });
  }, [toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        handleUser(user);
      } else {
        if (process.env.NODE_ENV === 'development') {
          signInAnonymously(auth).catch((error) => {
            console.error("Error signing in anonymously:", error);
          });
        } else {
          handleUser(null);
        }
      }
    });
    return () => unsubscribe();
  }, [handleUser]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the user state.
    } catch (error: any) {
        // Handle popup-related errors by falling back to redirect
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            console.log("Popup failed, falling back to redirect.");
            await signInWithRedirect(auth, provider);
        } else {
            console.error("Error during Google sign-in:", error);
            let title = "Google Sign-In Error";
            let description = "An unknown error occurred. Please try again.";

             if (error.code === 'auth/unauthorized-domain') {
              title = "Domain Not Authorized";
              const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'your app domain';
              description = `Sign-in from this domain (${currentHostname}) is not authorized. Please add it to your Firebase project's "Authorized domains" list.`;
            } else if (error.code === 'auth/account-exists-with-different-credential') {
              title = "Account Exists";
              description = "An account already exists with this email, but with a different sign-in method (e.g., password). Please sign in using your original method.";
            } else {
                description = error.message || description;
            }

            toast({ title, description, variant: "destructive" });
            throw new Error(description);
        }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setIsPremium(false);
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

  const signUpWithEmailPassword = async (email: string, password: string) => {
    try {
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Error signing up:", error);
        throw error;
    }
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Error signing in:", error);
        throw error;
    }
  };

  const value = {
    currentUser,
    isPremium,
    loading,
    signInWithGoogle,
    signOut,
    upgradeUserToPremium,
    signUpWithEmailPassword, 
    signInWithEmailPassword,
    isPremiumSplashVisible,
    showPremiumSplash,
    hidePremiumSplash,
    togglePremiumStatus,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
