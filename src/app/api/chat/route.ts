import { NextRequest } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { getAttractions } from '@/app/actions';
import { getPins } from '@/app/logistics/actions';
import {
  CATEGORY_LABELS,
  PIN_CATEGORY_META,
  TRIP_START,
  TRIP_END,
  generateTripDates,
  formatDateFull,
  formatTime,
} from '@/lib/utils';
import { Attraction, LogisticsPin } from '@/lib/types';

export const runtime = 'nodejs';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function buildTripContext(attractions: Attraction[], pins: LogisticsPin[]): string {
  const scheduleText = generateTripDates()
    .map((date) => {
      const events = attractions
        .filter((a) => a.scheduled_date === date)
        .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
      const label = formatDateFull(date);
      if (events.length === 0) return `${label}: nothing scheduled`;
      const lines = events.map((a) => {
        const time = a.start_time
          ? `${formatTime(a.start_time)}${a.end_time ? `–${formatTime(a.end_time)}` : ''}`
          : 'unscheduled time';
        const loc = a.location ? ` @ ${a.location}` : '';
        const notes = a.notes ? ` — notes: ${a.notes}` : '';
        return `  - [${CATEGORY_LABELS[a.category]}] ${a.name} (${time})${loc}${notes}`;
      });
      return `${label}:\n${lines.join('\n')}`;
    })
    .join('\n\n');

  const unscheduled = attractions.filter((a) => !a.scheduled_date);
  const unscheduledText = unscheduled.length
    ? `\n\nUnscheduled ideas (not yet on the calendar):\n${unscheduled.map((a) => `  - ${a.name}`).join('\n')}`
    : '';

  const pinsText = pins.length
    ? `\n\nLogistics info:\n${pins
        .map((p) => `  - [${PIN_CATEGORY_META[p.category].label}] ${p.title}: ${p.content}`)
        .join('\n')}`
    : '';

  return `You are a friendly, concise trip-planning assistant for a family vacation to Vienna, Austria (${formatDateFull(TRIP_START)} – ${formatDateFull(TRIP_END)}).

Here is the family's current itinerary and logistics info:

${scheduleText}${unscheduledText}${pinsText}

Answer questions about the schedule, suggest ideas for free time, and help with trip logistics. Keep responses short and conversational — this is a chat widget, not a report. You cannot edit the schedule yourself; if asked to change something, tell them to use the calendar in the app.`;
}

export async function POST(request: NextRequest) {
  const client = getAnthropicClient();
  if (!client) {
    return new Response(
      "The trip assistant isn't set up yet — add an ANTHROPIC_API_KEY to your environment.",
      { status: 503 }
    );
  }

  let messages: ChatMessage[];
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    messages = [];
  }
  if (messages.length === 0) {
    return new Response('No messages provided.', { status: 400 });
  }

  const [attractions, pins] = await Promise.all([getAttractions(), getPins()]);
  const system = buildTripContext(attractions, pins);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const anthropicStream = client.messages.stream({
        model: 'claude-opus-4-8',
        max_tokens: 2048,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      anthropicStream.on('text', (delta) => {
        controller.enqueue(encoder.encode(delta));
      });
      try {
        await anthropicStream.finalMessage();
      } catch {
        controller.enqueue(
          encoder.encode('\n\n[Something went wrong reaching Claude — please try again.]')
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
