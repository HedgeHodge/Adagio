"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth/AuthModal';
import { MessageSquareMore, CircleUserRound, Replace, Clock, Brush, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const ActionButton = ({ icon, label, className = '' }: { icon: React.ReactNode, label: string, className?: string }) => (
  <div className="flex flex-col items-center gap-2">
    <Button variant="secondary" className={cn("w-[84px] h-[84px] bg-white/60 rounded-3xl shadow-lg flex items-center justify-center", className)}>
      {icon}
    </Button>
    <span className="font-semibold text-sm text-gray-800">{label}</span>
  </div>
);

export default function HomePage() {
  const { currentUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const userName = currentUser?.displayName?.split(' ')[0] || 'there';

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden p-6 md:p-8">
      {/* Top Icons */}
      <header className="flex justify-between items-center w-full">
        <Button variant="ghost" size="icon" className="bg-black/5 rounded-full h-11 w-11">
          <MessageSquareMore className="h-6 w-6 text-gray-800" />
        </Button>
        <Button variant="ghost" size="icon" className="bg-black/5 rounded-full h-11 w-11" onClick={() => setIsAuthModalOpen(true)}>
          <CircleUserRound className="h-6 w-6 text-gray-800" />
        </Button>
      </header>

      {/* Greeting */}
      <div className="flex-grow flex items-center justify-center -mt-20">
        <div className="text-left w-full">
          <h1 className="text-5xl lg:text-6xl font-bold text-black tracking-tight">
            Hi {userName},<br />
            How can I help<br />
            you today?
          </h1>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <footer className="absolute bottom-0 left-0 right-0 flex justify-center pb-5 pointer-events-none">
        <div className="relative w-full max-w-sm h-52">
          {/* Arc Background */}
          <div className="absolute bottom-0 w-full h-44 bg-white/40 backdrop-blur-xl rounded-t-[48px] shadow-2xl shadow-black/10">
          </div>
          
          {/* Action Buttons */}
          <div className="absolute bottom-16 w-full flex justify-around items-center px-4 pointer-events-auto">
            <ActionButton icon={<Replace className="h-9 w-9 text-[#8B85E4]" />} label="Convert" />
            <Link href="/pomodoro">
              <ActionButton icon={<Clock className="h-9 w-9 text-[#66C4C4]" />} label="Focus" />
            </Link>
            <ActionButton icon={<Brush className="h-9 w-9 text-[#E4B585]" />} label="Edit" />
          </div>

          {/* Center Search Button */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
            <Button size="icon" className="bg-black text-white rounded-full h-16 w-16 shadow-lg hover:bg-gray-800">
              <Search className="h-8 w-8" />
            </Button>
          </div>
        </div>
      </footer>
      
      {!currentUser && (
        <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
      )}
    </div>
  );
}
