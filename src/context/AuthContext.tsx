
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const handleUser = useCallback(async (user: User | null) => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists() && docSnap.data()) {
        setIsPremium(docSnap.data().isPremium === true);
      } else {
        // Create user doc if it doesn't exist
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
    // setLoading(false); // This is now handled in the useEffect's getRedirectResult.finally()
  }, []);

  useEffect(() => {
    // This is the primary auth state listener.
    const unsubscribe = onAuthStateChanged(auth, handleUser);

    // This specifically handles the result of a redirect sign-in.
    // It only runs once on component mount.
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // User has signed in or linked a credential.
          // The onAuthStateChanged listener above will handle the user object.
          toast({
            title: "Signed In Successfully",
            description: `Welcome back, ${result.user.displayName || result.user.email}!`,
          });
        }
      })
      .catch((error) => {
        console.error("Error during Google sign-in redirect:", error);
        let title = "Google Sign-In Error";
        let description = "An unknown error occurred during sign-in. Please try again.";

        if (error.code === 'auth/unauthorized-domain') {
          title = "Domain Not Authorized";
          const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'your app domain';
          description = `Sign-in from this domain (${currentHostname}) is not authorized. Please add it to the "Authorized domains" list in your Firebase project's Authentication settings.`;
        } else if (error.code === 'auth/account-exists-with-different-credential') {
          title = "Account Exists";
          description = "An account already exists with this email, but with a different sign-in method (e.g., password). Please sign in using your original method.";
        } else if (error.code !== 'auth/redirect-cancelled' && error.code !== 'auth/redirect-operation-pending') {
          description = error.message || description;
        }

        if (error.code !== 'auth/redirect-cancelled' && error.code !== 'auth/redirect-operation-pending') {
            toast({ title, description, variant: "destructive", duration: 10000 });
        }
      })
      .finally(() => {
        // This ensures the loading state is only set to false after the redirect
        // operation has been checked. This is more robust against race conditions
        // on mobile browsers.
        setLoading(false);
      });
    
    return () => unsubscribe();
  }, [handleUser, toast]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Always use redirect for a more robust flow that works across all browsers
    // and avoids issues with pop-up blockers.
    await signInWithRedirect(auth, provider);
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
    toast({ title: "Account Created!", description: "Welcome to Adagio!" });
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
