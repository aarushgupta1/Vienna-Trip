export type Category = 'museum' | 'food' | 'landmark' | 'entertainment' | 'other';

export interface Attraction {
  id: string;
  name: string;
  description: string | null;
  category: Category;
  scheduled_date: string | null; // YYYY-MM-DD
  start_time: string | null; // HH:MM
  end_time: string | null; // HH:MM
  notes: string | null;
  created_at: string;
}

export type LogisticsPinCategory =
  | 'flights'
  | 'accommodation'
  | 'transport'
  | 'documents'
  | 'contacts'
  | 'budget'
  | 'other';

export interface LogisticsPin {
  id: string;
  category: LogisticsPinCategory;
  title: string;
  content: string;
  created_at: string;
}
