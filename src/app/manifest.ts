import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vienna, Salzburg & Prague Trip Planner',
    short_name: 'VSP Trip',
    description: 'Family itinerary planner for our Vienna, Salzburg & Prague vacation, Aug 6–16 2026',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
