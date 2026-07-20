'use client';

import { useEffect, useRef, useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import QRCode from 'qrcode';

const DISMISSED_KEY = 'vienna-install-dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own (non-standard) flag for "launched from home screen".
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Desktop-only: shows a QR code for the page so you can pick it up on your
// phone (it just opens in the phone's own browser — see the copy below,
// which deliberately doesn't promise an "install"). Nothing shows on mobile
// itself, since you're already there.
export default function InstallPrompt() {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default hidden until checked, avoids a flash
  const [open, setOpen] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
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
    setIsMobile(iOS || /android|mobile/i.test(ua));

    // Auto-dismiss if installed via the browser's own address-bar install
    // icon rather than our button — no need to keep offering at that point.
    const onInstalled = () => dismiss();
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Rendered as inline SVG (via qrcode's string renderer) rather than a
  // canvas-based data URL — canvas reads can get silently blanked out by
  // Safari's anti-fingerprinting protections, which an SVG string sidesteps
  // entirely since no canvas is ever touched.
  useEffect(() => {
    if (!open || qrSvg) return;
    const url = `${window.location.origin}${window.location.pathname}`;
    QRCode.toString(url, { width: 140, margin: 1 })
      .then(setQrSvg)
      .catch(() => {
        // If generation fails for some reason, the popover just shows the
        // caption with no image — not worth surfacing an error for.
      });
  }, [open, qrSvg]);

  if (dismissed || isMobile) return null;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/50 pl-2.5 pr-1 py-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          title="Open this page on your phone"
        >
          <Smartphone size={12} />
          Open on Phone
        </button>
        <button
          onClick={dismiss}
          className="p-1 rounded-full text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          title="Dismiss"
        >
          <X size={11} />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 flex flex-col items-center gap-2 text-center">
          {qrSvg ? (
            <div
              className="w-[140px] h-[140px] rounded-lg bg-white p-1.5"
              // Trusted content — generated locally by the qrcode library from
              // our own URL, never from user input.
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            <div className="w-[140px] h-[140px] rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          )}
          <p className="text-xs text-gray-600 dark:text-gray-300">Scan with your phone&apos;s camera to open this page there.</p>
        </div>
      )}
    </div>
  );
}
