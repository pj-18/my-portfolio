# Portfolio

A one-page personal site: work, a Letterboxd film diary, photographs and chess. It is a static
site built with [Astro](https://astro.build) and TypeScript. All content lives in Markdown and
JSON files, the film diary and chess ratings are fetched when the site is built (never in the
visitor's browser), and a GitHub Actions workflow rebuilds and publishes it every day.

- [Quick start](#quick-start)
- [Where things live](#where-things-live)
- [Editing content](#editing-content)
- [Placeholders to replace](#placeholders-to-replace)
- [Deploy](#deploy)
- [Analytics (optional, off by default)](#analytics-optional-off-by-default)
- [Checks and measured results](#checks-and-measured-results)
- [Troubleshooting](#troubleshooting)
- [Credits and licences](#credits-and-licences)

## Quick start

You need Node 24 (the version in `.nvmrc`; 22.23.4 or newer also works).

```sh
npm install
npm run dev          # http://localhost:4321, reloads as you edit
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Fetches the diary and ratings if the last fetch is over six hours old, then starts the dev server. |
| `npm run build` | Fetches fresh data, then builds the site into `dist/`. |
| `npm run preview` | Serves `dist/` locally, exactly as it will be published. |
| `npm run sync` | Only fetches the Letterboxd diary, posters and chess ratings. |
| `npm run placeholders` | Lists the sample content you have not replaced yet. |
| `npm test` | Unit tests for the feed and ratings parsers. |
| `npm run check` | Type-checks every `.astro` and `.ts` file. |

## Where things live

```
content/                 everything you write
  site.json              name, tagline, domain, email, links, usernames, section titles
  bio.md                 the paragraphs at the top of Work
  experience/*.md        one file per role
  projects/*.md          one file per project
  skills.json            skill groups
  chess.md               chess blurb, manual ratings, notes on the favourite game
  favourite-game.pgn     the game shown on the board
  films-sample.json      sample diary, shown only until you set a Letterboxd username
photos/                  your photographs, plus captions.json
public/                  favicon, and _headers (response headers for Cloudflare Pages)
scripts/sync.ts          fetches Letterboxd and chess data before a build
src/components/          one file per section of the page
src/styles/global.css    colours, type and shared styles
src/generated/           fetched data (git-ignored, recreated by `npm run sync`)
.github/workflows/       the build, daily rebuild and deploy
```

You should rarely need to open anything outside `content/` and `photos/`.

## Editing content

Every content file is checked when the site builds. If a value is missing or malformed, the
build stops and names the file and the field.

### Your details and links: `content/site.json`

| Field | Used for |
| --- | --- |
| `name`, `role` | The hero, the page title, social cards, structured data. |
| `location` | Optional. Shown in the hero when filled in. |
| `tagline` | The one-line statement under your name. |
| `description` | The description search engines and link previews show. |
| `url` | Your domain, e.g. `https://yourdomain.com`. Drives canonical links, the sitemap, `robots.txt` and social cards. |
| `locale` | How dates are written (`en-GB` gives "8 Nov 2026", `en-US` gives "Nov 8, 2026"). |
| `email` | The Contact section. |
| `links` | Your profiles, in the order they should appear. Each is `{ "label": "GitHub", "url": "https://…" }`. Add or remove as many as you like. |
| `letterboxd.username` | Your Letterboxd username (not the full URL). `entries` is how many diary entries to show, 1 to 24. |
| `chess.platform`, `chess.username` | `"lichess"` or `"chesscom"`, and your username there. |
| `sections` | The title, hero summary and intro line of each section. |

Letterboxd and your chess profile are added to the Contact links automatically once the
usernames are set, so do not list them again under `links`.

The social card image (`/og.png`) is drawn from `name`, `role` and `tagline` at build time.
There is nothing to design or upload.

### Work

- **Bio**: `content/bio.md`. Plain Markdown.
- **Experience**: one Markdown file per role in `content/experience/`. Newest first, sorted
  by `start`. Leave out `end` for your current role.

  ```md
  ---
  role: Senior Software Engineer
  company: Company One
  companyUrl: https://company.example   # optional
  location: City, Country               # optional
  start: "2022-03"
  end: "2024-06"                        # leave out for a current role
  stack: [TypeScript, Go, PostgreSQL]
  ---

  A sentence or two, then bullet points.
  ```

- **Projects**: one Markdown file per project in `content/projects/`. Lower `order` comes
  first.

  ```md
  ---
  title: Project One
  year: 2025
  role: Design and build                # optional
  stack: [TypeScript, Astro]
  links:
    - { label: Source, url: "https://github.com/you/project" }
  order: 1
  ---

  What the problem was, what you built, what changed.
  ```

- **Skills**: `content/skills.json`, a list of groups, each with a `name` and `items`.

To add a role or project, copy an existing file and rename it. To remove one, delete the file.

### Films

Set `letterboxd.username` in `content/site.json`. That is all. Each build reads your public
diary feed (`https://letterboxd.com/<username>/rss/`), keeps the latest entries, and downloads
and re-encodes their posters so that nothing is loaded from Letterboxd by the visitor.

- The most recent entry is featured; the rest are listed below it.
- Each entry shows the poster, title, year, star rating, a short excerpt of the review and a
  link to the entry. Reviews you marked as containing spoilers are not quoted.
- If Letterboxd cannot be reached during a build, the entries from the last successful fetch
  are kept and the section shows the date they were fetched. If there has never been a
  successful fetch, the section shows a short message with a link to your profile. The build
  itself never fails because of the feed.
- Until a username is set, the section shows the entries in `content/films-sample.json`,
  labelled as samples.

### Photography

1. Export a JPEG (PNG, WebP, AVIF and TIFF also work) about 2560 px wide and drop it in
   `photos/`. Larger files are scaled down; smaller ones are never scaled up.
2. Add an entry to `photos/captions.json`, keyed by the file name:

   ```json
   "13-harbour.jpg": {
     "title": "Harbour, early",
     "alt": "Fishing boats moored in still water under a pale pink sky.",
     "location": "Lisbon",
     "date": "Feb 2026"
   }
   ```

   Only `alt` really matters: it is what a screen reader reads out, so describe what is in the
   picture. `title` falls back to the file name ("13-harbour.jpg" becomes "Harbour"),
   `location` is optional, and `date` is only needed to override the capture date in the file.
   The build prints a warning for any photo without `alt`.

Photos appear in file-name order, so the number at the front (`01-`, `02-`, …) sets the
sequence. To remove a photo, delete the file and its caption.

What the build does with each photo:

- Makes AVIF, WebP and JPEG versions at several widths; the browser picks the smallest that
  is sharp enough. The gallery reserves each photo's space in advance, so nothing jumps as
  images load.
- Reads camera, lens, focal length, aperture, shutter speed, ISO and the month taken from the
  file's EXIF data, when present, and shows them in the viewer.
- Never reads location (GPS) data, and strips all metadata from the published images. Your
  original files are not published.

### Chess

- **Ratings**: set `chess.platform` and `chess.username` in `content/site.json` and they are
  fetched from Lichess or Chess.com at build time. Until then, and whenever the service
  cannot be reached and there is no earlier fetch, the site shows the `ratings` written at the
  top of `content/chess.md`. Keep those roughly current.
- **Blurb**: the body of `content/chess.md`.
- **Favourite game**: replace `content/favourite-game.pgn` with any PGN (both Lichess and
  Chess.com can export one from a game's page). The players, event, place, year and result
  come from the PGN headers. A PGN that holds only a position (a `[FEN "…"]` header and no
  moves) works too and is shown as a single diagram.
- Under `game:` in `content/chess.md`:
  - `note`: a few sentences on why you like the game.
  - `startPly`: which position to show first, counted in half-moves (30 is the position after
    Black's 15th move). Leave it out to open on the final position.
  - `orientation`: `white` or `black`, the side at the bottom of the board.

### Colours and type

- Colours are eight variables at the top of `src/styles/global.css`, each written as
  `light-dark(<light theme>, <dark theme>)`. If you change the background, also change the two
  `theme-color` lines in `src/layouts/Base.astro` and the four colours at the top of
  `src/pages/og.png.ts`. Re-check contrast after any colour change (WCAG AA needs 4.5:1 for
  text).
- Fonts are declared in `astro.config.ts` and served from this site, not from a font CDN. If
  you swap one, update the matching path in `src/lib/typefit.ts` as well: the build measures
  your name in the display font to size it to the width of the page.

## Placeholders to replace

`npm run placeholders` prints this list for the current state of the files. A Markdown or JSON
file counts as sample content while it contains `placeholder: true`; delete that line when the
content is yours.

**In `content/site.json`**

- [ ] `url`: still `https://example.com`. Set your real domain.
- [ ] `email`: still `hello@example.com`.
- [ ] `links` → LinkedIn: still `https://www.linkedin.com/in/your-handle/`.
- [ ] `letterboxd.username`: empty, so Films shows sample entries.
- [ ] `chess.username`: empty, so ratings come from `content/chess.md`. Also set
      `chess.platform` if you play on Chess.com.

**Check these, which were filled in with a best guess**

- [ ] `name` ("Praveen Ponduru") and `role` ("Senior Software Engineer").
- [ ] `links` → GitHub (`https://github.com/pj-18`).
- [ ] `tagline` and `description`: written for you; reword them in your own voice.
- [ ] `location`: empty, which is fine. Fill it in if you want it shown.
- [ ] The intro line of each section under `sections`.

**Sample text**

- [ ] `content/bio.md`
- [ ] `content/experience/company-one.md`, `company-two.md`, `company-three.md`
- [ ] `content/projects/project-one.md`, `project-two.md`, `project-three.md`, `project-four.md`
- [ ] `content/skills.json`
- [ ] `content/chess.md`: the blurb, the manual ratings (1500 and 1400 are invented) and the
      note about the game.
- [ ] `content/favourite-game.pgn`: Morphy's Opera Game. Keep it or swap in your own.

**Sample images**

- [ ] `photos/01-last-light.jpg` … `photos/12-shoreline.jpg`: twelve generated placeholder
      images. Replace them with your photographs and rewrite `photos/captions.json`.

**Only if you turn them on**

- [ ] `YOUR_TOKEN` or `yourdomain.com` in the commented-out analytics lines in
      `src/layouts/Base.astro`.

Sample values are deliberately kept out of the page's structured data (the JSON-LD `Person`
block), so nothing invented can be indexed as fact about you. Your email, profile links and
skills are added to it as soon as they are real.

## Deploy

The site is published on [Cloudflare Pages](https://pages.cloudflare.com): the free plan has
no bandwidth limit, and DNS, HTTPS and redirects are all managed in the same dashboard.

### How it works

`.github/workflows/deploy.yml` runs on every push to `main`, once a day at 03:17 UTC, and on
demand. It installs dependencies, runs the tests and the type-check, fetches the diary and
ratings, builds the site, and uploads `dist/` to Cloudflare Pages. Pull requests are built and
tested but never deployed. Until the two secrets below exist, the deploy step is skipped, so
the workflow is safe to push before Cloudflare is set up.

### One-time setup

1. **Create a Cloudflare account** at <https://dash.cloudflare.com/sign-up> (the free plan is
   enough).

2. **Create the Pages project.** Give it the same name as your GitHub repository:

   ```sh
   npx wrangler login
   npx wrangler pages project create my-portfolio --production-branch main
   ```

   This creates an empty "Direct Upload" project at `https://my-portfolio.pages.dev`. Do not
   connect the project to GitHub from the Cloudflare dashboard: the workflow in this
   repository does the building, so that the daily rebuild and its fallback cache work.

3. **Copy your account ID.** In the Cloudflare dashboard open **Workers & Pages**; the
   **Account ID** is under **Account details**.

4. **Create an API token.** Profile icon → **My Profile** → **API Tokens** → **Create Token**
   → **Create Custom Token**. Give it one permission, **Account · Cloudflare Pages · Edit**,
   limit **Account Resources** to your account, create it, and copy the token (it is shown
   once).

5. **Add both to GitHub.** In the repository: **Settings** → **Secrets and variables** →
   **Actions** → **New repository secret**, twice:

   | Name | Value |
   | --- | --- |
   | `CLOUDFLARE_ACCOUNT_ID` | the account ID from step 3 |
   | `CLOUDFLARE_API_TOKEN` | the token from step 4 |

   If the Pages project is not named after the repository, also add a repository
   **variable** (the **Variables** tab on the same screen) called `CLOUDFLARE_PAGES_PROJECT`
   with the project's name.

6. **Push to `main`.** The workflow runs (see the **Actions** tab) and the site is live at
   `https://<project>.pages.dev` a couple of minutes later.

### Connect your domain

Replace `yourdomain.com` with your domain throughout. Cloudflare moves dashboard labels now
and then; if a step does not match what you see, the two pages these steps follow are
[Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) and
[Redirecting www to domain apex](https://developers.cloudflare.com/pages/how-to/www-redirect/).

1. **Tell the site its address.** Set `"url": "https://yourdomain.com"` in
   `content/site.json`, commit and push.

2. **Put the domain's DNS on Cloudflare.** A root domain (`yourdomain.com`, as opposed to
   `www.yourdomain.com`) can only be attached to Pages when Cloudflare runs its DNS.
   - In the dashboard choose **Add a domain**, enter `yourdomain.com`, pick the **Free** plan.
   - Cloudflare scans your existing DNS records. If you receive email at this domain, check
     that the `MX` and `TXT` records were carried over before going further.
   - Cloudflare shows two nameservers. At the company where you registered the domain,
     replace the current nameservers with those two.
   - Wait until the domain shows **Active** in Cloudflare. This usually takes under an hour
     and can take up to a day.

   (If you bought the domain through Cloudflare Registrar, this step is already done.)

3. **Attach the domain to the site.** **Workers & Pages** → your project → **Custom domains**
   → **Set up a domain** → enter `yourdomain.com` → **Continue** → **Activate domain**.
   Cloudflare creates the DNS record for you. Do not create it by hand without this step, or
   the domain will resolve but answer with an error.

4. **HTTPS.** Nothing to install: Cloudflare issues and renews the certificate itself. Wait
   until the domain shows **Active** on the Custom domains tab (usually a few minutes). Then
   open the domain in the dashboard → **SSL/TLS** → **Edge Certificates** and switch on
   **Always Use HTTPS**, so that `http://` addresses are redirected.

5. **Redirect `www` to the root domain.**
   1. Open the domain → **DNS** → **Records** → **Add record**:

      | Type | Name | IPv4 address | Proxy status |
      | --- | --- | --- | --- |
      | `A` | `www` | `192.0.2.1` | Proxied |

      `192.0.2.1` is a reserved dummy address. Because the record is proxied, Cloudflare
      answers with the redirect below and never contacts it.
   2. At account level (not inside the domain) open **Bulk Redirects** → **Create Bulk
      Redirect List**. Name it `www_to_apex` and add one redirect by hand:

      | Field | Value |
      | --- | --- |
      | Source URL | `www.yourdomain.com` |
      | Target URL | `https://yourdomain.com` |
      | Status | `301` |
      | Parameters | tick **Preserve query string**, **Include subdomains**, **Subpath matching** and **Preserve path suffix** |

   3. Still under **Bulk Redirects**, choose **Create Bulk Redirect Rule**, give it a name,
      select the `www_to_apex` list, then **Save and Deploy**.

6. **Check it.** (In Windows PowerShell type `curl.exe` instead of `curl`.)

   ```sh
   curl -sI https://yourdomain.com/              # HTTP/2 200
   curl -sI http://yourdomain.com/               # 301, location: https://yourdomain.com/
   curl -sI "https://www.yourdomain.com/?a=1"    # 301, location: https://yourdomain.com/?a=1
   ```

When you are done, the domain's DNS holds these two records for the site:

| Type | Name | Content | Proxy | Created by |
| --- | --- | --- | --- | --- |
| `CNAME` | `yourdomain.com` | `<project>.pages.dev` | Proxied | Cloudflare, in step 3 |
| `A` | `www` | `192.0.2.1` | Proxied | you, in step 5 |

The site also stays reachable at `<project>.pages.dev`. Every page names
`https://yourdomain.com` as its canonical address, so search engines index the right one.

### The daily rebuild

- The schedule is the `cron` line in `.github/workflows/deploy.yml` (`17 3 * * *`, 03:17 UTC).
  GitHub may start scheduled runs a few minutes late.
- To rebuild at once, for example right after logging a film: **Actions** → **Build and
  deploy** → **Run workflow**.
- Scheduled runs only happen on the repository's default branch.
- In a public repository, GitHub switches off scheduled workflows after 60 days without any
  repository activity, and emails you first. Re-enable it from the **Actions** tab.
- The last successful fetch is carried from one run to the next. If Letterboxd or the chess
  site is down when the workflow runs, the site is published with yesterday's data rather
  than an empty section.

## Analytics (optional, off by default)

The site ships with no analytics, no cookies and no third-party requests. If you want page
counts, both options below are cookieless.

1. In `src/layouts/Base.astro`, find the commented-out block near the end of `<head>` and
   move one of the two `<script>` lines out of the comment.
   - **Cloudflare Web Analytics** (free): in the dashboard go to **Web Analytics** → **Add a
     site**, and paste the token it gives you in place of `YOUR_TOKEN`.
   - **Plausible** (paid, or self-hosted): put your domain in place of `yourdomain.com`.

2. Allow that script in the Content Security Policy in `astro.config.ts`; otherwise the
   browser blocks it. For Cloudflare Web Analytics, change the `connect-src` line and add
   `resources` to `scriptDirective`:

   ```ts
   directives: [
     // …
     "connect-src 'self' https://cloudflareinsights.com",
     // …
   ],
   scriptDirective: {
     hashes: [sha256(themeScript)],
     resources: ["'self'", 'https://static.cloudflareinsights.com'],
   },
   ```

   For Plausible, use `https://plausible.io` in both places.

3. Change the footer line "No cookies, no tracking." in `src/components/Colophon.astro` so it
   stays true.

4. Build, open the page with the browser console showing, and confirm there are no Content
   Security Policy errors.

The policy change in step 2 was test-built and produces the expected policy. The analytics
scripts themselves have not been run on this site.

## Checks and measured results

Measured on 12 November 2026 against the production build with the sample content, served
locally by `npm run preview`.

**Lighthouse 13.6.0**, five runs per profile:

| Profile | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Mobile (slow 4G, 4× CPU slowdown) | 100 on all five runs | 100 | 100 | 100 |
| Desktop | 100 on all five runs | 100 | 100 | 100 |

Mobile: first and largest contentful paint 0.8 s, total blocking time 0 to 40 ms, layout
shift 0. An earlier set of runs, with the laptop on battery and Lighthouse warning that the
machine was running slowly, scored 95 to 99 for mobile performance. Expect the score to move a
few points with the machine it is measured on, and to differ slightly once the site is served
from Cloudflare with your own photos.

**Accessibility**

- axe-core 4.14: no violations on the page, the photo viewer and the mobile index, each in
  the light and dark themes at desktop and mobile widths (ten combinations).
- Keyboard: all 78 tab stops are reachable in order, each shows a focus ring, none is hidden
  behind the top bar, and none is smaller than 24 × 24 CSS pixels.
- Contrast: body text 15.7:1, muted text at least 5.6:1, accent colour at least 4.9:1, in
  both themes (WCAG AA asks for 4.5:1).
- Automated tools cannot judge everything. The alt text you write for your photos is the
  main thing left to you.

**Behaviour**: 46 browser checks pass, covering the theme switch, the mobile index, section
links, the photo viewer (keyboard, swipe, back button) and the chess board. No element moves
when the fonts load at six screen sizes. No Content Security Policy violations or console
errors on `/` or the 404 page. The 19 unit tests pass and the type-check is clean.

**Size**: the page is a single HTML document of about 26 KB gzipped (122 KB uncompressed).
That includes all of its CSS and about 8 KB of JavaScript, so there are no separate script or
stylesheet requests.

To measure the deployed site yourself: <https://pagespeed.web.dev>, or Lighthouse in Chrome's
developer tools.

## Troubleshooting

**`npm run dev` or `npm run build` says the TLS certificate could not be verified.** Some
office networks inspect HTTPS traffic, which makes Node refuse the connection to Letterboxd
and Lichess. The site still builds, using the last fetched data or the fallbacks. Try another
network; GitHub's build machines are not affected. The certificate check is deliberately not
switched off.

**The Films section shows a message instead of films.** The feed could not be fetched and
there is no earlier copy. Check the username in `content/site.json` (the build log says
"HTTP 404, is the username right?" when it is wrong), then run `npm run sync`.

**A new diary entry has not appeared.** The site updates once a day. Run the workflow by hand
(see [The daily rebuild](#the-daily-rebuild)) to update it now.

**The build stops with "… is not valid".** A content file has a missing or malformed value.
The message names the file and the field.

**The build prints two warnings mentioning CSP.** One is about syntax highlighting (the site
has no code blocks), the other about style attributes (allowed on purpose, see the comment in
`astro.config.ts`). Both are expected.

**The workflow says "Built but not deployed".** The two Cloudflare secrets are missing. See
[One-time setup](#one-time-setup).

**The deploy step fails with "Project not found".** The Pages project has a different name
from the repository. Set the `CLOUDFLARE_PAGES_PROJECT` variable (step 5 of the setup).

## Credits and licences

- Typefaces: [League Gothic](https://www.theleagueofmoveabletype.com/league-gothic),
  [Newsreader](https://github.com/productiontype/Newsreader) and
  [IBM Plex Mono](https://github.com/IBM/plex), all under the SIL Open Font Licence, installed
  from [Fontsource](https://fontsource.org) and served from this site.
- Chess pieces: the "Cburnett" set by Colin M.L. Burnett, used under the BSD licence. See
  `src/assets/chess/LICENSE.txt`.
- Film data and posters come from your own Letterboxd diary feed. Poster artwork belongs to
  its respective owners.
- The sample photographs are generated images, not photographs, and are only there to show
  the layout.
