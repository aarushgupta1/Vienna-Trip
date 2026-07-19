'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import QRCode from 'qrcode';

// The event Chrome/Edge/Android fire when the app meets install criteria
// (valid manifest + service worker + served over HTTPS). Not in lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'vienna-install-dismissed';
const INSTALL_PARAM = 'install';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own (non-standard) flag for "launched from home screen".
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Same page, marked so that whoever lands on it via the QR code skips
// straight to the install step instead of needing to find/tap the button.
function installUrl(): string {
  const url = new URL(window.location.href);
  url.hash = '';
  url.searchParams.set(INSTALL_PARAM, '1');
  return url.toString();
}

// Prompts family members to install the app to their home screen.
//
// - Mobile with real install support (Chrome/Edge/Android): a single tap
//   fires the native install prompt directly — nothing fancier needed.
// - Everywhere else (desktop, iOS Safari, any browser that never offers
//   native install) shows a QR code for the page instead. On desktop that's
//   the whole point — scan it with your phone to continue there. On mobile
//   it doubles as an escape hatch for the common trap where the link was
//   opened inside an in-app browser (Messages/Slack/Instagram) that Apple
//   doesn't allow "Add to Home Screen" from at all — scanning with the
//   Camera app forces it open in real Safari.
// - Landing back on the page via that QR code (the `?install=1` marker) skips
//   the QR/button entirely and jumps straight to the actual install action.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default hidden until checked, avoids a flash
  const [open, setOpen] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const autoTriggeredRef = useRef(false); // mirrors the state above, for use inside closures below
  const ref = useRef<HTMLDivElement>(null);

  const dismiss = () => {
    setDismissed(true);
    setOpen(false);
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
    const iOS = /iphone|ipad|ipod/i.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const mobile = iOS || /android|mobile/i.test(ua);
    setIsIOS(iOS);
    setIsMobile(mobile);

    const params = new URLSearchParams(window.location.search);
    if (params.get(INSTALL_PARAM) === '1') {
      autoTriggeredRef.current = true;
      setAutoTriggered(true);
      setOpen(true);
      params.delete(INSTALL_PARAM);
      const rest = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''));
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      if (autoTriggeredRef.current && mobile) {
        evt.prompt();
        evt.userChoice.then(({ outcome }) => {
          if (outcome === 'accepted') dismiss();
        });
        return;
      }
      setDeferredPrompt(evt);
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
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // The QR only needs generating once, the first time the popover opens —
  // skip it entirely if we're already showing the auto-triggered "you're in,
  // just finish this step" text instead.
  useEffect(() => {
    if (!open || autoTriggered || qrDataUrl) return;
    QRCode.toDataURL(installUrl(), { width: 160, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => {
        // If generation fails for some reason, the popover just shows the
        // caption with no image — not worth surfacing an error for.
      });
  }, [open, autoTriggered, qrDataUrl]);

  const nativeAvailable = isMobile && !!deferredPrompt;

  const handleClick = async () => {
    if (nativeAvailable && deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === 'accepted') dismiss();
      return;
    }
    setOpen((o) => !o);
  };

  if (dismissed) return null;

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

      {open && !nativeAvailable && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 flex flex-col items-center gap-2 text-center">
          {autoTriggered ? (
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {isIOS ? (
                <>Tap the Share button, then <strong>Add to Home Screen</strong>.</>
              ) : (
                <>Use your browser menu and choose <strong>Add to Home Screen</strong> (or Install App).</>
              )}
            </p>
          ) : (
            <>
              {qrDataUrl ? (
                // A dynamically-generated data URL — next/image's optimizer
                // doesn't add anything useful here.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR code to open this app" width={140} height={140} className="rounded-lg" />
              ) : (
                <div className="w-[140px] h-[140px] rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
              )}
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {isMobile
                  ? "Can't install here? Scan with your camera to open this in your browser."
                  : 'Scan with your phone to install.'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
