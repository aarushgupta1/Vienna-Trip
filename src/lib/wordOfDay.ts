import { getCityForDate, TripCity } from './trip';
import { generateTripDates } from './utils';

export type TripLanguage = 'German' | 'Czech';

interface WordEntry {
  word: string;
  translation: string;
}

// A small curated phrasebook per language — practical, trip-useful phrases
// rather than random vocabulary, since the point is to actually use a word
// or two while you're there. Vienna and Salzburg are both German-speaking,
// so they share one list; Prague gets its own Czech list.
const GERMAN_WORDS: WordEntry[] = [
  { word: 'Guten Tag', translation: 'good day / hello' },
  { word: 'Danke', translation: 'thank you' },
  { word: 'Bitte', translation: 'please / you’re welcome' },
  { word: 'Entschuldigung', translation: 'excuse me / sorry' },
  { word: 'Prost', translation: 'cheers' },
  { word: 'Guten Morgen', translation: 'good morning' },
  { word: 'Wie viel kostet das?', translation: 'how much does that cost?' },
  { word: 'Lecker', translation: 'delicious' },
  { word: 'Wo ist...?', translation: 'where is...?' },
  { word: 'Auf Wiedersehen', translation: 'goodbye' },
  { word: 'Ja', translation: 'yes' },
  { word: 'Nein', translation: 'no' },
  { word: 'Wasser', translation: 'water' },
  { word: 'Toilette', translation: 'bathroom' },
];

const CZECH_WORDS: WordEntry[] = [
  { word: 'Dobrý den', translation: 'good day / hello' },
  { word: 'Děkuji', translation: 'thank you' },
  { word: 'Prosím', translation: 'please / you’re welcome' },
  { word: 'Promiňte', translation: 'excuse me / sorry' },
  { word: 'Na zdraví', translation: 'cheers' },
  { word: 'Dobré ráno', translation: 'good morning' },
  { word: 'Kolik to stojí?', translation: 'how much does that cost?' },
  { word: 'Chutné', translation: 'delicious' },
  { word: 'Kde je...?', translation: 'where is...?' },
  { word: 'Na shledanou', translation: 'goodbye' },
  { word: 'Ano', translation: 'yes' },
  { word: 'Ne', translation: 'no' },
  { word: 'Voda', translation: 'water' },
  { word: 'Toaleta', translation: 'bathroom' },
];

function languageForCity(city: TripCity): TripLanguage {
  return city === 'Prague' ? 'Czech' : 'German';
}

// Picks a stable word for a given trip date — stable meaning the same date
// always yields the same word (no re-randomizing on every render/reload),
// and picked by that date's position among other days in the same language
// so the phrasebook is worked through in order rather than jumping around,
// and Vienna/Salzburg (both German) don't reset back to word #1 partway
// through just because the city changed.
export function getWordOfDay(date: string): { word: string; translation: string; language: TripLanguage } {
  const city = getCityForDate(date);
  const language = languageForCity(city);
  const words = language === 'Czech' ? CZECH_WORDS : GERMAN_WORDS;

  const sameLanguageDates = generateTripDates().filter((d) => languageForCity(getCityForDate(d)) === language);
  const rawIndex = sameLanguageDates.indexOf(date);
  const index = rawIndex === -1 ? 0 : rawIndex % words.length;

  return { ...words[index], language };
}
