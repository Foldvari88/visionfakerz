const ALLOWED_EVENTS = new Set([
  "spotify_follow_click",
  "playlist_save",
  "track_save",
  "preview_play",
  "email_signup_submit",
  "spotify_click"
]);

module.exports = async function events(request, response) {
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

  let body;
  try {
    body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  } catch {
    return response.status(400).json({ error: "Invalid JSON" });
  }
  const eventName = String(body.event || "spotify_click").slice(0, 80);
  if (!ALLOWED_EVENTS.has(eventName)) {
    return response.status(400).json({ error: "Invalid event" });
  }

  const payload = {
    event_name: eventName,
    spotify_action: String(body.spotify_action || "").slice(0, 80),
    spotify_label: String(body.spotify_label || "").slice(0, 180),
    spotify_target: String(body.spotify_target || "").slice(0, 700),
    track_title: String(body.track_title || "").slice(0, 180),
    page_path: String(body.page_path || "").slice(0, 240),
    referrer: String(body.referrer || request.headers.referer || "").slice(0, 700),
    device: String(body.device || "").slice(0, 40),
    user_agent: String(request.headers["user-agent"] || "").slice(0, 500),
    occurred_at: body.timestamp || new Date().toISOString()
  };

  const insertUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/conversion_events`;
  const supabaseResponse = await fetch(insertUrl, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!supabaseResponse.ok) {
    const error = await supabaseResponse.text();
    return response.status(502).json({ error: error || "Supabase insert failed" });
  }

  return response.status(200).json({ ok: true });
};
