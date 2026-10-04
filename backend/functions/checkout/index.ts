// Creates a Stripe Checkout session for the signed-in user and returns its URL.
import Stripe from 'https://esm.sh/stripe@14?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: u, error } = await sb.auth.getUser(token);
    if (error || !u.user) return new Response(JSON.stringify({ error: 'Not signed in' }), { status: 401, headers: cors });
    const { returnUrl } = await req.json();
    const { data: sub } = await sb.from('subscriptions').select('*').eq('user_id', u.user.id).maybeSingle();
    let customer = sub?.stripe_customer_id;
    if (!customer) {
      customer = (await stripe.customers.create({ email: u.user.email!, metadata: { user_id: u.user.id } })).id;
      await sb.from('subscriptions').update({ stripe_customer_id: customer }).eq('user_id', u.user.id);
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', customer, line_items: [{ price: Deno.env.get('STRIPE_PRICE_ID')!, quantity: 1 }],
      success_url: returnUrl + '?paid=1', cancel_url: returnUrl, allow_promotion_codes: true,
      subscription_data: { metadata: { user_id: u.user.id } }, client_reference_id: u.user.id,
    });
    return new Response(JSON.stringify({ url: session.url }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) { return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 500, headers: cors }); }
});
