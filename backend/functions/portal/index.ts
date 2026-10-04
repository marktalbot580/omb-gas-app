// Opens the Stripe billing portal (update card, cancel, invoices) for the signed-in user.
import Stripe from 'https://esm.sh/stripe@14?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: u } = await sb.auth.getUser(token);
    if (!u?.user) return new Response(JSON.stringify({ error: 'Not signed in' }), { status: 401, headers: cors });
    const { returnUrl } = await req.json();
    const { data: sub } = await sb.from('subscriptions').select('stripe_customer_id').eq('user_id', u.user.id).maybeSingle();
    if (!sub?.stripe_customer_id) return new Response(JSON.stringify({ error: 'No subscription yet' }), { status: 400, headers: cors });
    const s = await stripe.billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: returnUrl });
    return new Response(JSON.stringify({ url: s.url }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) { return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 500, headers: cors }); }
});
