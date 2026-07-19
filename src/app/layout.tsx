import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Vienna, Salzburg & Prague Trip Planner',
  description: 'Family itinerary planner for our Vienna, Salzburg & Prague vacation, Aug 6–16 2026',
  // iOS ignores the manifest's icons/display fields for "Add to Home Screen"
  // — it only respects these tags (via Next's icons/appleWebApp metadata),
  // plus needs a PNG icon since it doesn't rasterize SVG apple-touch-icons.
  icons: { apple: '/apple-touch-icon.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VSP Trip',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
};

const THEME_INIT_SCRIPT = `
  try {
    var theme = localStorage.getItem('vienna-theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${geist.className} h-full antialiased`} suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
