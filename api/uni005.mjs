// Only release provenance and service availability leave this endpoint.
export default async function status(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();
  const env = process.env;
  const github = env.VERCEL_GIT_PROVIDER === 'github' && /^[a-f0-9]{40}$/i.test(env.VERCEL_GIT_COMMIT_SHA || '') ? 'connected' : 'unknown';
  const vercel = env.VERCEL === '1' ? 'connected' : 'unknown';
  const url = 'https://jrpchxdaylhdkkxbtump.supabase.co';
  const key = 'sb_publishable_Vrsk6OMwltLHU-EE0Te6rQ_7IDES5zL';
  let supabase = 'unknown';
  if (url && key) {
    try {
      const response = await fetch(new URL('/auth/v1/health', url), {
        headers: {apikey: key}, redirect: 'error', signal: AbortSignal.timeout(4500)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.version && data.name) supabase = 'connected';
      } else if (response.status !== 429) supabase = 'failed';
    } catch { /* No definitive response. */ }
  }
  res.json({github,vercel,supabase});
}
