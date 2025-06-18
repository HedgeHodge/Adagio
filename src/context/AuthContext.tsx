
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase'; // Import db
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'; // Import Firestore functions
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface AuthContextType {
  currentUser: User | null;
  isPremium: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  upgradeUserToPremium: () => Promise<void>;
  togglePremiumStatus: () => Promise<void>; // New function
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
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error: any) {
      if (!isMobile) {
        if (error.code === 'auth/popup-closed-by-user') {
          console.info("Google sign-in popup closed by user.");
        } else if (error.code === 'auth/cancelled-popup-request') {
          console.info("Google sign-in popup request cancelled.");
        } else {
          console.error("Error signing in with Google (popup):", error);
        }
      } else {
         console.error("Error initiating Google sign-in (redirect):", error);
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
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
    if (!loading && auth && typeof auth.onAuthStateChanged === 'function') {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result && result.user) {
            await fetchUserPremiumStatus(result.user.uid);
            console.log("Google sign-in redirect processed for user:", result.user.displayName);
          }
        })
        .catch((error) => {
          console.error("Error processing Google sign-in redirect:", error);
          if (error.code !== 'auth/redirect-cancelled' && error.code !== 'auth/redirect-operation-pending') {
            // toast for other errors
          }
        });
    }
  }, [loading]);

  const value = {
    currentUser,
    isPremium,
    loading,
    signInWithGoogle,
    signOut,
    upgradeUserToPremium,
    togglePremiumStatus, // Expose new function
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
