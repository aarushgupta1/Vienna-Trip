export type Category = 'museum' | 'food' | 'landmark' | 'entertainment' | 'flights' | 'other';

export interface Attraction {
  id: string;
  name: string;
  description: string | null;
  category: Category;
  scheduled_date: string | null; // YYYY-MM-DD
  start_time: string | null; // HH:MM
  end_time: string | null; // HH:MM
  notes: string | null;
  location: string | null; // free-text address, geocoded server-side into lat/lng
  lat: number | null;
  lng: number | null;
  ticket_urls: string[]; // uploaded ticket files (images/PDFs) in Supabase Storage
  created_at: string;
}

export interface DayNote {
  date: string; // YYYY-MM-DD
  note: string;
  updated_at: string;
}

export type Currency = 'EUR' | 'USD';

export interface Hotel {
  id: string;
  name: string;
  location: string | null; // free-text address, geocoded server-side into lat/lng
  lat: number | null;
  lng: number | null;
  check_in: string | null; // YYYY-MM-DD
  check_out: string | null; // YYYY-MM-DD
  price: number | null;
  currency: Currency;
  confirmation_number: string | null;
  notes: string | null;
  created_at: string;
}
