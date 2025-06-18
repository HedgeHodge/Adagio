
"use client";

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

export function AuthStatus() {
  const { currentUser, signInWithGoogle, signOut, loading } = useAuth();

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading auth...</div>;
  }

  return (
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
                  <UserCircle className="h-5 w-5" />
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
                  {currentUser.displayName || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {currentUser.email}
                </p>
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
        <Button variant="outline" size="sm" onClick={signInWithGoogle}>
          <LogIn className="mr-2 h-4 w-4" />
          Sign In with Google
        </Button>
      )}
    </div>
  );
}
