const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

function sendJson(response, status, body) {
  return response.status(status).json(body);
}

async function getAccessToken(clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!tokenResponse.ok) {
    throw new Error(`Spotify token failed: ${tokenResponse.status}`);
  }

  const tokenBody = await tokenResponse.json();
  return tokenBody.access_token;
}

async function spotifyGet(url, token) {
  const spotifyResponse = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!spotifyResponse.ok) {
    throw new Error(`Spotify request failed: ${spotifyResponse.status}`);
  }

  return spotifyResponse.json();
}

async function spotifyGetAll(url, token) {
  const items = [];
  let nextUrl = url;
  while (nextUrl) {
    const page = await spotifyGet(nextUrl, token);
    items.push(...(page.items || []));
    nextUrl = page.next;
  }
  return items;
}

function uniqueAlbums(albums) {
  const seen = new Set();
  return albums.filter((album) => {
    const key = album.id || `${album.name}:${album.release_date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toTrackPayload(track, album) {
  const url = track.external_urls?.spotify || "";
  return {
    id: track.id || "",
    title: track.name || "",
    year: String(album.release_date || "").slice(0, 4),
    releaseDate: album.release_date || "",
    url,
    embedUrl: url ? url.replace("https://open.spotify.com/", "https://open.spotify.com/embed/") : "",
    previewUrl: track.preview_url || "",
    album: album.name || "",
    albumImage: album.images?.[0]?.url || ""
  };
}

module.exports = async function spotifyTracks(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const artistId = process.env.SPOTIFY_ARTIST_ID;
  const market = process.env.SPOTIFY_MARKET || "HU";

  if (!clientId || !clientSecret || !artistId) {
    return sendJson(response, 503, { error: "Spotify catalog is not configured" });
  }

  try {
    const token = await getAccessToken(clientId, clientSecret);
    const albumsUrl = `${SPOTIFY_API_URL}/artists/${encodeURIComponent(artistId)}/albums?include_groups=album,single&market=${encodeURIComponent(market)}&limit=50`;
    const albums = uniqueAlbums(await spotifyGetAll(albumsUrl, token));
    const tracks = [];
    const seenTracks = new Set();

    for (const album of albums) {
      const tracksUrl = `${SPOTIFY_API_URL}/albums/${encodeURIComponent(album.id)}/tracks?market=${encodeURIComponent(market)}&limit=50`;
      const albumTracks = await spotifyGetAll(tracksUrl, token);
      albumTracks.forEach((track) => {
        const belongsToArtist = (track.artists || []).some((artist) => artist.id === artistId);
        const key = track.id || `${track.name}:${album.release_date}`;
        if (!belongsToArtist || seenTracks.has(key)) return;
        seenTracks.add(key);
        tracks.push(toTrackPayload(track, album));
      });
    }

    tracks.sort((left, right) => {
      const dateSort = String(left.releaseDate).localeCompare(String(right.releaseDate));
      if (dateSort !== 0) return dateSort;
      return String(left.title).localeCompare(String(right.title));
    });

    response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=86400");
    return sendJson(response, 200, { source: "spotify", tracks });
  } catch (error) {
    return sendJson(response, 502, { error: error.message || "Spotify catalog fetch failed" });
  }
};
