'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTokenExpiry } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export default function SessionTimer() {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const { logout, isLoggedIn } = useAuth();
  const toastShownRef = useRef(false);

  const updateTimer = useCallback(() => {
    const expiry = getTokenExpiry();
    if (!expiry) {
      setTimeLeft(null);
      return;
    }

    const remaining = expiry - Date.now();
    if (remaining <= 0) {
      logout();
      return;
    }

    setTimeLeft(Math.floor(remaining / 1000));

    // Show toast warning once when crossing the 2-minute threshold
    if (remaining <= 120000 && !toastShownRef.current) {
      toastShownRef.current = true;
      toast('Your session will expire soon. Please save your work.', {
        duration: 5000,
        icon: '!',
      });
    }
  }, [logout]);

  useEffect(() => {
    if (!isLoggedIn) {
      toastShownRef.current = false;
      return;
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isLoggedIn, updateTimer]);

  if (!isLoggedIn || timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const isCritical = timeLeft <= 120;
  const isWarning = timeLeft <= 300 && !isCritical;

  if (isCritical) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg animate-pulse">
        <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs font-semibold text-rose-600 font-mono tracking-wide">
          {display}
        </span>
      </div>
    );
  }

  if (isWarning) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg animate-[pulse_2s_ease-in-out_infinite]">
        <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs font-medium text-amber-600 font-mono tracking-wide">
          {display}
        </span>
      </div>
    );
  }

  return (
    <span className="text-xs text-slate-500 font-mono tracking-wide">
      Session: {display}
    </span>
  );
}
