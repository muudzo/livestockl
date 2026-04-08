// Vercel Cron → Supabase Edge Function proxy
// Runs every 5 minutes to end expired auctions (replaces pg_cron which requires Pro)

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  // Vercel cron sends CRON_SECRET in Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const res = await fetch(
    `${process.env.VITE_SUPABASE_URL}/functions/v1/end-auctions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({}),
    }
  );

  const data = await res.text();
  return new Response(data, { status: res.status });
}
