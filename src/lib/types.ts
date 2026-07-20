import { CalendarTimezone } from './utils';

export type Category = 'museum' | 'food' | 'landmark' | 'entertainment' | 'flights' | 'travel' | 'other';

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
  edited_by: string | null; // self-chosen display name of whoever last saved this — no auth, not verified
  updated_at: string;
  created_at: string;
  // For flights: which zone the departure and arrival times each display in
  // — a flight's two ends are naturally in two different zones (e.g. an ET
  // departure landing in CEST Vienna), so these are independent rather than
  // one flag for the whole event. Both default to 'vienna' and are ignored
  // for non-flight categories.
  departure_timezone: CalendarTimezone;
  arrival_timezone: CalendarTimezone;
}

export interface DayNote {
  date: string; // YYYY-MM-DD
  note: string;
  edited_by: string | null;
  updated_at: string;
}

export type Currency = 'EUR' | 'USD' | 'CZK'; // CZK for Prague — the Czech Republic doesn't use the euro

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
  edited_by: string | null;
  updated_at: string;
  created_at: string;
}
