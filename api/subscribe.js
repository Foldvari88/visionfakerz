const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function subscribe(request, response) {
  if (request.method === "OPTIONS") {
    response.setHeader("Allow", "POST, OPTIONS");
    return response.status(204).end();
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return response.status(503).json({ error: "Supabase is not configured" });
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return response.status(400).json({ error: "Invalid email" });
  }

  const payload = {
    email,
    source: String(body.source || "visionfakerz_landing").slice(0, 120),
    page_path: String(body.page_path || "").slice(0, 240),
    referrer: String(body.referrer || "").slice(0, 500),
    user_agent: String(request.headers["user-agent"] || "").slice(0, 500)
  };

  const insertUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/email_subscribers?on_conflict=email`;
  const supabaseResponse = await fetch(insertUrl, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!supabaseResponse.ok) {
    const error = await supabaseResponse.text();
    return response.status(502).json({ error: error || "Supabase insert failed" });
  }

  return response.status(200).json({ ok: true });
};
