
"use client";

import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_STORAGE_KEY = 'adagio_onboarding_completed_v1';

export const useOnboarding = () => {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const onboardingCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!onboardingCompleted) {
        setIsFirstTime(true);
      }
    } catch (error) {
      console.error("Could not access localStorage:", error);
      // Fallback for environments where localStorage is not available
      setIsFirstTime(true); 
    }
  }, []);

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

  return { isFirstTime, setOnboardingCompleted, showOnboarding };
};

    