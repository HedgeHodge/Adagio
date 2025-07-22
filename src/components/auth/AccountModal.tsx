
"use client";

import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, UserCircle, CheckCircle } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AccountModal({ isOpen, onOpenChange }: AccountModalProps) {
  const { currentUser, isPremium, signOut } = useAuth();

  if (!currentUser) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card rounded-3xl sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold text-foreground">Account</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Manage your account and session.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="h-20 w-20">
            {currentUser.photoURL ? (
              <AvatarImage src={currentUser.photoURL} alt={currentUser.displayName || currentUser.email || 'User avatar'} />
            ) : null}
            <AvatarFallback className="text-3xl">
              {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 
               currentUser.email ? currentUser.email.charAt(0).toUpperCase() : <UserCircle className="h-10 w-10" />}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">
              {currentUser.displayName || "User"}
            </p>
            {currentUser.email && (
              <p className="text-sm text-muted-foreground">
                {currentUser.email}
              </p>
            )}
          </div>
          {isPremium && (
             <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <CheckCircle className="h-4 w-4" />
                <span>Premium Member</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2">
            <Button onClick={handleSignOut} variant="destructive" className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
            </Button>
            <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full">
                    Close
                </Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
