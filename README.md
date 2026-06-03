# VisionFakerz bulk reel factory

Ez a workspace egy gyors, tomeges 15 masodperces reel gyarto alap.

## Mappa-struktura

- `assets/backgrounds/` - ide tedd a hattervideokat vagy hatterkepeket
- `assets/music/track.mp3` - ide tedd az allando zenet ezen a neven
- `data/reels.csv` - minden sor egy kulon reel
- `output/` - ide kerulnek a kesz MP4 fajlok
- `canva/canva_bulk_create.csv` - Canva Bulk Create-hoz hasznalhato tabla

## Gyors hasznalat

Dupla kattintasos inditok:

1. `0_open_project_folder.bat` - megnyitja a projekt mappat
2. `1_generate_csv.bat` - CSV-k generalasa a `data/captions.txt` alapjan
3. `2_preview_background_queries.bat` - megmutatja, milyen hatterkereseseket valasztana
4. `3_download_backgrounds_pexels.bat` - Pexels hattervideok letoltese
5. `3_download_backgrounds_pixabay.bat` - Pixabay hattervideok letoltese
6. `4_build_reels.bat` - kesz reelek renderelese az `output/` mappaba
7. `5_open_style_settings.bat` - feliratstilus es allokep-mozgas beallitasai
8. `6_create_music_snippets.bat` - sajat VisionFakerz zenekbol 15 mp snippetek vagasa

Kezi PowerShell hasznalat:

1. Masold a fix zenet ide: `assets/music/track.mp3`, vagy tedd a teljes sajat zeneket az `assets/music/source_tracks/` mappaba es futtasd a `6_create_music_snippets.bat` fajlt.
2. Masold vagy toltsd le a hattervideokat vagy hatterkepeket ide: `assets/backgrounds/`
3. Ird be a feliratokat a `data/captions.txt` fajlba, soronkent egyet.
4. Generald ujra a CSV-ket:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\new-reels-csv.ps1
```

5. Futtasd a renderelest:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-reels.ps1
```

A script minden CSV sorbol keszit egy 1080x1920-as, 15 masodperces MP4-et.

## CSV oszlopok

- `id` - sorszam vagy azonosito
- `caption` - a videon megjeleno felirat
- `background` - opcionális; konkret fajlnev az `assets/backgrounds/` mappabol
- `filename` - opcionális; kimeneti fajlnev `.mp4` nelkul

Ha a `background` ures, a script korbeforgatja az osszes talalt hatterfajlt.

Tamogatott hatterek:

- Video: `.mp4`, `.mov`, `.m4v`, `.webm`, `.mkv`
- Kep: `.jpg`, `.jpeg`, `.png`, `.webp`

## Canva workflow

Canvaban csinalj egy 1080x1920-es Reel/Story sablont:

1. Tegyel ra egy nagy hatter placeholdert.
2. Tegyel ra egy felirat szovegdobozt.
3. Bulk Create-ban toltsd fel a `canva/canva_bulk_create.csv` fajlt.
4. Kotssd ossze a `Caption` mezot a feliratdobozzal.
5. A hattereket vagy Canva Magic Media-val generald, vagy toltsd fel assetkent.
6. Exportald MP4-kent. Ha az audio vagy kulon fajlos export maceras, exportalj visual/silent verziot, es hasznald ezt a lokalis scriptet a fix zene ramelegitesere.

## Hatter promptok

A `canva/background_prompts.csv` ad gyors prompt mintakat Canva Magic Media-hoz. Ezeket szabadon atirhatod a sajat stilusodra.

## Automatikus ingyenes stock hattervideok

A `scripts/download-backgrounds.ps1` Pexels es/vagy Pixabay API-bol tud vertikalis hattervideokat letolteni, majd visszairja a valasztott fajlnevet a `data/reels.csv` `background` oszlopaba.

API kulcsok beallitasa:

```powershell
$env:PEXELS_API_KEY="ide_jon_a_pexels_kulcs"
$env:PIXABAY_API_KEY="ide_jon_a_pixabay_kulcs"
```

Pexels hasznalata:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\download-backgrounds.ps1 -Provider pexels -MaxDownloads 25
```

Megnezheted API kulcs nelkul is, milyen keresokifejezest valasztana a feliratokhoz:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\download-backgrounds.ps1 -ListQueriesOnly
```

Pixabay hasznalata:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\download-backgrounds.ps1 -Provider pixabay -MaxDownloads 25
```

A relevanciat a `data/background_query_rules.csv` kezeli. Ha egy konkret sorhoz te akarsz keresokifejezest adni, adj a `data/reels.csv`-hez egy `background_query` oszlopot.

A letoltesek metaadatai itt lesznek: `assets/backgrounds/background_manifest.csv`. Ez megtartja a forraslinket, szerzot es licencnevet, hogy kesobb visszakeresheto legyen minden hatter.

Fontos: a Pexels es Pixabay ingyenes/royalty-free stock forrasok, de sajat API limitekkel es licencfeltetelekkel. Ne indits feleslegesen nagyon nagy, ismetlodo tomegletoltest; kezdesnek 25-100 hatter boven eleg egy nagyobb reel poolhoz.

## Feliratstilus es allokep animacio

A globalis kinezet itt allithato: `data/reel_style.json`.

Fontosabb mezok:

- `font_name` - betutipus, pelda: `Arial`
- `font_size` - felirat merete
- `max_line_length` - kb. hany karakter utan torje uj sorba
- `caption_position` - `top`, `center` vagy `bottom`
- `caption_margin` - tavolsag a szeletol top/bottom pozicional
- `text_color` - szovegszin, pelda: `#FFFFFF`
- `box_color` - szoveg mogotti doboz szine
- `box_opacity` - doboz atlatszatlansaga 0 es 1 kozott
- `image_motion` - allokepeknel: `auto`, `zoom_in`, `pan_left`, `pan_right`, `zoom_drift`
- `image_zoom_end` - mekkora legyen a vegso zoom, pelda: `1.16`

Ha egy konkret reelnel mas beallitas kell, a `data/reels.csv` soraba adhatsz extra oszlopokat ilyen nevekkel: `caption_position`, `font_size`, `image_motion`, `text_color`, `box_opacity`.

## Spotify es zenei snippetek

Spotify streambol vagy Spotify preview clipbol nem keszitunk videoba egetett hangot. A Spotify Developer Policy tiltja a Spotify sound recordingok vizualis mediaval valo szinkronizalasat, beleertve a videot is.

A jogtiszta workflow:

1. A Spotify oldalt/artist profilt csak tracklista es promozos metaadat forrasnak hasznaljuk.
2. A tenyleges hangot a sajat, jogtiszta VisionFakerz master fajlokbol vesszuk.
3. Tedd a teljes trackeket ide: `assets/music/source_tracks/`
4. Futtasd: `6_create_music_snippets.bat`
5. A snippetek ide kerulnek: `assets/music/snippets/`
6. A render script automatikusan rotalja a snippeteket a videok alatt.

Ha egy konkret reelhez konkret snippet kell, adj `music` oszlopot a `data/reels.csv` fajlhoz, es ird bele a snippet fajlnevet.
