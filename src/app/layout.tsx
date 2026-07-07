import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Vienna Trip Planner',
  description: 'Family itinerary planner for our Vienna vacation, Aug 6–16 2026',
  themeColor: '#2563eb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geist.className} h-full antialiased`}>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
