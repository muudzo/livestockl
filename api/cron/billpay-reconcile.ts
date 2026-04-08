// Vercel Cron → Supabase Edge Function proxy
// Runs every 10 minutes to reconcile pending BillPay payments

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return new Response('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars', { status: 500 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/billpay-reconcile`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({}),
    });

    const data = await res.text();
    return new Response(data, { status: res.status });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return new Response('Edge function timed out', { status: 504 });
    }
    return new Response(err.message, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
