import {
  GRID_START_HOUR,
  GRID_END_HOUR,
  PIXELS_PER_HOUR,
  formatHour,
} from '@/lib/timeUtils';

export default function TimeLabels({ timezone = 'vienna' }: { timezone?: 'vienna' | 'eastern' }) {
  const hours = Array.from(
    { length: GRID_END_HOUR - GRID_START_HOUR },
    (_, i) => GRID_START_HOUR + i
  );
  const totalHeight = (GRID_END_HOUR - GRID_START_HOUR) * PIXELS_PER_HOUR;
  const offsetHours = timezone === 'eastern' ? -6 : 0;

  return (
    <div className="w-16 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" style={{ height: totalHeight }}>
      {hours.map((hour, i) => {
        const displayHour = ((hour + offsetHours) % 24 + 24) % 24;
        return (
          <div
            key={hour}
            className="flex items-start justify-end pr-2"
            style={{ height: PIXELS_PER_HOUR }}
          >
            {i !== 0 && (
              <span
                className="text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-none"
                style={{ marginTop: -6 }}
              >
                {formatHour(displayHour)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
