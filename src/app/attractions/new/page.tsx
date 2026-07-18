import { redirect } from 'next/navigation';
import { createAttraction } from '@/app/actions';
import { generateTripDates, formatDateFull, CATEGORY_LABELS, CATEGORY_ICONS } from '@/lib/utils';
import { Category } from '@/lib/types';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import TimeInput from '@/components/TimeInput';
import { OfflineFormBanner, NewAttractionSubmitButton } from '@/components/NewAttractionSubmit';
import TicketUploadField from '@/components/TicketUploadField';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewAttractionPage() {
  async function handleSubmit(formData: FormData) {
    'use server';
    await createAttraction(formData);
    redirect('/');
  }

  const tripDates = generateTripDates();
  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4">
      <div className="max-w-md mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to calendar
        </Link>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-7">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Add Event</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-7">Add something to your Vienna trip</p>

          <OfflineFormBanner />

          <form action={handleSubmit} encType="multipart/form-data" className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Name <span className="text-red-400 normal-case font-normal">required</span>
              </label>
              <input
                name="name"
                type="text"
                required
                placeholder="e.g. Schönbrunn Palace"
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Schedule for day
              </label>
              <select
                name="scheduled_date"
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
              >
                <option value="">Unscheduled (add to calendar later)</option>
                {tripDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDateFull(date)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Start time
                </label>
                <TimeInput
                  name="start_time"
                  defaultValue=""
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  End time
                </label>
                <TimeInput
                  name="end_time"
                  defaultValue=""
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat, i) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 has-[:checked]:border-blue-400 dark:has-[:checked]:border-blue-700 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-950/40 transition-colors text-sm"
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat}
                      defaultChecked={i === 0}
                      className="sr-only"
                    />
                    <span>{CATEGORY_ICONS[cat]}</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium text-xs">{CATEGORY_LABELS[cat]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Location
              </label>
              <LocationAutocomplete
                name="location"
                defaultValue=""
                placeholder="Address or place name"
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Description
              </label>
              <textarea
                name="description"
                rows={2}
                placeholder="Brief description of the attraction..."
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>

            <TicketUploadField />

            <div className="flex gap-3 pt-2">
              <Link
                href="/"
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </Link>
              <NewAttractionSubmitButton />
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
