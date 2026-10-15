# Shahruz Ziyodullayev — Portfolio + Admin CMS

A full-stack personal portfolio with an interactive 3D hero and a secure admin dashboard. Every piece of public
content — profile, projects, achievements, skills, education, experience, gallery, statistics, social links, SEO,
navigation, footer, colours and the privacy policy — is edited from `/admin`, with no code changes.

- **Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS 4 · Motion · React Three Fiber / drei · Supabase
  (Postgres, Auth, Storage) · React Hook Form + Zod · Recharts · Lucide
- **Public UI language:** Uzbek (Latin). Interface strings live in `src/lib/copy.ts`; the admin panel is in English.

> The repository previously contained an unrelated static prototype (“Everest / Barkamol” English-learning app). It
> was not wired into any build, so it was preserved unchanged under `legacy/everest-academy/` rather than deleted.

---

## Contents

1. [Features](#features)
2. [Project structure](#project-structure)
3. [Architecture & security model](#architecture--security-model)
4. [Setup](#setup) — Supabase, environment variables, database, first admin
5. [Local development](#local-development)
6. [Deployment](#deployment)
7. [Using the admin dashboard](#using-the-admin-dashboard)
8. [Testing](#testing)
9. [Maintenance](#maintenance)
10. [Known limitations](#known-limitations)

---

## Features

### Public website

| Page                  | What it shows                                                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                   | Hero with name, editable title/intro, interactive 3D sculpture, CTAs “Loyihalarimni ko’rish” / “Men bilan bog’lanish”, statistics, featured projects, recent achievements, skills, contact CTA |
| `/about`              | Photo, biography, personal story, background, learning journey, goals, interests, skills, experience & education summaries, CV download                                                        |
| `/projects`           | Grid **and** list views, category chips, tag/technology filter, live search                                                                                                                    |
| `/projects/[slug]`    | Shareable detail page: description, role, timeline, technologies, live/source links, image gallery with lightbox, per-project SEO + JSON-LD                                                    |
| `/achievements`       | Year-grouped timeline, category/type filter, newest/oldest sort, certificate & verification links                                                                                              |
| `/skills`             | Skills grouped by category; level bars appear **only** when you enter a level                                                                                                                  |
| `/experience`         | Work and education timelines                                                                                                                                                                   |
| `/gallery`            | Masonry grid + full-screen lightbox (keyboard, swipe, focus return), captions, categories, alt text                                                                                            |
| `/contact`            | Validated form (client **and** server), honeypot + timing trap, rate limiting, contact details, social links                                                                                   |
| `/privacy`, `/resume` | Editable privacy policy; `/resume` is a stable link that redirects to the current CV                                                                                                           |
| Extras                | Custom 404, error boundary, `sitemap.xml`, `robots.txt`, canonical URLs, Open Graph/Twitter cards, draft-preview banner                                                                        |

Only **published** content is shown to visitors.

### Admin dashboard (`/admin`)

- **Overview:** totals (projects, published achievements, media files + storage used, messages/unread), a
  published-vs-draft chart per content type, messages per day (30 days), and a “recent edits” feed recorded by
  database triggers.
- **Full CRUD** for projects, achievements/certificates, skills, education, experience, statistics and social links —
  each with search, status and category filters, sorting, manual ordering (move up/down), quick publish/unpublish,
  delete with confirmation, and validated forms with loading/empty/success/error states.
- **Draft → preview → publish:** new items are drafts. “Save draft” never publishes. **Preview** opens the real page
  with drafts visible (admin-only draft mode); publishing is an explicit choice.
- **Profile & About**, **Site settings** (name, logo, favicon, accent colour, 3D/particles toggles, hero text, CTA
  labels, contact details, SEO title/description/keywords/sharing image, header & footer navigation, footer text,
  CV toggle, privacy policy).
- **Media library:** drag-and-drop multi-upload with per-file progress, type/size validation, previews, alt text,
  captions, categories, “show in public gallery”, copy URL, **replace file** (updates every page that used it), and
  delete with a usage check (references are cleaned before the file is removed from storage). The same picker is
  embedded in every image/file field.
- **Messages inbox:** unread/read/archived, search, reply by e-mail, delete.
- **Account:** change password (re-authenticates first).

---

## Project structure

```
├── legacy/everest-academy/        # Preserved previous prototype (not part of the app)
├── scripts/create-admin.mjs       # Secure one-off admin bootstrap (service-role, local only)
├── supabase/
│   ├── migrations/20261015000000_init.sql   # Schema, indexes, triggers, RLS, storage bucket + policies
│   ├── seed.sql                             # Singleton rows with clearly-labelled placeholders
│   └── tests/rls_test.sql                   # 29 RLS / security assertions (transaction, rolled back)
├── src/
│   ├── middleware.ts              # Session refresh + /admin sign-in gate
│   ├── app/
│   │   ├── (site)/                # Public pages (static + ISR)
│   │   ├── admin/
│   │   │   ├── login/             # Sign-in page
│   │   │   ├── (panel)/           # Protected dashboard: overview, [resource] CRUD, media, messages, profile, settings, account
│   │   │   └── actions/           # Server actions (content, media, messages, auth) — all re-check admin + re-validate
│   │   ├── api/preview/           # Admin-only draft preview on/off
│   │   ├── resume/                # /resume → current CV
│   │   ├── sitemap.ts, robots.ts, not-found.tsx, global-error.tsx, layout.tsx
│   ├── components/
│   │   ├── site/                  # Header, footer, hero, cards, timeline, gallery, contact form…
│   │   ├── three/                 # R3F scene + lazy wrapper with static fallback
│   │   ├── admin/                 # Shell, generic form/list, field renderer, media picker, dropzone, charts…
│   │   └── ui/                    # Rich text, smart image, reveal, buttons
│   └── lib/
│       ├── cms/fields.ts          # Declarative field defs → UI + Zod schema (shared client/server)
│       ├── cms/resources.ts       # Content-type registry (tables, fields, list columns, preview paths)
│       ├── data/public.ts         # Cached public reads (published-only, preview-aware)
│       ├── supabase/              # Server, browser and middleware clients
│       ├── auth.ts                # getAdmin / requireAdmin
│       ├── validation/            # Contact + media schemas
│       └── …                      # env, types, defaults, copy, utils, rate-limit, upload client
└── tests/
    ├── unit/                      # Vitest: schemas, URL safety, slugs, uploads, rate limiter, rich text, DB↔config integrity
    └── e2e/                       # Playwright: public site + full admin workflows
```

**Adding a field or content type** is mostly declarative: add the column in a new SQL migration, add the field to
`src/lib/cms/resources.ts`, and render it on the public page. The admin form, validation (both sides) and list view
come from the registry. `tests/unit/schema-integrity.test.ts` fails if a configured field has no matching column.

---

## Architecture & security model

- **Public pages** are statically generated and revalidated (ISR, 5 min). They read through a cookie-less **anon**
  client with an explicit `status = 'published'` filter, and RLS enforces the same rule in Postgres. Every admin save
  calls `revalidatePath`, so changes appear immediately.
- **Admin authorization is enforced three times:**
  1. `middleware.ts` redirects signed-out users away from `/admin` (UX only);
  2. every admin page and **every server action** calls `requireAdmin()`, which validates the JWT with Supabase Auth
     (`getUser()`) and checks the `admin_users` table;
  3. **Row Level Security**: writes to every content table and to the storage bucket require
     `public.is_admin()`. A signed-in non-admin can do nothing a visitor can’t.
- **No public registration:** there is no sign-up UI, the admin flag lives in `admin_users` which no client role can
  write, and you should disable sign-ups in Supabase (see setup). Admins are created only by
  `scripts/create-admin.mjs` using the service-role key **on your machine**.
- **The service-role key is never used by the app.** Only `NEXT_PUBLIC_SUPABASE_URL` and the anon/publishable key
  reach the browser; the anon key is safe because RLS governs it.
- **Validation:** one declarative field definition generates the Zod schema used by the form _and_ re-run by the
  server action; unknown keys are stripped (no mass assignment), URLs must be `https://`, `mailto:`, `tel:` or
  site-relative (no `javascript:`), and Postgres `CHECK` constraints are the final backstop.
- **Uploads:** the server validates name/type/size and issues a short-lived **signed upload URL** for a path it
  chooses (`images/2026/10/descriptive-name-x7k2p9.jpg`); the browser uploads directly with progress; the bucket
  itself enforces the MIME allow-list (JPG/PNG/WebP/AVIF/GIF/ICO/PDF — **no SVG**) and the 10 MB limit; the server
  then verifies the object exists before registering it.
- **Contact form:** Zod on both sides, honeypot field, minimum fill time, in-memory per-IP limit, and a
  `SECURITY DEFINER` Postgres function that re-validates and rate-limits by **hashed** IP (5/hour) plus a global
  flood guard. Visitors have no direct table access.
- **Rendering user content:** a small Markdown renderer builds React elements (no `dangerouslySetInnerHTML`), so
  admin-entered text cannot inject scripts.
- **Headers:** CSP (`frame-ancestors 'none'`, `object-src 'none'`, restricted `connect-src`), HSTS,
  `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; `/admin` is `noindex`.
- **Login hardening:** generic error messages, per-IP and per-email attempt limits (on top of Supabase’s own),
  re-authentication before password change, open-redirect-safe `next` parameter.

### 3D & performance

The hero sculpture (`src/components/three/hero-scene.tsx`) is a liquid graphite core with a faceted wire shell,
orbit rings, procedural studio lighting (no HDR download) and optional particles. It is **lazy-loaded** (not in the
initial JS), renders continuously only while on screen, follows the pointer with damped parallax, scales to the
viewport, drops detail/resolution on small or low-memory devices (and under `PerformanceMonitor` pressure), is static
under `prefers-reduced-motion`, and falls back to a pure-CSS orb when WebGL is unavailable, Save-Data is on, or 3D is
disabled in settings. All Motion animations respect reduced motion.

---

## Setup

### 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. **Disable public sign-ups:** _Authentication → Sign In / Providers → Email_ → turn off **“Allow new users to sign
   up”** (wording varies slightly between dashboard versions). The app never offers sign-up, but this closes the API
   path too.
3. _Project Settings → API_: copy the **Project URL**, the **anon / publishable** key, and the **service_role /
   secret** key (the last one only for step 4).

### 2. Environment variables

```bash
cp .env.example .env.local
```

| Variable                        | Where used            | Notes                                                                                   |
| ------------------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | app (browser+server)  | Project URL                                                                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app (browser+server)  | anon or publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` also accepted)          |
| `NEXT_PUBLIC_SITE_URL`          | app                   | Public URL, no trailing slash (canonical URLs, sitemap). Can be overridden in Settings. |
| `CONTACT_IP_SALT`               | server only           | Random secret for hashing visitor IPs: `openssl rand -hex 32`                           |
| `SUPABASE_SERVICE_ROLE_KEY`     | **setup script only** | Keep local. **Never** add to your hosting provider, never prefix with `NEXT_PUBLIC_`.   |

### 3. Create the database

Either with the Supabase CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push            # applies supabase/migrations/*
psql "<connection string>" -f supabase/seed.sql
```

or in the dashboard: _SQL Editor →_ paste and run `supabase/migrations/20261015000000_init.sql`, then
`supabase/seed.sql`. Both files are safe to re-run.

This creates all tables, indexes, constraints, triggers, RLS policies, the `media` storage bucket (public read,
admin-only write, MIME/size limits) and the profile/settings rows filled with **[bracketed placeholders]** — no
invented facts.

### 4. Create your administrator account

```bash
npm install
npm run admin:create -- your@email.com
```

You’ll be asked for a password (hidden input; ≥ 12 characters with upper/lowercase letters and a number). The script
creates a confirmed user via the Supabase Admin API and adds it to `admin_users`. Re-running it for an existing user
only grants admin rights (password unchanged). Revoke with `npm run admin:create -- your@email.com --revoke`.

For CI or non-interactive shells you may set `ADMIN_PASSWORD` for that single command. Once done you can delete
`SUPABASE_SERVICE_ROLE_KEY` from `.env.local`.

_Alternative without the script:_ create the user in _Authentication → Users → Add user_ (tick “auto confirm”), then
in the SQL editor run `insert into public.admin_users (user_id) select id from auth.users where email = 'your@email.com';`

### 5. Sign in

Start the app and open `/admin/login`. Fill in **Profile & About** and **Settings** first, then add content and
publish it.

---

## Local development

```bash
npm install
npm run dev            # http://localhost:3000
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint (next/core-web-vitals + typescript)
npm test               # Vitest unit tests
npm run format         # Prettier
npm run build && npm start
```

Without Supabase variables the public site still runs with placeholder content and empty sections, and `/admin` shows
setup instructions instead of failing.

---

## Deployment

**Vercel (recommended):**

1. Import the repository.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (your domain) and
   `CONTACT_IP_SALT`. **Do not** add the service-role key.
3. Deploy. Then in Supabase _Authentication → URL Configuration_ set the Site URL to your domain.
4. In the admin _Settings → General_, set “Public site URL” to the same domain (used for canonical URLs & sitemap).

Any Node 20+ host works the same way (`npm run build && npm start`). If you put a proxy in front, make sure it
forwards `X-Forwarded-For` so rate limiting sees real client IPs.

---

## Using the admin dashboard

- **Create → Save draft → Preview → Publish.** Drafts are invisible to visitors. In the editor, switch the status to
  _Published_ and press **Save & publish**; use the list’s eye button to unpublish quickly.
- **Ordering:** in a list, choose “Display order” with no filters and use the ↑/↓ buttons.
- **Images & files:** every image/file field has _Choose / upload_ (library or new upload) and _Paste URL_. Write alt
  text for every image — the library flags images without it.
- **Gallery:** in _Media_, open an image, enable _Show in public gallery_ and set status _Published_.
- **Featured:** the home page shows featured projects/achievements/skills (or the latest ones if none are featured).
- **Statistics:** only publish numbers that are true; they appear on the home page.
- **Text formatting:** long text fields support `**bold**`, `*italic*`, `[link](https://…)`, `## Heading`, and
  `- list` items.

---

## Testing

| Suite                    | Command                          | What it covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (34 tests)          | `npm test`                       | Field → Zod schema generation (required fields, unsafe URLs, slug rules, mass-assignment stripping, drafts by default), contact & upload validation, storage-path safety (no traversal), rate limiter, URL/redirect safety, slugify (Uzbek/Cyrillic), safe Markdown rendering (no script/`javascript:` injection), and an integrity check that every CMS field exists as a DB column and every table has RLS.                                                                                                           |
| Database (29 assertions) | `DATABASE_URL=… npm run db:test` | Runs in a rolled-back transaction as anon / non-admin / admin: published-only reads, no direct writes, no self-promotion to admin, storage write protection, contact validation + per-IP rate limit, `published_at`, activity log, CHECK constraints. **Use a local/staging database.**                                                                                                                                                                                                                                 |
| End-to-end (19 tests)    | `npm run test:e2e`               | Against a running app. Public: pages, 404s, sitemap/robots, security headers, admin gate, form validation, mobile menu (focus/Escape), no horizontal overflow at 320 px. With `E2E_ADMIN_EMAIL/PASSWORD` (+ optional `E2E_USER_EMAIL/PASSWORD` for a non-admin): wrong-password and non-admin refusal, draft hidden → preview → publish → visible → unpublish → delete, validation errors, upload → gallery → delete (incl. storage cleanup), SVG rejection, settings reflected on the site, contact → inbox, sign-out. |

---

## Maintenance

- **Schema changes:** add a new file in `supabase/migrations/` (never edit an applied one), update the registry and
  types, run `npm test` (the integrity test catches mismatches) and `npm run db:test` on a dev database.
- **Dependencies:** `npm outdated`, upgrade, then `npm run check && npm run build`. Keep `next` on the latest patch of
  its minor version for security fixes.
- **Backups:** Supabase takes daily backups on paid plans; export the database and the `media` bucket periodically on
  the free tier.
- **Rotate secrets** if leaked: the anon key (Supabase dashboard → API), the service-role key, `CONTACT_IP_SALT`.
- **Old contact messages:** archive or delete from the inbox; stored IPs are only salted hashes.

---

## Known limitations

- **Verified locally, not against a hosted Supabase project.** No Supabase credentials were available while building
  this, so the full stack was tested against a local stand-in: Postgres 16 with the real migration, the real
  **Supabase Auth (GoTrue v2.180)** binary and **PostgREST v12.2**. Supabase’s Storage server couldn’t be downloaded
  in that environment, so uploads were exercised against a small emulator of the Storage endpoints the app uses
  (signed upload URL, upload, public download, list, delete), with metadata written through RLS. The upload code
  follows `@supabase/storage-js`’s request shape, but do one real upload after connecting your project.
- The in-memory login/contact rate limits are per server instance; the database-level contact limit and Supabase
  Auth’s own limits are the global backstops.
- Contact submissions are stored and shown in the inbox; e-mail notifications are not sent (add a Supabase Database
  Webhook or an e-mail provider if you want them).
- Public interface strings are Uzbek and live in `src/lib/copy.ts` (not the CMS); content itself is single-language.
- CSP allows `'unsafe-inline'` scripts, which Next.js needs without a nonce-based setup.
- `npm audit` reports advisories in build/dev-time tooling only (`postcss` bundled inside Next’s compiler, `braces`
  via dev tooling); no runtime dependency is affected.
