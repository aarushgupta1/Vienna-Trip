'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Share, X, SquarePlus } from 'lucide-react';

// The event Chrome/Edge/Android fire when the app meets install criteria
// (valid manifest + service worker + served over HTTPS). Not in lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'vienna-install-dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own (non-standard) flag for "launched from home screen".
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Prompts family members to install the app to their home screen — Chrome/
// Android get the real native install prompt; iOS Safari never fires
// `beforeinstallprompt` at all, so it gets a short "Share → Add to Home
// Screen" walkthrough instead, since that's the only way to install there.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default hidden until checked, avoids a flash
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const dismiss = () => {
    setDismissed(true);
    setShowIOSSteps(false);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Best-effort — worst case it just asks again next visit.
    }
  };

  useEffect(() => {
    if (isStandalone()) return; // already installed — nothing to do

    try {
      if (localStorage.getItem(DISMISSED_KEY) === '1') return;
    } catch {
      // If storage is unavailable, just fall through and show the prompt.
    }
    setDismissed(false);

    const ua = window.navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      dismiss();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showIOSSteps) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowIOSSteps(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showIOSSteps]);

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === 'accepted') dismiss();
      return;
    }
    if (isIOS) {
      setShowIOSSteps((o) => !o);
    }
  };

  // Nothing to offer: not iOS, and the browser hasn't (yet) decided this
  // page is installable — e.g. desktop Firefox, or criteria not met yet.
  if (dismissed || (!deferredPrompt && !isIOS)) return null;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/50 pl-2.5 pr-1 py-1">
        <button
          onClick={handleClick}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          title="Install this app to your home screen"
        >
          <Download size={12} />
          Get the app
        </button>
        <button
          onClick={dismiss}
          className="p-1 rounded-full text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          title="Dismiss"
        >
          <X size={11} />
        </button>
      </div>

      {showIOSSteps && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Add to Home Screen</p>
          <ol className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
            <li className="flex items-center gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-semibold">1</span>
              Tap the <Share size={12} className="inline shrink-0" /> Share button in Safari&apos;s toolbar
            </li>
            <li className="flex items-center gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-semibold">2</span>
              Scroll down and tap <SquarePlus size={12} className="inline shrink-0" /> &quot;Add to Home Screen&quot;
            </li>
            <li className="flex items-center gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-semibold">3</span>
              Tap &quot;Add&quot; — the app icon will appear on your home screen
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
