
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast(); // Initialize toast

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting the user
    } catch (error: any) { // Using 'any' for broader error type matching
      if (error.code === 'auth/popup-closed-by-user') {
        console.info("Google sign-in popup closed by user.");
        // This is a user action, typically no need to show a user-facing error message.
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.info("Google sign-in popup request cancelled. This can happen if multiple popups were opened.");
      }
      else {
        console.error("Error signing in with Google:", error);
        // For other errors, you might want to inform the user
        // toast({
        //   title: "Sign-In Error",
        //   description: "Could not sign in with Google. Please try again.",
        //   variant: "destructive",
        // });
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle setting the user to null
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Sign-Out Error",
        description: "An error occurred while signing out.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Ensure Firebase Auth is initialized before trying to use it
    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
        console.warn("[AuthContext] Firebase Auth not fully initialized yet, delaying onAuthStateChanged listener setup.");
        // Optionally, retry or wait for Firebase app to be fully ready
        const timer = setTimeout(() => {
            if (auth && typeof auth.onAuthStateChanged === 'function') {
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    setCurrentUser(user);
                    setLoading(false);
                });
                return () => unsubscribe();
            } else {
                 setLoading(false); // Stop loading if auth is still not ready after a delay
                 console.error("[AuthContext] Firebase Auth failed to initialize properly.");
            }
        }, 1000); // Wait 1 sec
        return () => clearTimeout(timer);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    loading,
    signInWithGoogle,
    signOut,
  };

  // Render children only when loading is false to prevent rendering with unauthenticated state initially
  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
