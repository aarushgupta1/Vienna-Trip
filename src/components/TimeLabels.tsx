import {
  GRID_START_HOUR,
  GRID_END_HOUR,
  PIXELS_PER_HOUR,
  formatHour,
} from '@/lib/timeUtils';

export default function TimeLabels() {
  const hours = Array.from(
    { length: GRID_END_HOUR - GRID_START_HOUR },
    (_, i) => GRID_START_HOUR + i
  );
  const totalHeight = (GRID_END_HOUR - GRID_START_HOUR) * PIXELS_PER_HOUR;

  return (
    <div className="w-16 shrink-0 border-r border-gray-200 bg-white" style={{ height: totalHeight }}>
      {hours.map((hour, i) => (
        <div
          key={hour}
          className="flex items-start justify-end pr-2"
          style={{ height: PIXELS_PER_HOUR }}
        >
          <span
            className="text-[10px] text-gray-400 font-medium leading-none"
            // 7am has no hour line above it so nudge it down slightly;
            // all other labels float just above their hour line.
            style={{ marginTop: i === 0 ? 4 : -6 }}
          >
            {formatHour(hour)}
          </span>
        </div>
      ))}
    </div>
  );
}
