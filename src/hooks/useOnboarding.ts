
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const ONBOARDING_STORAGE_KEY = 'adagio_onboarding_completed_v2';

export const useOnboarding = (currentUser: User | null) => {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const checkOnboardingStatus = async () => {
      if (!currentUser) {
        // Fallback for anonymous users: check local storage
        try {
          const onboardingCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
          if (!onboardingCompleted) {
            setIsFirstTime(true);
          }
        } catch (error) {
          console.error("Could not access localStorage:", error);
          setIsFirstTime(true);
        }
        return;
      }
      
      // For logged-in users, check if they are new
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const createdAt = userData.createdAt?.toDate(); // Firestore timestamp
          
          if (createdAt) {
            // Check if the account was created in the last 5 minutes
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            if (createdAt > fiveMinutesAgo) {
              setIsFirstTime(true);
              return; // Show onboarding for very new user
            }
          }
        }
        
        // If not a very new user, check local storage as a final fallback
        const onboardingCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!onboardingCompleted) {
          setIsFirstTime(true);
        }

      } catch (error) {
        console.error("Error checking user onboarding status:", error);
        // Fallback to local storage check on error
         const onboardingCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
         if (!onboardingCompleted) {
           setIsFirstTime(true);
         }
      }
    };
    
    checkOnboardingStatus();

  }, [currentUser]);

  const setOnboardingCompleted = useCallback(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      setIsFirstTime(false);
    } catch (error) {
       console.error("Could not write to localStorage:", error);
       // Still hide the modal even if localStorage fails
       setIsFirstTime(false);
    }
  }, [isMounted]);

  const showOnboarding = useCallback(() => {
    if (!isMounted) return;
    setIsFirstTime(true);
  }, [isMounted]);

  // Only return true for isFirstTime if the component is mounted to avoid SSR/hydration issues
  return { isFirstTime: isMounted && isFirstTime, setOnboardingCompleted, showOnboarding };
};
