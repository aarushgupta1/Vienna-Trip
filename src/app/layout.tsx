import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Vienna, Salzburg & Prague Trip Planner',
  description: 'Family itinerary planner for our Vienna, Salzburg & Prague vacation, Aug 6–16 2026',
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
