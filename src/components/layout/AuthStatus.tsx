
"use client";

import { useState } from 'react'; 
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut, UserCircle, ChevronDown } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal'; 

export function AuthStatus() {
  const { currentUser, signOut, loading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  if (loading && !currentUser) { // Show loading only if no user and still loading initial auth state
    return <div className="text-sm text-muted-foreground">Loading auth...</div>;
  }
  
  // If loading is done and still no user, AuthModal will be triggered by the button
  // If currentUser exists, the loading state for initial auth is effectively done for display purposes here.

  return (
    <>
      <div className="flex items-center gap-2">
        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-3 rounded-md">
                <Avatar className="h-6 w-6">
                  {currentUser.photoURL ? (
                    <AvatarImage src={currentUser.photoURL} alt={currentUser.displayName || currentUser.email || 'User avatar'} />
                  ) : null}
                  <AvatarFallback>
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 
                     currentUser.email ? currentUser.email.charAt(0).toUpperCase() : <UserCircle className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium text-foreground">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {currentUser.displayName || currentUser.email?.split('@')[0] || "User"}
                  </p>
                  {currentUser.email && (
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer group">
                <LogOut className="mr-2 h-4 w-4 text-destructive group-hover:text-destructive" />
                <span className="text-destructive group-hover:text-destructive">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Show button only if not loading initial auth state, or if loading is done.
          // This prevents flash of button if auth is loading and user will be found.
          !loading && (
            <Button variant="outline" size="sm" onClick={() => setIsAuthModalOpen(true)}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign In / Sign Up
            </Button>
          )
        )}
      </div>
      {/* Render modal only if a user is not logged in. 
          The isOpen state will control its visibility. */}
      {!currentUser && (
        <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
      )}
    </>
  );
}

    