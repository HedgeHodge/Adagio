
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Beaker, HelpCircle, Database, Sparkles, Trash2 } from 'lucide-react';
import { Separator } from "../ui/separator";

interface DevToolsModalProps {
  isOpen: boolean;
  isPremium: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPopulateData: () => void;
  onTogglePremium: () => void;
  onShowOnboarding: () => void;
  onWipeAllData: () => void;
}

export function DevToolsModal({
  isOpen,
  isPremium,
  onOpenChange,
  onPopulateData,
  onTogglePremium,
  onShowOnboarding,
  onWipeAllData
}: DevToolsModalProps) {

  const handleAndClose = (fn: () => void) => {
    fn();
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-foreground">
            <Beaker className="mr-2 h-5 w-5" />
            Developer Tools
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Tools for testing and development purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="flex flex-col">
              <Label htmlFor="premium-toggle" className="font-medium">
                Premium Status
              </Label>
              <p className="text-xs text-muted-foreground">
                Toggle user&apos;s premium subscription status.
              </p>
            </div>
            <Switch
              id="premium-toggle"
              checked={isPremium}
              onCheckedChange={onTogglePremium}
              aria-label="Toggle premium status"
            />
          </div>
          
          <Button onClick={() => handleAndClose(onPopulateData)} variant="outline">
            <Database className="mr-2 h-4 w-4" />
            Populate with Test Data
          </Button>

          <Button onClick={() => handleAndClose(onShowOnboarding)} variant="outline">
            <HelpCircle className="mr-2 h-4 w-4" />
            Show Onboarding Guide
          </Button>

          <Separator className="my-2" />
          
          <Button onClick={() => handleAndClose(onWipeAllData)} variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Wipe All Data
          </Button>


        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" className="w-full">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    

    