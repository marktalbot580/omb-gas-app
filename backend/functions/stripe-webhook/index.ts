// Stripe calls this when a payment succeeds, fails, renews or is cancelled; it keeps the subscriptions table up to date.
// Deploy with "Verify JWT" switched OFF (Stripe does not send a Supabase login).
import Stripe from 'https://esm.sh/stripe@14?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), req.headers.get('stripe-signature')!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  } catch (e) { return new Response('Bad signature', { status: 400 }); }
  const apply = async (s: Stripe.Subscription) => {
    const status = s.status === 'active' || s.status === 'trialing' ? 'active' : s.status === 'past_due' || s.status === 'unpaid' ? 'past_due' : 'canceled';
    const patch = { status, period_end: new Date(s.current_period_end * 1000).toISOString(), stripe_subscription_id: s.id, stripe_customer_id: String(s.customer), updated_at: new Date().toISOString() };
    const uid = s.metadata?.user_id;
    const q = sb.from('subscriptions').update(patch);
    await (uid ? q.eq('user_id', uid) : q.eq('stripe_customer_id', String(s.customer)));
  };
  if (event.type === 'checkout.session.completed') {
    const c = event.data.object as Stripe.Checkout.Session;
    if (c.subscription) await apply(await stripe.subscriptions.retrieve(String(c.subscription)));
  } else if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
    await apply(event.data.object as Stripe.Subscription);
  } else if (event.type === 'invoice.payment_failed') {
    const inv = event.data.object as Stripe.Invoice;
    await sb.from('subscriptions').update({ status: 'past_due' }).eq('stripe_customer_id', String(inv.customer));
  }
  return new Response('ok');
});
