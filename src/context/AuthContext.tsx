
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile

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
  const { toast } = useToast();
  const isMobile = useIsMobile(); // Determine if mobile

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      if (isMobile) {
        await signInWithRedirect(auth, provider);
        // For redirects, errors are typically handled by getRedirectResult or on the IdP page.
        // The user will be navigated away, so onAuthStateChanged and getRedirectResult will handle user state.
      } else {
        await signInWithPopup(auth, provider);
        // For popups, onAuthStateChanged will handle setting the user.
      }
    } catch (error: any) {
      if (!isMobile) { // Popup specific error handling
        if (error.code === 'auth/popup-closed-by-user') {
          console.info("Google sign-in popup closed by user.");
        } else if (error.code === 'auth/cancelled-popup-request') {
          console.info("Google sign-in popup request cancelled. This can happen if multiple popups were opened.");
        } else {
          console.error("Error signing in with Google (popup):", error);
          // toast({
          //   title: "Sign-In Error",
          //   description: "Could not sign in with Google. Please try again.",
          //   variant: "destructive",
          // });
        }
      } else { // Redirect specific error handling (less common here, mostly in getRedirectResult)
         console.error("Error initiating Google sign-in (redirect):", error);
         // toast({
         //   title: "Sign-In Error",
         //   description: "Could not start the sign-in process. Please try again.",
         //   variant: "destructive",
         // });
      }
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

  useEffect(() => {
    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
        console.warn("[AuthContext] Firebase Auth not fully initialized yet, delaying onAuthStateChanged listener setup.");
        const timer = setTimeout(() => {
            if (auth && typeof auth.onAuthStateChanged === 'function') {
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    setCurrentUser(user);
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

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); // Empty dependency array is correct for onAuthStateChanged setup

  useEffect(() => {
    // This effect handles the result of a redirect sign-in attempt.
    // It runs after the initial loading is complete.
    if (!loading && auth && typeof auth.onAuthStateChanged === 'function') {
      getRedirectResult(auth)
        .then((result) => {
          if (result) {
            // const user = result.user;
            // `onAuthStateChanged` should have already updated `currentUser`.
            // You can add a success toast here if desired.
            // toast({ title: "Signed in successfully!" });
            console.log("Google sign-in redirect processed for user:", result.user.displayName);
          }
          // If result is null, it means no redirect operation was pending or it was already handled.
        })
        .catch((error) => {
          console.error("Error processing Google sign-in redirect:", error);
          // Avoid showing toast for common non-errors like redirect cancelled by navigation.
          if (error.code !== 'auth/redirect-cancelled' && error.code !== 'auth/redirect-operation-pending') {
            // toast({
            //   title: "Sign-In Failed",
            //   description: "Could not complete sign-in after redirect. " + error.message,
            //   variant: "destructive",
            // });
          }
        });
    }
  }, [loading]); // Run when `loading` state changes, specifically after it becomes false. `auth` is stable.

  const value = {
    currentUser,
    loading,
    signInWithGoogle,
    signOut,
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
