
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
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'; 
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface AuthContextType {
  currentUser: User | null;
  isPremium: boolean;
  loading: boolean;
  isMobile: boolean;
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

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    if (isMobile) {
      await signInWithRedirect(auth, provider);
    } else {
      await signInWithPopup(auth, provider);
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
    await createUserWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
    toast({ title: "Account Created!", description: "Welcome to Adagio!" });
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
  };
  
  const handleUser = useCallback(async (user: User | null) => {
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
    const unsubscribe = onAuthStateChanged(auth, handleUser);

    getRedirectResult(auth)
      .catch((error) => {
        console.error("Error processing Google sign-in redirect:", error);
        if (error.code !== 'auth/redirect-cancelled' && error.code !== 'auth/redirect-operation-pending') {
          toast({
            title: "Google Sign-In Error",
            description: error.message || "An error occurred during redirect.",
            variant: "destructive"
          });
        }
        setLoading(false); // Ensure loading stops on redirect error
      });
    
    return () => unsubscribe();
  }, [handleUser, toast]);


  const value = {
    currentUser,
    isPremium,
    loading,
    isMobile,
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
