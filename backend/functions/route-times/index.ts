// Drive times between today's / tomorrow's stops, using Google's Routes API.
// The Google key lives only here (secret GOOGLE_ROUTES_KEY); the app never sees it.
// Signed-in subscribers only, with a daily cap per person and for the whole app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const PER_USER_DAY = 100, APP_DAY = 1500, MAX_STOPS = 10;
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: u } = await sb.auth.getUser(token);
    if (!u?.user) return json({ error: 'Not signed in' }, 401);
    const { data: sub } = await sb.from('subscriptions').select('status,trial_end,period_end').eq('user_id', u.user.id).maybeSingle();
    const now = Date.now(), ok = sub && ((sub.status === 'trialing' && Date.parse(sub.trial_end) > now) || (['active', 'past_due'].includes(sub.status) && (!sub.period_end || Date.parse(sub.period_end) > now - 3 * 864e5)));
    if (!ok) return json({ error: 'Subscription needed' }, 402);
    const { stops, from } = await req.json();
    const fl = from && Number(from.lat), fg = from && Number(from.lng);
    const here = from && fl >= 49 && fl <= 61 && fg >= -9 && fg <= 2 ? { location: { latLng: { latitude: fl, longitude: fg } } } : null;   // phone location, UK only; used for this one lookup and never stored
    const list: string[] = (Array.isArray(stops) ? stops : []).map((s) => String(s || '').slice(0, 200).trim()).filter(Boolean).slice(0, MAX_STOPS);
    if (list.length < (here ? 1 : 2)) return json({ legs: [] });
    const { data: use, error: ue } = await sb.rpc('route_use', { p_user: u.user.id });
    if (ue) return json({ error: 'Usage check failed' }, 500);
    const row = Array.isArray(use) ? use[0] : use;
    if (row.mine > PER_USER_DAY) return json({ error: 'Daily limit reached. Try again tomorrow.' }, 429);
    if (row.total > APP_DAY) return json({ error: 'Drive times are busy. Try again later.' }, 429);
    const wp = (a: string) => ({ address: a });
    const g = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': Deno.env.get('GOOGLE_ROUTES_KEY')!, 'X-Goog-FieldMask': 'routes.legs.duration,routes.legs.distanceMeters' },
      body: JSON.stringify({ origin: here || wp(list[0]), destination: wp(list[list.length - 1]), intermediates: (here ? list.slice(0, -1) : list.slice(1, -1)).map(wp), travelMode: 'DRIVE', regionCode: 'GB', units: 'IMPERIAL' }),
    });
    if (!g.ok) return json({ error: 'Google could not work out the route' }, 502);
    const d = await g.json();
    const legs = ((d.routes || [])[0]?.legs || []).map((l: { duration?: string; distanceMeters?: number }) => ({ mins: Math.round(parseInt(String(l.duration || '0'), 10) / 60), miles: Math.round((l.distanceMeters || 0) / 1609.34 * 10) / 10 }));
    return json({ legs });
  } catch (e) { return json({ error: String((e as Error).message || e) }, 500); }
});
