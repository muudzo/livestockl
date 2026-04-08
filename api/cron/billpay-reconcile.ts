// Vercel Cron → Supabase Edge Function proxy
// Runs every 10 minutes to reconcile pending BillPay payments

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const res = await fetch(
    `${process.env.VITE_SUPABASE_URL}/functions/v1/billpay-reconcile`,
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
