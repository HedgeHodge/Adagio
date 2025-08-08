
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthContextData {
  currentUser: FirebaseAuthTypes.User | null;
  isPremium: boolean;
}

const AuthContext = createContext<AuthContextData>({ currentUser: null, isPremium: false });

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentUser) {
      currentUser.getIdTokenResult().then(idTokenResult => {
        setIsPremium(!!idTokenResult.claims.premium);
      });
    }
  }, [currentUser]);

  const value = {
    currentUser,
    isPremium,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
