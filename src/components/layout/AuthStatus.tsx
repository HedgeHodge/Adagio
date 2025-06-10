
"use client";

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, UserCircle } from 'lucide-react'; // Assuming UserCircle for generic avatar

export function AuthStatus() {
  const { currentUser, signInWithGoogle, signOut, loading } = useAuth();

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading auth...</div>;
  }

  return (
    <div className="flex items-center gap-2">
      {currentUser ? (
        <>
          <div className="flex items-center gap-2 text-sm text-foreground">
            {/* For simplicity, not using next/image for Google avatar yet */}
            {/* currentUser.photoURL && <img src={currentUser.photoURL} alt="User avatar" className="h-6 w-6 rounded-full" /> */}
            <UserCircle className="h-5 w-5" />
            <span className="hidden sm:inline">{currentUser.displayName || currentUser.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="mr-1 h-4 w-4" />
            Sign Out
          </Button>
        </>
      ) : (
        <Button variant="outline" size="sm" onClick={signInWithGoogle}>
          <LogIn className="mr-2 h-4 w-4" />
          Sign In with Google
        </Button>
      )}
    </div>
  );
}
