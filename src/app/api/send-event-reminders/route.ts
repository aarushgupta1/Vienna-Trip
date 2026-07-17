import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { getViennaNow } from '@/lib/viennaTime';
import { timeToMinutes } from '@/lib/timeUtils';
import { formatTime } from '@/lib/utils';

// Not a page — always run this fresh, never statically cached.
export const dynamic = 'force-dynamic';

const REMINDER_MINUTES = 30;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // Refuse to run wide open if it's never been configured.

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  const querySecret = request.nextUrl.searchParams.get('secret');
  return querySecret === secret;
}

interface AttractionRow {
  id: string;
  name: string;
  location: string | null;
  scheduled_date: string;
  start_time: string;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Triggered on a schedule (see vercel.json or supabase/reminders_cron.sql —
// Vercel's Hobby plan only allows daily cron, which isn't frequent enough
// here, so Supabase's pg_cron is the more reliable option for most people).
// Finds every scheduled attraction starting in the next 30 minutes that
// hasn't already had a reminder sent, and pushes a notification to every
// device that's enabled alerts.
async function handleReminders(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return NextResponse.json({ error: 'Push not configured (missing VAPID keys)' }, { status: 500 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:example@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const supabase = getSupabase();
  const now = getViennaNow();

  const { data: attractions, error: attractionsError } = await supabase
    .from('attractions')
    .select('id, name, location, scheduled_date, start_time')
    .eq('scheduled_date', now.date)
    .not('start_time', 'is', null);

  if (attractionsError) {
    return NextResponse.json({ error: attractionsError.message }, { status: 500 });
  }

  const upcoming = ((attractions ?? []) as AttractionRow[]).filter((a) => {
    const minutesUntil = timeToMinutes(a.start_time) - now.minutes;
    return minutesUntil >= 0 && minutesUntil <= REMINDER_MINUTES;
  });

  if (upcoming.length === 0) {
    return NextResponse.json({ checked: 0, reminded: 0, pushesSent: 0 });
  }

  const { data: alreadySent } = await supabase
    .from('event_reminders_sent')
    .select('attraction_id')
    .in('attraction_id', upcoming.map((a) => a.id));
  const alreadySentIds = new Set((alreadySent ?? []).map((r) => r.attraction_id as string));

  const toRemind = upcoming.filter((a) => !alreadySentIds.has(a.id));
  if (toRemind.length === 0) {
    return NextResponse.json({ checked: upcoming.length, reminded: 0, pushesSent: 0 });
  }

  const { data: subscriptions, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth');
  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }

  const subs = (subscriptions ?? []) as SubscriptionRow[];
  const invalidSubscriptionIds = new Set<string>();
  let pushesSent = 0;

  for (const attraction of toRemind) {
    const title = `Starting soon: ${attraction.name}`;
    const body = attraction.location
      ? `Starts at ${formatTime(attraction.start_time)} — ${attraction.location}`
      : `Starts at ${formatTime(attraction.start_time)}`;
    const payload = JSON.stringify({ title, body, tag: `event-${attraction.id}`, url: '/' });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          pushesSent++;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Subscription is gone (browser data cleared, uninstalled, etc.) — prune it.
            invalidSubscriptionIds.add(sub.id);
          }
        }
      })
    );

    // Marked as handled regardless of individual push failures above — the
    // reminder cycle for this attraction has been attempted; we don't want
    // to keep retrying it every cron tick until its start time passes.
    await supabase.from('event_reminders_sent').insert({ attraction_id: attraction.id });
  }

  if (invalidSubscriptionIds.size > 0) {
    await supabase.from('push_subscriptions').delete().in('id', [...invalidSubscriptionIds]);
  }

  return NextResponse.json({
    checked: upcoming.length,
    reminded: toRemind.length,
    pushesSent,
    subscriptionsPruned: invalidSubscriptionIds.size,
  });
}

export async function GET(request: NextRequest) {
  return handleReminders(request);
}

export async function POST(request: NextRequest) {
  return handleReminders(request);
}
