# Spotify landing setup

Ez a landing oldal a `index.html`, `out.html`, `assets/site.css`,
`assets/site.js` es `assets/visionfakerz-mark.svg` fajlokbol all.

## Spotify katalogus

Az oldal indulaskor megprobalja a `/api/spotify-tracks` endpointon keresztul
Spotify-bol betolteni a VisionFakerZ katalogust. Igy ha uj track kerul fel
Spotify-ra, a track-by-track lista automatikusan frissul a kovetkezo
Vercel futas/cache frissites utan. Ha a Spotify API env vars nincsenek
beallitva, a kezzel megadott fallback lista marad lathato.

Vercelen ezek kellenek:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_ARTIST_ID`
- `SPOTIFY_MARKET=HU`

Vercel CLI-vel:

```powershell
npx vercel@latest env add SPOTIFY_CLIENT_ID production
npx vercel@latest env add SPOTIFY_CLIENT_SECRET production
npx vercel@latest env add SPOTIFY_ARTIST_ID production
npx vercel@latest env add SPOTIFY_MARKET production
npx vercel@latest env add SPOTIFY_CLIENT_ID preview
npx vercel@latest env add SPOTIFY_CLIENT_SECRET preview
npx vercel@latest env add SPOTIFY_ARTIST_ID preview
npx vercel@latest env add SPOTIFY_MARKET preview
```

A pontos fallback Spotify URL-eket az `assets/site.js` elejen lehet cserelni:

- `artistUrl`: VisionFakerZ Spotify artist oldal
- `playlistUrl`: This Is VisionFakerZ playlist oldal
- `playlistEmbedUrl`: ugyanennek az embed linkje
- `tracks[].url`: az adott szam Spotify linkje
- `tracks[].embedUrl`: az adott szam embed linkje

Spotify embed linkhez altalaban eleg az eredeti `open.spotify.com/...` linkbe
az `/embed` reszt beszurni: `https://open.spotify.com/embed/track/...`.

## Visualizer

Az above-the-fold blokkban a Spotify playlist embed mellett egy canvas visualizer
fut. A hangulatot az `assets/site.js` `tracks[]` listajan belul ezek a mezok
vezerlik:

- `mood`: a visualizer alatt latszo rovid hangulatleiras
- `palette`: a track szinei
- `pattern`: a vizual stilusa (`rain`, `echo`, `tunnel`, `cards`, `grid`, `teeth`)

A Spotify iframe cross-origin, ezert nem lehet biztosan kiolvasni, hogy a user
pont melyik szamot inditotta el benne. Emiatt a visualizer track-kartyak
`Visualize` gombjara, illetve a track iframe fokuszara valt.

## Konverziomeres

A Spotify nem ad vissza publikus bongeszos callbacket arrol, hogy valaki a
kattintas utan tenyleg followolt vagy mentett-e. Emiatt az oldal a legerosebb
merheto szandekot meri: a koveto, playlist-save es track-save CTA kattintasokat.

A merheto esemenyek:

- `spotify_follow_click`
- `playlist_save`
- `track_save`
- `preview_play`

GA4 bekoteshez:

1. Az `assets/site.js` fajlban add meg a `GA_MEASUREMENT_ID` erteket.
2. GA4-ben jelold key eventnek a fenti esemenyeket.
3. Kampanyokhoz hasznalj UTM parametereket a landing URL-en.

Az `out.html` elobb elkuldi az esemenyt GA4/dataLayer fele, majd tovabbviszi a
latogatot a Spotify-ra. Az atiranyito csak `https://open.spotify.com/...`
linkeket enged.

Supabase bekoteshez Vercelen allitsd be:

- `SUPABASE_URL=https://hgwendvgyhlyyuslehhg.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` vagy `SUPABASE_ANON_KEY`

Vercel CLI-vel:

```powershell
npx vercel@latest env add SUPABASE_URL production
npx vercel@latest env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel@latest env add SUPABASE_URL preview
npx vercel@latest env add SUPABASE_SERVICE_ROLE_KEY preview
```

Helyi teszthez masold a `.env.example` fajlt `.env.local` neven, es toltsd ki
a kulcsot. A service role key-t ne commitold.

Supabase SQL editorban futtasd:

- `supabase/email_subscribers.sql`
- `supabase/conversions.sql`

A `conversions` tabla meri:

- event nev
- Spotify action/label/target
- track cim
- timestamp (`occurred_at`)
- referrer
- device (`mobile`, `tablet`, `desktop`)
- oldal path
- user agent
