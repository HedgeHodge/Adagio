
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const signInSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});
type SignInFormData = z.infer<typeof signInSchema>;

const signUpSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type SignUpFormData = z.infer<typeof signUpSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AuthModal({ isOpen, onOpenChange }: AuthModalProps) {
  const { signInWithEmailPassword, signUpWithEmailPassword, signInWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<'signIn' | 'signUp'>('signIn');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostname, setHostname] = useState<string>('');

  useEffect(() => {
    // Correctly handle client-side-only code
    if (typeof window !== 'undefined') {
      setHostname(window.location.hostname);
    }
  }, []);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const handleSignIn: SubmitHandler<SignInFormData> = async (data) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithEmailPassword(data.email, data.password);
      onOpenChange(false); 
    } catch (err: any) {
      let message = "An unexpected error occurred. Please try again.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/unauthorized-domain') {
        message = `This app's domain (${hostname}) is not authorized for authentication. Please go to your Firebase project's Authentication settings, click the 'Settings' tab, and add the domain to the 'Authorized domains' list.`;
      } else {
        message = `An error occurred (${err.code || 'unknown'}). Please check your Firebase project's authentication settings.`;
        console.error("Full sign-in error:", err);
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp: SubmitHandler<SignUpFormData> = async (data) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signUpWithEmailPassword(data.email, data.password);
      onOpenChange(false); 
    } catch (err: any) {
      let message = "An unexpected error occurred. Please try again.";
      if (err.code === 'auth/email-already-in-use') {
        message = 'This email address is already in use by another account.';
      } else if (err.code === 'auth/weak-password') {
        message = 'The password is too weak. It must be at least 6 characters long.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'The email address is not valid.';
      } else if (err.code === 'auth/unauthorized-domain') {
        message = `This app's domain (${hostname}) is not authorized for authentication. Please go to your Firebase project's Authentication settings, click the 'Settings' tab, and add the domain to the 'Authorized domains' list.`;
      } else {
        message = `An error occurred (${err.code || 'unknown'}). Please check your Firebase project's authentication settings.`;
        console.error("Full signup error:", err);
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
        await signInWithGoogle();
        onOpenChange(false);
    } catch (err: any) {
        // The AuthContext now handles errors and toasts, so we just log here.
        console.error("Google Sign-In failed in modal:", err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      signInForm.reset();
      signUpForm.reset();
      setError(null);
    }
    onOpenChange(open);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'signIn' | 'signUp');
    signInForm.reset(); 
    signUpForm.reset();
    setError(null);
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold text-foreground">
            {activeTab === 'signIn' ? 'Welcome Back!' : 'Create Account'}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {activeTab === 'signIn' ? 'Sign in to continue to Adagio.' : 'Join Adagio to start your focus journey.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signIn">Sign In</TabsTrigger>
            <TabsTrigger value="signUp">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signIn">
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="signIn-email">Email</Label>
                <Input
                  id="signIn-email"
                  type="email"
                  {...signInForm.register('email')}
                  className="mt-1 bg-background"
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                />
                {signInForm.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">{signInForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="signIn-password">Password</Label>
                <Input
                  id="signIn-password"
                  type="password"
                  {...signInForm.register('password')}
                  className="mt-1 bg-background"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                {signInForm.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">{signInForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sign In'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signUp">
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="signUp-email">Email</Label>
                <Input
                  id="signUp-email"
                  type="email"
                  {...signUpForm.register('email')}
                  className="mt-1 bg-background"
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                />
                {signUpForm.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">{signUpForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="signUp-password">Password</Label>
                <Input
                  id="signUp-password"
                  type="password"
                  {...signUpForm.register('password')}
                  className="mt-1 bg-background"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                {signUpForm.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">{signUpForm.formState.errors.password.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="signUp-confirmPassword">Confirm Password</Label>
                <Input
                  id="signUp-confirmPassword"
                  type="password"
                  {...signUpForm.register('confirmPassword')}
                  className="mt-1 bg-background"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                {signUpForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive mt-1">{signUpForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                 {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sign Up'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive flex items-start">
            <AlertCircle className="h-4 w-4 mr-2 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : (
            <>
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
              Google
            </>
          )}
        </Button>

        <DialogFooter className="mt-2 pt-4 text-center text-xs text-muted-foreground">
          By continuing, you agree to Adagio's Terms of Service and Privacy Policy.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    