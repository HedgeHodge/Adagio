
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const useOnboarding = (currentUser: User | null) => {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const checkOnboardingStatus = async () => {
      if (!currentUser) {
        return;
      }

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (!userData.onboardingCompleted) {
            setIsFirstTime(true);
          }
        } else {
          // User document doesn't exist, so it's their first time.
          setIsFirstTime(true);
        }
      } catch (error) {
        console.error("Error checking user onboarding status:", error);
      }
    };

    checkOnboardingStatus();

  }, [currentUser]);

  const setOnboardingCompleted = useCallback(async () => {
    if (!isMounted || !currentUser) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, { onboardingCompleted: true }, { merge: true });
      setIsFirstTime(false);
    } catch (error) {
      console.error("Could not update user onboarding status:", error);
      // Still hide the modal even if firestore fails
      setIsFirstTime(false);
    }
  }, [isMounted, currentUser]);

  const showOnboarding = useCallback(() => {
    if (!isMounted) return;
    setIsFirstTime(true);
  }, [isMounted]);

  // Only return true for isFirstTime if the component is mounted to avoid SSR/hydration issues
  return { isFirstTime: isMounted && isFirstTime, setOnboardingCompleted, showOnboarding };
};
