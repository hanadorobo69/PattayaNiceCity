# Pattaya Vice City — V1 Complete Project Resume

## Overview

**Pattaya Vice City** is a community-driven platform for discovering and reviewing nightlife venues in Pattaya, Thailand. It combines a venue directory with a Reddit-style community forum, offering multi-language support, user ratings, content reporting, polls, and a full admin dashboard.

**Live URL:** https://pattayavicecity.com
**Domain/DNS:** Cloudflare
**Hosting:** Hetzner VPS (Debian), deployed at `/home/bababobo/PattayaViceCity`
**Process Manager:** PM2 (process name: `pattaya`)
**Database:** PostgreSQL via Supabase (self-hosted, `127.0.0.1:5432`)

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, SSR/ISR) | 15.5.14 |
| Language | TypeScript | ^5.7.0 |
| React | React + React DOM | 19.0.0 |
| ORM | Prisma | ^6.0.0 |
| Database | PostgreSQL (Supabase) | — |
| Auth | NextAuth (Auth.js v5 beta) | ^5.0.0-beta.30 |
| i18n | next-intl (URL-prefix routing + cookie fallback) | ^4.8.3 |
| CSS | Tailwind CSS + tailwindcss-animate | ^3.4.0 |
| UI Components | Radix UI (Avatar, Dialog, Dropdown, Label, Select, Separator, Tabs, Toast) | Various |
| Forms | react-hook-form + @hookform/resolvers + Zod | ^7.54.0 / ^3.23.0 |
| Icons | lucide-react | ^0.460.0 |
| Emoji Picker | emoji-picker-react (EmojiStyle.NATIVE) | ^4.18.0 |
| GIF Picker | GIPHY API (via `/api/gifs` proxy) | — |
| Email (sending) | Resend API | ^6.9.4 |
| Email (receiving) | Cloudflare Email Routing -> personal email |
| Theming | next-themes | ^0.4.0 |
| Passwords | bcryptjs | ^2.4.3 |
| Slugs | slugify | ^1.6.6 |
| Dates | date-fns | ^3.6.0 |
| Maps | Google Maps Embed API + Google Geocoding API | — |
| Markdown Rendering | react-markdown + remark-gfm + rehype-slug + rehype-autolink-headings | ^10.1.0 / ^4.0.1 / ^6.0.0 / ^7.1.0 |
| Markdown Editor | @uiw/react-md-editor (admin blog form) | ^4.0.11 |
| OG Image Generation | @vercel/og (dynamic branded images per article) | latest |
| Testing | Vitest | ^2.1.9 |

---

## Design System

- **Gradient:** Rose (#ff2d95) -> Violet (#8a2be2) -> Cyan (#00f5ff)
- **Font:** Orbitron (headings, labels) via `font-[family-name:var(--font-orbitron)]`, Inter (body text)
- **Font Loading:** `next/font/google` with `display: "swap"` (no FOUT)
- **Style:** Dark theme, glassmorphism, neon glow effects, `satine-border` CSS class
- **Background:** Custom gradient backgrounds with rgba overlays
- **Burgundy textarea BG:** `rgba(80, 20, 45, 0.35)` for comment/post text areas
- **Cards:** Rounded corners (`rounded-xl`), subtle borders, hover transitions

---

## Supported Languages (12)

| Code | Language | Flag |
|---|---|---|
| en | English | gb.png |
| fr | Français | fr.png |
| es | Español | es.png |
| de | Deutsch | de.png |
| zh | Chinese (Simplified) | cn.png |
| yue | Cantonese | hk.png |
| ja | Japanese | jp.png |
| ko | Korean | kr.png |
| th | Thai | th.png |
| ru | Russian | ru.png |
| ar | العربية (Arabic) | sa.png |
| hi | हिन्दी (Hindi) | in.png |

- All translations stored in `src/i18n/messages/{locale}.json` (1062 translation keys each)
- **URL-prefix routing:** Non-default locales use `/fr/`, `/th/`, `/zh/`, etc. URL prefixes (default `en` has no prefix for clean URLs)
- Routing defined in `src/i18n/routing.ts` using `defineRouting()` with `localePrefix: "as-needed"`
- Navigation helpers (`Link`, `redirect`, `usePathname`, `useRouter`) from `src/i18n/navigation.ts` via `createNavigation()`
- Middleware (`src/middleware.ts`) combines next-intl locale detection/routing with NextAuth authentication
- Request config (`src/i18n/request.ts`) reads locale from URL segment via `requestLocale`
- Language selector navigates to locale URL (e.g., `/fr/community`) instead of cookie + reload
- Language preference persisted to DB for logged-in users (`Profile.preferredLanguage`)
- **Hreflang tags:** Served via HTTP `Link` headers by next-intl middleware (not a client component) — `<link rel="alternate" hrefLang="...">` for all 12 languages + `x-default` on every page
- **Sitemap alternates:** Every URL in `sitemap.xml` includes `alternates.languages` with all 12 locale variants
- **Robots.txt:** Disallow rules cover locale-prefixed admin/create/verify paths
- **Category name translations:** All 21 category names (Bar, BJ Bar, GoGo Bar, Massage, Club, KTV, etc.) are translated in all 12 languages via the `categoryNames` i18n namespace. Components use `getTranslations("categoryNames")` (server) or `useTranslations("categoryNames")` (client) with fallback to English DB name. Categories display in the user's chosen language everywhere: homepage, venue detail, community, admin, filters, post cards, profile favorites, trending venues, top spots, and mention suggestions.

---

## Pages & Routes

All page routes live under `src/app/[locale]/` and support URL-prefix routing (e.g., `/fr/community`, `/th/places/walking-street`). English (default) has no prefix.

### Public Pages
| Route | Description |
|---|---|
| `/` | Homepage — venue listing with filters, categories, search, sorting |
| `/places/[slug]` | Venue detail — reviews, ratings, Google Maps, photo gallery, menu gallery, favorites |
| `/community` | Community forum — posts, voting, filters by category |
| `/post/[slug]` | Post detail — comments, votes, polls, media, report |
| `/vlogs` | Blog — article listing with cover images, tags, reading time, @mentions/#hashtags in excerpts |
| `/vlogs/[slug]` | Blog article detail — Article/BreadcrumbList/FAQPage JSON-LD, YouTube embed, photo gallery, FAQ accordion, EEAT author, view tracking |
| `/vlogs/category/[slug]` | Blog category archive — dedicated CollectionPage + BreadcrumbList JSON-LD, own meta/OG, SSG with generateStaticParams |
| `/vlogs/tag/[slug]` | Blog tag archive — dedicated CollectionPage + BreadcrumbList JSON-LD, own meta/OG, SSG with generateStaticParams |
| `/legal` | Terms of Service, Privacy Policy, Community Guidelines |
| `/contact` | Contact form (saves to DB + sends email via Resend) |
| `/about` | About page — Organization + Person JSON-LD, EEAT editorial methodology, sameAs, areaServed, knowsAbout |
| `/members` | The Vice Squad — members page with karma leaderboard, Admin display, tier badges |
| `/go/[slug]` | @mention resolver — redirects to venue page |
| `/login` | Sign in (credentials + Google OAuth) |
| `/register` | Create account |

### Authenticated Pages
| Route | Description |
|---|---|
| `/create` | Create new post with categories, media, polls |
| `/profile/[username]` | User profile — posts, karma, badges, edit profile |
| `/verify` | Email/venue owner verification |

### Admin Pages
| Route | Description |
|---|---|
| `/admin` | Dashboard — stats, recent activity, pending verifications |
| `/admin/posts` | Manage all posts |
| `/admin/comments` | Manage community + venue comments |
| `/admin/venues` | Manage venues |
| `/admin/venues/new` | Add new venue |
| `/admin/venues/[id]/edit` | Edit venue (includes menu media manager) |
| `/admin/admins` | Manage admin users |
| `/admin/analytics` | Analytics dashboard (page views, user growth, content stats) |
| `/admin/vlogs` | Manage blog articles |
| `/admin/vlogs/new` | Create new blog article |
| `/admin/vlogs/[id]/edit` | Edit blog article |

### API Routes
| Route | Method | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | * | NextAuth endpoints |
| `/api/auth/me` | GET | Get current user |
| `/api/posts` | GET/POST | List/create posts |
| `/api/posts/[id]` | GET/PATCH/DELETE | Individual post operations |
| `/api/comments` | GET/POST | Comments CRUD |
| `/api/votes` | POST | Post voting (upvote/downvote) |
| `/api/favorites` | POST | Post bookmarks |
| `/api/upload` | POST | File upload (images/videos, rate-limited) |
| `/api/venues/search` | GET | Venue search (for @mentions autocomplete) |
| `/api/gifs` | GET | GIPHY API proxy (trending + search, 100 calls/hr) |
| `/api/gifs/redgifs` | GET | RedGIFs API proxy (unused — tab removed, route kept) |
| `/api/places-autocomplete` | GET | Google Places autocomplete |
| `/api/places-details` | GET | Google Places details |
| `/api/translate` | POST | Auto-translate content |
| `/api/report` | POST | Content reporting |

---

## Features

### Venue Directory (Spots)

#### Categories (21 total: 17 spot + 4 community-only)

**Spot categories:**
| Category | Slug | Icon |
|---|---|---|
| Bar | bar | 🍺 |
| BJ Bar | bj-bar | 💋 |
| Gentleman's Club | gentlemans-club | 🎭 |
| Massage | massage | 💆 |
| GoGo Club | gogo-bar | 💃 |
| Russian GoGo | russian-gogo | 🪆 |
| Club | club | 🎧 |
| KTV | ktv | 🎤 |
| Short-Time Hotel | short-time-hotel | 🏩 |
| Ladyboy Bar | ladyboy-bar | ✨ |
| Ladyboy GoGo | ladyboy-gogo | ✨ |
| Ladyboy Club | ladyboy-club | ✨ |
| Ladyboy Massage | ladyboy-massage | ✨ |
| Gay Bar | gay-bar | 🏳️‍🌈 |
| Gay GoGo | gay-gogo | 🏳️‍🌈 |
| Gay Club | gay-club | 🏳️‍🌈 |
| Gay Massage | gay-massage | 🏳️‍🌈 |
| Coffee Shop | coffee-shop | 🌿 |

**Community-only categories (posts only, not venues):**
| Category | Slug | Icon |
|---|---|---|
| General | general | 💬 |
| Events | events | 📅 |
| Location Bike/Car | location-bike-car | 🛵 |
| Administration | administration | 📋 |

#### Menu Images
- `VenueMenuMedia` model stores menu photos per venue (id, url, order, venueId)
- Admin: `VenueMenuMediaManager` component on venue edit page — upload multiple menu images, delete individually
- Public: `VenueMenuGallery` component on venue detail page — grid layout (up to 4 images), lightbox with arrow navigation, thumbnails, keyboard support
- Orange accent color theme (UtensilsCrossed icon)
- Server actions: `addVenueMenuMedia()`, `deleteVenueMenuMedia()` in `src/actions/venues.ts`

#### Fire Spot (Team Recommendation)
- `isRecommended` Boolean field on Venue model (default: false)
- Admin: "🔥 Fire Spot" checkbox with orange styling in venue form
- Homepage: Fire Spot filter button (orange gradient when active) in Rating & Status row
- Homepage: Fire badge on venue cards for recommended spots
- Detail page: Fire badge next to category with orange glow
- Flame icon from lucide-react

#### Permanently Closed Feature
- `permanentlyClosed` Boolean field on Venue model (default: false)
- Admin form: ☠️ checkbox with red styling to mark a venue as permanently closed
- Venue detail page: sad banner at top ("🪦 Permanently Closed — This venue has closed its doors for good. RIP.")
- Spots listing: dark overlay on venue card with "🪦 Permanently Closed" badge
- Permanently closed venues remain visible in listings (not filtered out) for historical reference

#### Venue Pricing System

Per-category pricing fields displayed contextually:

**Drinks:**
- Soft Drink, Beer (min/max), Alcohol (min/max), Lady Drink, Bottle (min/max)

**Tables (Clubs/GoGos/Gentleman's):**
- Small Table, Medium Table, VIP Table

**Barfine / ST / LT (all min/max ranges):**
- Barfine (min/max), Short Time (min/max), Long Time (min/max)

**Rooms:**
- Small Room, Room

**Services:**
- BJ, Boom Boom

**Massage (massage categories only):**
- Thai Massage, Foot Massage, Oil Massage

**Cannabis Coffee Shop (min/max ranges):**
- Cannabis per gram (min/max), Pre-roll / Joint (min/max)

**Hotel specific:**
- Hotel Stars (1-5)

Each category type shows only relevant pricing fields (e.g., clubs show tables but not rooms; massage shows massage prices but not barfine). This is managed by `getVisibleGroups()` / `getVisiblePriceFields()` functions.

Phone numbers always auto-prefixed with `+66` (Thai country code).

#### Rating Criteria System

**5 focused criteria per category** + overall rating (most important). Criteria are tailored to each venue type:

| Category | Criteria |
|---|---|
| **Bar** | Girl Looks & Freshness · Girl Friendliness & Vibe · Ambiance · Seating & Space · Bar Service |
| **Gogo Bar** | Girl Beauty & Body · Girl Friendliness & Vibe · Ambiance & Decor · Comfort & View · Girl Freshness & Attitude |
| **Club** | Girl Beauty & Style · Girl Friendliness & Vibe · Music Quality · Ambiance & Lights · Space & Comfort |
| **Gentleman's Club** | Girl Beauty & Sex Appeal · Girl Friendliness & Vibe · Luxury Ambiance & Intimacy · Private Area Comfort · Contact & Interactions |
| **KTV** | Hostess Beauty & Freshness · Hostess Friendliness & Vibe · Sound & Karaoke Quality · Room Comfort & Privacy · Closeness & Touch |
| **BJ Bar** | Girl Beauty & Freshness · Girl Friendliness & Vibe · BJ Quality & Enthusiasm · Cabin Hygiene & Comfort · Girl Attitude During |
| **Massage** | Masseuse Beauty & Freshness · Masseuse Friendliness & Vibe · Massage Quality · Room Cleanliness & Comfort · Extras & Intimate Moments |
| **Short Time Hotel** | Room & Sheet Cleanliness · Bed & Bathroom Comfort · Check-in Speed & Discretion · Amenities Quality · Quietness & Privacy |
| **Coffee Shop** | Weed Quality · Chill Ambiance · Seating & Space · Staff Friendliness & Vibe · Session Quality |
| **Ladyboy Bar** | Ladyboy Beauty & Freshness · Ladyboy Friendliness & Vibe · Ambiance · Seating & Space · Bar Service |
| **Gay Bar** | Guy Looks & Freshness · Friendliness & Vibe · Ambiance · Seating & Space · Bar Service |

Sub-categories inherit from parent via `CATEGORY_ALIAS` mapping in `rating-criteria.ts`:
- russian-gogo → gogo-bar, ladyboy-gogo → gogo-bar, ladyboy-club → club, ladyboy-massage → massage, gay-gogo → gogo-bar, gay-club → club, gay-massage → massage

Ratings stored as JSON in `VenueRating.scores` field. Half-star precision (0.5 increments).

#### Advanced Price Filters
- Slider-based max budget filters per price category
- Filters adapt to selected venue category
- Active filter count badge
- Clear all filters button
- Mobile-optimized filter panel (slide-up drawer)

#### Venue Detail Page (`/places/[slug]`)
- Cover banner image (clickable, opens gallery anchor)
- Photo count badge (camera icon)
- Permanently closed banner (if applicable)
- Media gallery with lightbox (arrow navigation, keyboard shortcuts, thumbnail strip, counter)
- Google Maps Embed API iframe (map with pin at venue coordinates)
- Full pricing table with group separators (color-coded)
- Venue rating form (half-star precision, category-specific criteria)
- Venue comments (threaded replies, votes)
- Venue favorite button
- Share button
- "Write a Review" link (opens community post form pre-filled with @venue-slug)
- Opening hours display with open/closed/closing-soon status
- Amenities display (pool, darts, card games, Jenga, beer pong — with quantities)
- Contact info (phone, WhatsApp, LINE, website)

#### Venue Creation/Edit Form (`/admin/venues/new`, `/admin/venues/[id]/edit`)
- Basic info: name, description, category, price range
- Address with Google Geocoding API (address -> lat/lng)
- Google Maps Embed preview
- Contact: phone (+66 auto-prefix), WhatsApp (+66 auto-prefix), LINE ID, LINE QR URL, website
- Opening hours: per-day schedule (Mon-Sun), open/close times, closed toggle
- Pricing fields: contextual based on category selection (all with min/max where applicable)
- Amenities: pool, darts, Connect 4, card games, Jenga, beer pong (with counts)
- Hotel stars (for short-time-hotel category)
- Cover image upload
- Multi-photo gallery upload (drag & drop, reorder)
- Massage pricing: Thai Massage, Foot Massage, Oil Massage
- Cannabis pricing: per gram (min/max), pre-roll (min/max)
- Toggles: Verified Spot, Active/Visible, ☠️ Permanently Closed

#### Sorting Options
- Rating (high/low)
- Reviews (most/least)
- Hot (mentions count)
- Newest/Oldest
- Name (A-Z / Z-A)
- Price (low/high)

#### Additional Filters
- Star rating minimum (2+, 3+, 4+, 4.5+)
- Price range ($, $$, $$$)
- Open Now (based on venue hours)
- Amenities: Pool, Darts, Connect 4, Cards, Dices, Beer Pong
- Text search (name + description)
- Verified venues only

---

### Emoji & GIF System

#### Emoji Picker
- Component: `src/components/ui/emoji-picker-button.tsx`
- Uses `emoji-picker-react` v4.18.0 with `EmojiStyle.NATIVE` (system emojis, no CDN dependency)
- Dark theme, dynamically imported (`next/dynamic`, no SSR)
- Available in all text input zones (comments, posts, bio)
- Inserts emoji at cursor position in textarea

#### GIF Picker (GIPHY)
- Component: `src/components/ui/gif-picker.tsx`
- GIPHY API proxy at `/api/gifs/route.ts` (key: env `GIPHY_API_KEY`, 100 calls/hour, rating "r")
- Search with 350ms debounce, masonry 2-column grid, "Load more" pagination
- Powered by GIPHY attribution footer

#### GIF Embedding (Reddit-style)
- **Max 1 GIF per comment/post/venue-comment** (like Reddit)
- GIF stored as `[gif](url)` tag at end of content value
- MentionInput separates text from GIF: textarea shows text only, GIF preview rendered visually inside the composition container (below textarea, same border)
- X button (top-left, visible on hover) to remove the GIF
- GIF button greys out when a GIF is already inserted ("remove first")
- Hidden `<input>` carries the full value (text + gif tag) for form submission
- `MentionText` renderer parses `[gif](url)` and renders inline `<img>` or `<video>` with `referrerPolicy="no-referrer"`
- `isVideoUrl()` check: `.mp4`/`.webm` → `<video muted autoPlay loop>`, otherwise `<img>`
- Existing content with `[gif](*.mp4)` from old RedGIFs entries still renders correctly

#### NSFW 18+ Tab (Removed)
- Previously had a RedGIFs tab for NSFW GIFs, but the API was unreliable
- Tab removed from picker; API route `/api/gifs/redgifs` still exists but is unused

---

### Blog Section (`/vlogs`) — Full SEO Content Platform (Pillar Content Strategy)

**Content strategy:** Long-form faceless articles (1500-3500+ words), text-heavy with real prices, on-the-ground observations, comparison tables, insider tips. Designed to rank for "Pattaya nightlife", "Pattaya gogo bars 2026", "พัทยา โกโก้บาร์" and equivalents in 12 languages.

#### Listing Page (`/vlogs`)
- Article listing with 2-column responsive grid (sm+)
- **Category tabs** at top: clickable `BlogCategory` filter tabs (All + each category), URL param `?category=slug`
- **Tag filter bar**: clickable tag badges, toggle on/off via `?tag=slug` URL param, active state styling
- Active filter indicator with article count + "Clear filters" link
- Each card shows: cover image, reading time badge, category badge (with color), tags (max 3), title, excerpt with @mentions/#hashtags (via `MentionText`), date (relative), view count, author
- JSON-LD `CollectionPage` + `ItemList` schema (up to 30 articles)
- Dynamic metadata: page title includes active tag/category name
- ISR: `revalidate = 60` (1 min)

#### Detail Page (`/vlogs/[slug]`)
- **Markdown rendering** via `react-markdown` + `remark-gfm` + `rehype-slug` + `rehype-autolink-headings`
  - Custom renderers: neon-styled comparison tables, gradient headings with anchor links, pink-bordered blockquote callouts, Next.js `<Image>` for embedded images, `@mention` → venue links (purple), `#hashtags` → cyan styled
- **Table of Contents** — auto-generated from markdown h2/h3/h4, collapsible on mobile, sticky with IntersectionObserver active section highlight
- Optional YouTube embed (auto-detected via `extractYouTubeId()`)
- Cover image hero with `<figcaption>` visible caption (EEAT: "Photo taken at Walking Street, March 2026")
- Photo gallery section (from `BlogMedia`)
- **Field Notes** section — visible terrain observations with dates/locations (EEAT proof of first-hand experience)
- **FAQ accordion** — expandable `<details>/<summary>` with rotate icon animation
- **Sources & References** section — numbered citations with external links
- **EEAT author box** — actual author avatar, "Pattaya Vice Team" description, `rel="author"` link to `/about`, Contact link, `itemScope itemType="Organization"` microdata
- **Related Articles** section — 4 articles matched by shared category > shared tags > recent (server component with fallback to popular)
- Category + Tags displayed as clickable badges (link to `/vlogs?category=` / `/vlogs?tag=`)
- Visible breadcrumb on all screen sizes (Home > Blog > [Category] > Article)
- Reading time, view count, publish date, last modified date
- Smart back navigation via `BackButton` component
- View count auto-incremented on page load via `incrementVlogViews()`

#### SEO (Blog Detail) — Up to 4 JSON-LD schemas per article (centralized via `src/lib/jsonld.ts`):
1. **Article** — headline, description, images, datePublished, dateModified (uses `lastModifiedAt || updatedAt`), author (Organization), publisher with logo, wordCount, inLanguage, isAccessibleForFree, **speakable** (SpeakableSpecification targeting h1 and excerpt), keywords, about (from tags), **citation** (from sources JSON), optional **video** (VideoObject for YouTube)
2. **BreadcrumbList** — dynamic: Home > Blog > [Category if set] > Article Title
3. **FAQPage** (conditional) — from `faqs` JSON field
4. **HowTo** (conditional) — when `articleType === "howto"`, auto-extracts steps from `## Step N:` / `## 1.` markdown headings with totalTime from readingTime
- Auto-generated `metaTitle` and `metaDescription` if not manually set (from title + excerpt/content)
- Custom `canonicalSlug` support for consolidating duplicate/updated articles
- OG tags with cover image (with alt text), article type, publishedTime, modifiedTime
- Canonical URL per article (uses `canonicalSlug` if set)
- OpenGraph `article:published_time` and `article:modified_time`

#### Blog Data Model (Expanded)
- `Vlog` model: title, slug, excerpt (150-300 chars), content (markdown long-form body), description (legacy compat), metaTitle, metaDescription, focusKeyword, coverImageUrl, **coverImageAlt**, **coverImageCaption** (EEAT), youtubeUrl, thumbnailUrl, **articleType** ("article" | "guide" | "howto" | "review" | "listicle"), isPublished, publishedAt, **lastModifiedAt** (manual meaningful update date), readingTime (auto-calculated at 200 WPM), viewCount, faqs (JSON array), **sources** (JSON array of `{title, url?, date?}`), **fieldNotes** (terrain observations text), **canonicalSlug**, authorId, **blogCategoryId** (FK to BlogCategory)
- `BlogMedia` model: url, alt, caption, order — attached to Vlog (cascade delete)
- `BlogTag` model: name, slug (unique), **description** — many-to-many with Vlog via `VlogTags` relation
- **`BlogCategory` model** (NEW): name, slug (unique), description, color, order — one-to-many with Vlog
- Indexes on `[isPublished, publishedAt]`, `[isPublished, createdAt]`, `[blogCategoryId]`

#### Blog Admin
- Create/edit/delete articles at `/admin/vlogs`
- `VlogForm` component with sections:
  - **Article Content**: title, **articleType selector** (Article/Guide/How-To/Review/Listicle), excerpt, **markdown editor** (`@uiw/react-md-editor` with dark theme, preview pane), cover image URL + **alt text** + **caption** (EEAT)
  - **SEO Settings**: metaTitle (max 60 chars), metaDescription (max 160 chars), focusKeyword, **canonicalSlug**
  - **Category & Tags**: **BlogCategory dropdown selector** (populated from DB), comma-separated tags
  - **EEAT — Field Notes & Sources**: **fieldNotes textarea**, **dynamic sources list** (title + URL + date, add/remove)
  - **FAQ Section**: dynamic FAQ list (question + answer, add/remove) — generates FAQPage schema
  - **YouTube Video** (optional): URL input with live preview embed
  - **Publish Settings**: published toggle, publish date, **last modified date**
- `BlogMediaManager` component: upload multiple images with alt text and caption, delete individually
- Reading time auto-calculated from content word count (200 WPM)
- **Auto-generation**: metaTitle and metaDescription are auto-generated from title/excerpt if not manually provided

#### Blog Server Actions (`src/actions/vlogs.ts`)
- `createVlog()` — full article creation with tag upsert, slug deduplication, reading time calc, auto SEO meta generation, category connect, sources/faqs JSON
- `updateVlog()` — update with tag sync (set + connect), slug regeneration on title change, category update
- `deleteVlog()` — cascade delete (media, tag relations)
- `addBlogMedia()` — add image to article with auto-ordering
- `deleteBlogMedia()` — remove individual image
- `incrementVlogViews()` — atomic view count increment (silent fail on error)
- **`searchVlogs()`** — search published articles by title (for internal linking helper)

- Navigation tab between Community and About in header, mobile nav, and mobile logo menu
- ISR: listing revalidate 60s, detail revalidate 300s

### Community Forum

- Reddit-style post creation with title, content, media, polls
- Multi-category selection (up to 5 categories per post, user must pick at least 1)
- Category filter: Straight, Ladyboy, Gay sections
- Upvote/downvote system with karma tracking
- Threaded comment system (replies to replies, unlimited depth)
- @mention system — type `@venue-name` to link venues (autocomplete dropdown)
- #hashtag support with colored highlighting (cyan)
- @mention highlighting (purple)
- Inline GIF embedding in posts and comments (via `[gif](url)` syntax)
- Emoji picker in all text inputs
- "Write a Review" from venue page auto-fills `@venue-slug` in content
- Post bookmarks/favorites
- Content reporting (8 report categories)
- Media attachments (photos/videos, up to 10 per post)
- Post ratings (star-based)

### Poll System
- Create polls with custom question + multiple options
- Single-vote per user
- Results shown after voting (percentage bars with animations)
- Integrated into post creation form

### User System
- Registration with username/email/password
- Google OAuth login
- User profiles with:
  - Avatar upload
  - Bio, country
  - Karma score display
  - Badges (karma-based)
  - Post history
  - Favorites list
- Admin roles (Admin badge replaces karma badge for admins)
- Venue owner accounts (verified via verification request system)

### MentionInput Component (`src/components/ui/mention-input.tsx`)
- Shared textarea component for posts and comments
- **!username** autocomplete for user mentions (searches users via `/api/users/search`, debounced)
- **@venue-slug** autocomplete for venue mentions (searches venues via `/api/venues/search`, debounced)
- !user mentions highlighted in pink (#ff2d95), @venue mentions in purple (#C084FC)
- #hashtag highlighting (cyan color)
- **GIF embedding**: textarea shows text only; GIF rendered as visual preview inside the composition container (below textarea, shared border). Max 1 GIF. X button to remove.
- **Emoji picker** button in toolbar
- **GIF picker** button in toolbar (disabled when GIF already inserted)
- Hidden input carries full value (`text\n[gif](url)`) for form submission

### MentionText Component (`src/components/ui/mention-text.tsx`)
- Renders !user mentions (pink links to `/profile/{username}`), @venue mentions (purple links to `/go/{slug}`), #hashtags (cyan), and `[gif](url)` inline embeds
- GIF rendering: `<img>` for image URLs, `<video muted autoPlay loop>` for `.mp4`/`.webm`
- `referrerPolicy="no-referrer"` on all external media (bypass anti-hotlinking)
- Used in: post-card, post-detail, comment-item, venue-comments

### Notification System
- **Notification model**: type (mention_post, mention_comment), recipientId, actorId, postId, commentId, read flag
- **!mention triggers**: when a post or comment contains !username, a notification is created for that user (self-mentions excluded)
- **Notification badge**: red badge with count on profile avatar (mobile nav + desktop header), polls every 30s
- **Mentions tab**: on own profile page, shows list of mentions with unread indicator (pink dot), click navigates to the post/comment
- **Mark as read**: button to mark all as read, individual mark-on-click
- **API**: GET `/api/notifications` (count + list), POST `/api/notifications` (mark all read)
- **User search API**: GET `/api/users/search?q=` returns matching profiles (username, displayName, avatar)

### Search
- Search input with history (localStorage, max 5 entries)
- Separate history for spots (`pvc_search_spots`) and community (`pvc_search_community`)
- History filtering while typing
- Remove individual history entries

### Content Moderation
- ContentReport model — users can report posts, comments, venues
- 8 report categories: spam, harassment, misinformation, hate speech, violence, NSFW, doxxing, other
- Admin review dashboard

### Translation System
- Auto-translate content between supported languages
- Cached translations in database (Translation model)
- Supports posts, comments, venue comments
- Source language saved per content

### Contact Form
- Name, email, subject, message fields
- Saves to ContactMessage in database
- Sends email via Resend API to `contact@pattayavicecity.com`
- Cloudflare Email Routing forwards to personal email
- Rate limited

### The Vice Squad (Members Page)
- `/members` — Public leaderboard showing all registered users ranked by karma
- **Admin tier** for admin users: gradient badge (rose→violet→cyan), gradient Shield circle rank icon with glow, Orbitron font name, ∞ karma display
- Admins always pinned at top (unranked between themselves), regular members ranked from #1
- Stats bar: total members, Admins count, Legends count, OGs count
- Per-member display: rank, avatar (gradient ring for admins/top3), name, karma tier badge, join date, country, resident type, karma points, posts/comments/ratings counts
- Karma tier system: Lurker (0) → Tourist (10) → Regular (50) → Local (150) → OG (400) → Legend (1000)
- ISR revalidated every 120s

### Global Back Button
- Fixed gradient back button (rose→violet→cyan circle, h-12 w-12, ArrowLeft icon) in main layout
- Positioned at `top-[5rem]` aligned with content start, placed in the left gap of the `max-w-7xl` container via `-ml-16` — sits to the left of page titles/categories without overlapping
- Desktop only (`lg+`), hidden on mobile and on homepage
- Uses `router.back()` with fallback to homepage
- Inline back button text variant still available for detail pages

### Legal Page
- Complete Terms of Service, Privacy Policy, Community Guidelines
- Fully translated in all 12 languages
- Links in footer (translated)
- ISR cached for 24 hours

---

## Database Models (Prisma)

38 models in `prisma/schema.prisma`:

| Model | Purpose |
|---|---|
| Profile | User accounts (username, email, avatar, bio, country, karma, admin flag) |
| Category | Venue and post categories (name, slug, color, icon, sortOrder) |
| Venue | Nightlife venues (50+ fields: info, pricing, amenities, location, permanentlyClosed, isRecommended) |
| VenueMenuMedia | Venue menu photos (url, order, venueId) |
| Vlog | Blog articles (title, slug, excerpt, content, description, metaTitle, metaDescription, focusKeyword, coverImageUrl, coverImageAlt, coverImageCaption, youtubeUrl, thumbnailUrl, articleType, isPublished, publishedAt, lastModifiedAt, readingTime, viewCount, faqs JSON, sources JSON, fieldNotes, canonicalSlug, lastVerifiedAt, terrainProof JSON, translations JSON, readabilityScore, keywordDensity JSON, authorId, blogCategoryId) |
| BlogMedia | Blog article images (url, alt, caption, order, vlogId) — cascade delete |
| BlogTag | Blog tags (name, slug, description) — many-to-many with Vlog via VlogTags |
| BlogCategory | Blog categories (name, slug, description, color, order) — one-to-many with Vlog |
| SlugRedirect | 301 redirect mapping (oldSlug → newSlug) for renamed articles — unique index on oldSlug |
| Post | Community forum posts (title, content, slug, media, categories) |
| PostImage | Legacy post images |
| PostMedia | Post media attachments (type, url, order) |
| PostCategory | Many-to-many post<->category |
| CommentMedia | Comment media attachments |
| VenueMedia | Venue photos/videos (url, type, order) |
| Comment | Post comments (threaded via parentId) |
| CommentVote | Comment upvotes/downvotes |
| Vote | Post upvotes/downvotes |
| Favorite | Post bookmarks |
| Rating | Legacy ratings |
| VenueRating | Venue star ratings (overall + per-criteria JSON scores) |
| VenueComment | Venue reviews/comments (threaded) |
| VenueCommentVote | Venue comment votes |
| VenueFavorite | Venue favorites |
| VenueView | Venue page view tracking |
| VerificationRequest | Venue owner verification |
| Poll | Polls attached to posts |
| PollOption | Poll answer options |
| PollVote | User poll votes |
| PageView | General page view analytics |
| ContactMessage | Contact form submissions |
| Translation | Cached content translations |
| ContentReport | User content reports |
| Event | (Reserved — not active in V1) |
| EventInterest | (Reserved — not active in V1) |
| Girl | (Reserved — not active in V1) |
| GirlRating | (Reserved — not active in V1) |
| GirlComment | (Reserved — not active in V1) |
| GirlCommentVote | (Reserved — not active in V1) |

### Venue Pricing Fields (in Venue model)
```
priceSoftDrink, priceBeerMin, priceBeerMax, priceAlcoholMin, priceAlcoholMax,
priceLadyDrink, priceBottleMin, priceBottleMax,
priceBarfineMin, priceBarfineMax, priceShortTimeMin, priceShortTimeMax,
priceLongTimeMin, priceLongTimeMax,
priceRoomSmall, priceRoomLarge, priceBJ, priceBoomBoom,
priceTableSmall, priceTableMedium, priceTableLarge,
priceThaiMassage, priceFootMassage, priceOilMassage,
priceCoffeeMin, priceCoffeeMax, priceFoodMin, priceFoodMax,
hotelStars
```

### Venue Amenity Fields
```
hasPool, poolCount, hasDarts, dartsCount, hasConnect4, connect4Count,
hasCardGames, hasJenga, hasBeerPong, hasConsoles, hasBoardGames, hasWifi, hasTV
```

### Venue Status Fields
```
isVerified, isActive, permanentlyClosed, isRecommended
```

---

## Component Architecture

### Layout Components (`src/components/layout/`)
- `header.tsx` — Server component, fetches user session, passes nav items to NavLinks
- `header-client.tsx` — Client component, avatar dropdown
- `nav-links.tsx` — Client component, renders desktop nav links with active state highlighting (cyan text + gradient underline bar on current page)
- `mobile-nav.tsx` — Mobile bottom nav bar (spots, community, post, blog, squad, profile) with Crown icon for Squad, active state highlighting (cyan icon + pink underline)
- `user-menu.tsx` — User avatar dropdown menu
- `language-selector.tsx` — 12-language dropdown with flag icons
- `theme-selector.tsx` / `theme-toggle.tsx` — Dark/light theme
- `page-view-tracker.tsx` — Analytics page view tracking (uses `next/navigation` usePathname, lives in root layout)
- `navigation-progress.tsx` — Top loading bar on route changes (uses `next/navigation` usePathname, lives in root layout)
- `age-gate.tsx` — 18+ age verification modal (uses `useTranslations`, lives inside `NextIntlClientProvider` in `[locale]/layout.tsx`)
- `sunset-background.tsx` — Animated background
- `top-spots.tsx` — Sidebar widget: top-rated venues
- `trending-venues.tsx` — Sidebar widget: trending venues
- `pwa-prompt.tsx` — PWA install prompt

### UI Components (`src/components/ui/`)
- All Radix UI primitives (Avatar, Badge, Button, Card, Dialog, Dropdown, Input, Label, Select, Separator, Tabs, Textarea, Toast)
- `search-input.tsx` — Search with history (localStorage)
- `mention-input.tsx` — !user mentions + @venue mentions + #hashtags textarea + embedded GIF preview + emoji picker
- `mention-text.tsx` — Renders !user mentions (pink), @venue mentions (purple), #hashtags (cyan), and `[gif](url)` inline embeds
- `notification-badge.tsx` — Red badge with unread count, polls every 30s
- `emoji-picker-button.tsx` — Emoji picker (emoji-picker-react, native style, dark theme)
- `gif-picker.tsx` — GIPHY GIF picker (search, masonry grid, load more)
- `media-uploader.tsx` — Multi-file upload with preview
- `media-grid.tsx` — Responsive media grid display
- `image-upload.tsx` — Single image upload (cover photos)
- `report-button.tsx` — Content reporting modal
- `country-select.tsx` — Country dropdown (profile)
- `translatable-text.tsx` — Auto-translate content wrapper
- `admin-badge.tsx` — Admin badge
- `karma-badge.tsx` — Karma level badge
- `venue-disclaimer.tsx` — Legal disclaimer
- `back-button.tsx` — Smart back navigation (uses `router.back()` with fallback href): inline variant on detail pages + floating gradient variant in main layout (desktop only, hidden on homepage)

### Feature Components
- `posts/` — PostForm, PostCard, PostDetail, PostFeed, VoteButtons, FavoriteButton, PollCreator, PollDisplay, RatingForm, StarRating, CategoryFilter, FeedTabs, VerifiedBadge
- `comments/` — CommentForm, CommentItem, CommentList (threaded)
- `venues/` — VenueMediaGallery (lightbox), VenueMenuGallery (menu lightbox), VenueFavoriteButton, VenueRatingForm, VenueComments, VenueViewTracker
- `spots/` — AdvancedPriceFilters, MobileCategoryPanel, MobileFiltersPanel
- `auth/` — LoginForm, RegisterForm, EscapeHandler
- `blog/` — MarkdownContent (react-markdown renderer with custom components, @mention/@hashtag preprocessing), TableOfContents (IntersectionObserver active section tracking, collapsible mobile), RelatedArticles (server component, category/tag/recent fallback)
- `admin/` — VenueForm, VenueMediaManager, VenueMenuMediaManager, VlogForm (markdown editor @uiw/react-md-editor, 8 form sections, article type selector, dynamic sources/FAQs/terrainProofs lists, category dropdown, internal link buttons, SEO score sidebar), InternalLinkModal (debounced search for venues/articles, insert markdown links), SeoScorePanel (live Flesch-Kincaid readability, keyword density, title/desc length, heading/link checks), BlogMediaManager, DeleteButton, AdminManager, AddressAutocomplete
- `contact/` — ContactForm
- `profile/` — ProfileEditForm, ProfileTabs

---

## Server Actions (`src/actions/`)

| File | Actions |
|---|---|
| `auth.ts` | signIn, signUp, signOut, signInWithGoogle, getCurrentUser, getUserProfile, updateProfile, requestVerification |
| `posts.ts` | createPost, updatePost, deletePost |
| `comments.ts` | createComment, updateComment, deleteComment |
| `comment-votes.ts` | voteOnComment |
| `votes.ts` | voteOnPost |
| `favorites.ts` | toggleFavorite |
| `ratings.ts` | submitRating |
| `venues.ts` | createVenueAdmin, updateVenueAdmin, deleteVenueAdmin, addVenueMenuMedia, deleteVenueMenuMedia (handles permanentlyClosed, isRecommended) |
| `vlogs.ts` | createVlog, updateVlog, deleteVlog, addBlogMedia, deleteBlogMedia, incrementVlogViews, searchVlogs, searchVenues (internal linking helpers); computes readabilityScore + keywordDensity on save; creates SlugRedirect 301 on slug rename |
| `venue-comments.ts` | createVenueComment, deleteVenueComment |
| `venue-ratings.ts` | submitVenueRating |
| `venue-favorites.ts` | toggleVenueFavorite |
| `polls.ts` | votePoll |
| `contact.ts` | submitContact |
| `language.ts` | setLanguage, getLanguage, syncLanguagePreference |
| `admin.ts` | toggleAdmin, getAdmins |
| `analytics.ts` | trackPageView |

---

## Performance Optimizations

### Image Optimization
- All images use Next.js `<Image>` component (optimized loading, AVIF/WebP format)
- Remote patterns configured for trusted sources (Unsplash, Google, GitHub, Discord)
- 24-hour image cache TTL
- Zero raw `<img>` tags in production code (except for external GIFs which require `referrerPolicy`)
- Flag icons in language selector use `<Image>` with explicit width/height

### Caching Strategy
- **ISR (Incremental Static Regeneration):**
  - Homepage: `revalidate = 60` (1 min)
  - Venue detail: `revalidate = 300` (5 min)
  - Analytics: `revalidate = 60`
  - Legal page: `revalidate = 86400` (24h)
- **Static assets:** `Cache-Control: max-age=31536000, immutable`
- **Images:** `Cache-Control: max-age=2592000, stale-while-revalidate=86400`
- **Uploaded files:** `Cache-Control: public, max-age=31536000, immutable`

### Bundle Optimization
- `optimizePackageImports`: lucide-react, @radix-ui/react-icons, date-fns
- `compress: true` in Next.js config
- `removeConsole: true` in production (compiler option)
- `poweredByHeader: false`

### Font Loading
- `next/font/google` with `display: "swap"` for Inter and Orbitron
- Loaded as CSS variables, no render-blocking

### Service Worker (PWA)
- Cache-first strategy for static assets (JS bundles, images, fonts, CSS)
- Network-first strategy for dynamic content (pages, API)
- Pre-caches `/` and `/community`
- Old cache cleanup on activation
- Manifest with 192x192 and 512x512 icons

### Database Queries
- Bulk queries with `include` and `_count` (no N+1)
- Raw SQL batch operations for mention counting (CASE WHEN)
- `Promise.all()` for parallel data fetching
- Extended fields fetched in bulk via raw SQL

### Text Utilities
- `truncate()` uses `Array.from()` for emoji-safe string truncation (preserves multi-byte Unicode characters / surrogate pairs)

---

## Security Measures

### Authentication & Authorization
- NextAuth v5 with JWT strategy
- bcrypt password hashing (12 salt rounds)
- Google OAuth integration
- Admin role checks on all admin actions and pages
- Rate limiting on login (5/15min), registration (3/hr), uploads (20/min), posts/comments (10/min)
- Registration requires 8+ character password, 18+ age verification
- Username validation: 3-20 chars, alphanumeric + underscore only

### Content Security Policy (CSP)
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: blob: https://images.unsplash.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://cdn.discordapp.com https://flagcdn.com https://*.giphy.com https://media0-4.giphy.com https://cdn.jsdelivr.net https://*.redgifs.com;
media-src 'self' https://*.redgifs.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://maps.googleapis.com https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net;
frame-src https://www.google.com https://maps.google.com https://www.youtube.com;
object-src 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```
- `'unsafe-eval'` added only in dev mode
- GIPHY and RedGIFs domains whitelisted in img-src/media-src

### HTTP Security Headers
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Permitted-Cross-Domain-Policies: none`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()`
- `X-DNS-Prefetch-Control: on`

### SQL Injection Prevention
- Prisma ORM for most queries (automatic parameterization)
- Raw SQL uses parameterized queries (`$1`, `$2` placeholders via `param()` helper)
- `qi()` helper for quoted identifiers (prevents identifier injection)
- `updateExtendedFields()` uses parameterized WHERE clause

### File Upload Security
- Authentication required (401 if not logged in)
- Rate limited: 20 uploads/min per user
- MIME type whitelist: images (jpeg, png, webp, gif, avif), videos (mp4, webm, quicktime, avi, mov), documents (pdf)
- Size limits: images 10MB, videos 100MB, documents 20MB
- Safe filenames: `${Date.now()}-${random}.${ext}` (no user input in filename)

### Input Validation
- `optInt()` validates numeric inputs with max value cap (1,000,000)
- Zod schemas for auth forms (auth.ts, post.ts, comment.ts)
- Email validation on contact form
- Slug generation strips special characters

### Path Traversal Protection
- Upload route sanitizes path segments (`/[^a-zA-Z0-9._-]/g`)
- `resolve()` + `relative()` check ensures resolved path stays within upload directory
- Returns 403 Forbidden on traversal attempt

### Cookie Security
- `sameSite: "lax"` on locale cookie
- `secure: true` in production
- NextAuth session cookies with built-in security

### Rate Limiting
- In-memory rate limiting via `src/lib/rate-limit.ts`
- Applied to: auth endpoints, file uploads, post/comment creation
- Configurable window and max attempts per limiter

---

## Testing

### Test Infrastructure
- **Framework:** Vitest v2.1.9
- **Database:** Separate PostgreSQL test database (`pattayavicecity_test`)
- **Setup:** Automatic DROP + CREATE + schema push + seed before tests
- **Teardown:** Automatic database drop after tests
- **Config:** `fileParallelism: false` (prevents DB conflicts)

### Test Files
- `tests/setup.ts` — Test database lifecycle management, category seeding
- `tests/spots.test.ts` — 139 tests (venue CRUD, pricing, amenities)
- `tests/community.test.ts` — 105+ tests (posts, comments, votes, polls, ratings, !mentions, notifications, username uniqueness)
- **Total: 244+ tests**

### Test Coverage

**Spots tests (139):**
- Venue CRUD per category (create, read, update, delete for all 17 spot categories)
- Extended pricing fields (per-category pricing data)
- Partial update of extended fields
- Full spot with ALL fields populated
- Minimal spot (required fields only)
- Amenities/games toggle
- Massage-specific pricing (Thai, Foot, Oil)
- Hotel stars (1-5)
- Category-specific visible groups validation
- Input validation: empty fields, very long names, boundary coordinates, zero prices, large prices
- Boolean amenity toggle on/off
- Image URL store, update, clear
- Half-star venue ratings (all 0.5 increments from 0.5 to 5)
- Rating average computation
- Category consistency (all 21 categories seeded, price groups, games mapping, community-only slugs)

**Community tests (90):**
- Post CRUD (create, read, update, delete)
- Multi-category posts (assign up to 5 categories, add/remove all)
- Comments (create, threaded replies, delete)
- Post votes (upvote, downvote, toggle, score calculation)
- Comment votes (upvote, downvote, uniqueness)
- @venue mentions parsing (regex + DB verification, single/multiple/mixed)
- !user mentions parsing (regex, deduplication, store/retrieve)
- #hashtags parsing (regex + DB verification)
- Notifications (create, count unread, mark-as-read, link to post, cascade delete)
- Username uniqueness (DB unique constraint, case sensitivity)
- Post ratings (create, update, upsert)
- Post favorites (add, remove, toggle)
- Venue comments (create, reply, delete, tree structure)
- Venue comment votes
- Venue ratings (half-star precision, criteria scores, one-per-user upsert)
- Venue favorites
- Venue media gallery (add, reorder, delete)
- Polls (create, vote, one-vote-per-user, results)
- Post media (attach, order, delete)
- Cascade deletes (post -> comments/votes/favorites/comment-votes, venue -> comments/ratings/media/favorites)
- Massage pricing fields validation
- **Edge cases & robustness:**
  - Very long content (10,000 chars)
  - Foreign key enforcement: comment/vote/favorite on deleted post fails
  - Duplicate vote/favorite prevention (unique constraint)
  - Operations on non-existent resources (venue rating, post comment)
  - Empty title/content posts
  - Venue rating upsert (update instead of duplicate)

---

## Environment Variables

| Variable | Purpose |
|---|---|
| DATABASE_URL | PostgreSQL connection string |
| SESSION_SECRET | Iron session encryption |
| NEXT_PUBLIC_APP_URL | Public app URL |
| AUTH_TRUST_HOST | NextAuth host trust |
| NEXTAUTH_URL | NextAuth callback URL |
| AUTH_SECRET | NextAuth secret |
| AUTH_GOOGLE_ID | Google OAuth client ID |
| AUTH_GOOGLE_SECRET | Google OAuth client secret |
| GOOGLE_MAPS_KEY | Google Maps API key (server-side) |
| NEXT_PUBLIC_GOOGLE_MAPS_KEY | Google Maps API key (client-side, Maps Embed + Geocoding) |
| RESEND_API_KEY | Resend email API key |
| GOOGLE_TRANSLATE_API_KEY | Google Translate API key (server-side) |
| GIPHY_API_KEY | GIPHY API key (100 calls/hour limit) |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anonymous key |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key |

**Google Cloud APIs required:**
- Maps Embed API (free, unlimited)
- Geocoding API (free tier: $200/month credit ~ 40k requests)

---

## Deployment

### Server-side commands
```bash
# Standard update (no schema changes)
cd ~/PattayaViceCity
git pull && rm -rf .next && npm run build && pm2 restart pattaya

# With DB schema changes
cd ~/PattayaViceCity
git pull && npx prisma db push
rm -rf .next && npm run build && pm2 restart pattaya

# Full reset (with npm install + prisma generate)
cd ~/PattayaViceCity
git pull && npm install && npx prisma generate
rm -rf .next && npm run build && pm2 restart pattaya
```

### SSH Deployment Workflow
- **SSH alias:** `ssh pattaya` connects to VPS
- **App path on server:** `~/PattayaViceCity`
- Workflow: commit/push locally, then SSH to server and run deploy commands
- Always `rm -rf .next` before rebuild to avoid stale chunk issues

### Infrastructure
- **Server:** Hetzner VPS (Debian/Ubuntu)
- **SSH:** Port 2222 (hardened, key-only auth, AllowUsers whitelist)
- **Users:** `bababobo` (admin), `topgdev` (admin) — both sudo NOPASSWD
- **App path:** `~/PattayaViceCity` (home of connected user)
- **PM2 process:** `pattaya` (config in `deploy/ecosystem.config.js`)
- **Port:** 3000 (behind Cloudflare proxy)
- **Node:** Production mode (`next start`)
- **Nginx:** Reverse proxy config in `deploy/nginx-pattayavicecity.conf`
- **SSL:** Cloudflare (Full mode)
- **Domain:** pattayavicecity.com (DNS via Cloudflare)
- **Email:** Cloudflare Email Routing → personal email

### Deploy scripts available
- `deploy/deploy.sh` — Automated deployment script
- `deploy/vps-setup.sh` — Initial VPS setup (Node, PM2, Nginx, PostgreSQL)
- `deploy/ecosystem.config.js` — PM2 configuration
- `deploy/nginx-pattayavicecity.conf` — Nginx reverse proxy config

### SSH Hardening
- Custom port 2222 (not default 22)
- Password authentication disabled (key-only)
- AllowUsers whitelist in `/etc/ssh/sshd_config.d/`
- Root + deploy + bababobo + topgdev authorized

---

## Mobile Responsiveness

### Responsive Design
- All pages fully responsive (mobile-first approach via Tailwind)
- Mobile navigation: bottom nav bar (spots, community, post, blog, squad, profile) + hamburger slide-out menu
- Mobile filters: bottom slide-up drawer panel
- Mobile category selector: horizontal scroll with arrows
- Touch-friendly: large tap targets, swipe-friendly gallery
- Viewport: `width=device-width, initialScale=1, viewportFit=cover`
- Theme color: `#0f0b15`

### PWA (Progressive Web App)
- `public/manifest.json` — App manifest (standalone mode)
- `public/sw.js` — Service Worker with dual caching strategy
- Install prompt component (`pwa-prompt.tsx`)
- App icons: 192x192 and 512x512 (+ maskable)
- Offline support: cached pages served when network unavailable

---

## SEO

### Meta Tags
- Title template with site name fallback
- Comprehensive description + 19 keywords
- OpenGraph tags (type, locale, url, siteName, title, description, images)
- Twitter card: `summary_large_image`
- Robots: index, follow (with googleBot specifics)
- Canonical URL

### Structured Data (JSON-LD) — centralized in `src/lib/jsonld.ts`
- **WebSite** schema (with SearchAction for Google sitelinks searchbox)
- **Organization** schema (about page — enhanced with logo ImageObject, foundingLocation, areaServed, sameAs links, expanded knowsAbout)
- **Person** schema (about page — Nightlife Correspondent, worksFor Organization, knowsAbout, description)
- **ItemList** schema (venue listings on homepage)
- **CollectionPage** + **ItemList** schema (blog listing, up to 30 articles; category & tag archive pages with BreadcrumbList, up to 50 articles each)
- **Article** schema (blog detail — headline, description, ImageObject array, dates, Person author + Organization publisher, keywords, wordCount, dynamic inLanguage per locale, isAccessibleForFree, speakable CSS selectors, citations from sources, about from tags, lastReviewed from lastVerifiedAt, reviewedBy, terrain proof photos as associatedMedia with contentLocation)
- **HowTo** schema (conditional for `articleType === "howto"` — auto-extracts steps from `## Step N:` markdown headings)
- **BreadcrumbList** schema (blog detail — dynamic depth: Home > Blog > [Category] > Article)
- **FAQPage** schema (blog detail — conditional, from FAQ JSON field)
- **ImageObject** schema (all blog images: cover, media gallery, terrain proofs — with description, caption, author, dateCreated, contentLocation)
- **VideoObject** schema (blog articles with YouTube embed — auto-extracted from youtubeUrl)

### Dynamic OG Image Generation
- API route `/api/og` using `@vercel/og` (`ImageResponse`)
- Neon-branded 1200x630 image: dark gradient background, gradient accent line, title, category badge, reading time, PVC logo
- Auto-fallback: articles without cover images use the dynamic OG route in OpenGraph/Twitter metadata
- Query params: `title`, `category`, `readingTime`

### Technical SEO
- `robots.ts` — Dynamic robots.txt generation (locale-aware disallow rules, allows `/api/og`, blocks `/login` `/register`, restricts Google-Extended on community, references both `sitemap.xml` and `image-sitemap.xml`)
- `sitemap.ts` — Dynamic sitemap.xml with `alternates.languages` for all 12 locales per URL
  - Smart priority: `viewCount > 100` → 0.9, else 0.8
  - Smart changeFrequency: published within 30 days → 'weekly', else 'monthly'
  - Dedicated archive page URLs: `/vlogs/category/[slug]` (priority 0.7) and `/vlogs/tag/[slug]` (priority 0.6) with hreflang
- **Image sitemap:** `/image-sitemap.xml` route — indexes all blog article images (cover, media, terrain proof) and venue images (main, gallery, menu) with `<image:title>` and `<image:caption>` tags for Google Images
- **Slug redirect 301:** `SlugRedirect` model — when article slug changes, old slug redirects to new slug via `permanentRedirect()` in page component (chains updated automatically)
- **Hreflang tags:** Served via HTTP `Link` headers by next-intl middleware — all 12 languages + x-default on every page
- **URL-prefix i18n routing:** `/fr/`, `/th/`, `/zh/` etc. — Google indexes each language separately
- ISR for fresh content without full rebuilds
- Clean URL structure (`/places/[slug]`, `/post/[slug]`, `/vlogs/[slug]`, `/vlogs/category/[slug]`, `/vlogs/tag/[slug]`)
- Per-article SEO fields: `metaTitle`, `metaDescription`, `focusKeyword`, `canonicalSlug` (admin-editable)
- Auto-generated metaTitle/metaDescription from content when not manually set
- **Readability scoring:** Flesch-Kincaid computed on save (stored in DB), displayed in admin SEO panel
- **Keyword density:** Focus keyword density computed and stored as JSON on save
- **Admin SEO Score Panel:** Live analysis in sidebar — 12 checks: title length, meta desc length, content length, readability, keyword density, keyword in title, subheading count, internal link count, excerpt quality, content images, keyword in meta description, external links authority signal (all color-coded good/warning/bad)
- EEAT signals: Person author box with microdata (`itemScope itemType="Person"`, jobTitle, worksFor Organization, sameAs), field notes (terrain observations), terrain proof gallery (photos/receipts/GPS with date, location, caption), sources/citations as numbered list, cover image captions with dates, "Last verified on-site" green badge with Shield icon
- **Multi-language prep:** `translations` JSON field on Vlog for future per-locale content overrides

---

## File Statistics

- **175+ TypeScript/TSX files** in `src/`
- **85+ React components** across 12 directories (added `blog/`, `admin/internal-link-modal`, `admin/seo-score-panel`)
- **12 language files** with 1,062 translation keys each
- **39 Prisma models** (~830 lines in schema, includes SlugRedirect)
- **22+ API routes** (includes `/api/og` for dynamic OG images, `/image-sitemap.xml`)
- **16 server action files**
- **229 unit tests** (139 spots + 90 community)
- **~1,900 lines of test code**
- **38+ production dependencies, 9 dev dependencies** (added @vercel/og)

---

## Utility Libraries (`src/lib/`)

| File | Purpose |
|---|---|
| `prisma.ts` | Prisma client singleton |
| `auth/password.ts` | bcrypt hash/compare (12 rounds) |
| `auth/session.ts` | getCurrentUserId helper |
| `db-utils.ts` | SQL helpers: `param()`, `qi()`, `placeholders()`, `timestampParam()` |
| `rate-limit.ts` | In-memory rate limiter with auto-cleanup |
| `utils.ts` | General utilities (cn, formatRelativeDate, truncate with emoji-safe Array.from) |
| `karma.ts` | Karma level calculation + badge mapping |
| `mail.ts` | Resend API email sending |
| `translation.ts` | Content auto-translation with DB cache |
| `countries.ts` | Country list for profile select |
| `rating-criteria.ts` | Per-category venue rating criteria (5 per category, alias mapping for sub-categories) |
| `venue-hours.ts` | Opening hours display + open/closed/closing-soon status |
| `youtube.ts` | YouTube video ID extraction from various URL formats |
| `jsonld.ts` | Centralized JSON-LD structured data builders (Article, HowTo, BreadcrumbList, FAQPage, ImageObject) with Person author, lastReviewed, terrain proof photos, dynamic inLanguage |
| `seo-utils.ts` | SEO analysis: Flesch-Kincaid readability score, keyword density calculator, full SEO analyzer (12 checks: title/desc/content length, readability, keyword density, keyword in title/meta desc, headings, internal links, excerpt quality, content images, external links authority) |
| `supabase/client.ts` | Supabase browser client |
| `supabase/server.ts` | Supabase server client |
| `supabase/middleware.ts` | Supabase middleware helper |

---

## Scripts

| File | Purpose |
|---|---|
| `scripts/gen-ar-hi.js` | Generate Arabic + Hindi translation files from English source |
| `prisma/seed.ts` | Full database seed (categories, initial data). WARNING: purges all existing data |
| `prisma/add-massage-categories.ts` | Incremental migration: adds massage pricing columns |

---

## V1 Status

All core features are functional:
- Venue directory with search, filters, ratings, favorites, Google Maps, menu images
- Fire Spot team recommendation system (badge, filter, admin toggle)
- Blog section: **fully maxed-out SEO content platform** — every 2026 best practice applied:
  - **Internal Linking Helper** (`src/components/admin/internal-link-modal.tsx` — fully implemented): Client component modal with backdrop blur overlay, triggered by two toolbar buttons ("+ Venue Link" / "+ Article Link") above the markdown editor. **Search**: live debounced (300ms) via server actions `searchVlogs()` / `searchVenues()`. **Selection**: click a result to select it (highlighted with cyan border). **Preview panel**: shows the exact markdown code that will be inserted (e.g. `[Article Title](/vlogs/slug)`) + rendered preview showing link text and target URL. **Insertion**: gradient "Insert at cursor" button inserts at the current cursor position in the markdown editor (not appended at end), with auto-spacing. Articles insert `[title](/vlogs/slug)`, venues insert `@venue-slug` (rendered as rich links by `MentionText`). Search limited to 10 results, articles filtered to `isPublished: true`, venues to `isActive: true`.
  - **SEO Score Panel**: 14 checks (readability, keyword density, title/desc length, excerpt, images, internal/external links, keyword in title/description/intro/H2), weighted 0-100 score with progress bar + summary counts (passed/warnings/issues)
  - **"Optimize SEO" button**: auto-generates metaTitle (title + brand suffix, ≤60 chars) and metaDescription (keyword-rich from excerpt, ≤155 chars) with one click
  - **Multi-language translations** (fully operational end-to-end): Admin side — `TranslationsSection` component in `VlogForm` with 11 locale pills (fr/es/de/zh/ja/ko/th/ru/ar/hi/yue), per-locale fields (title, excerpt, metaDescription), filled locales show ✓, stored as JSON via Prisma `translations` field. Rendering side — `src/app/[locale]/(main)/vlogs/[slug]/page.tsx` resolves `const trans = (vlog.translations as Record<string, any>)?.[locale]` then `localTitle = trans?.title || vlog.title` and `localExcerpt = trans?.excerpt || vlog.excerpt`. These localized values replace the original in: `<h1>`, article excerpt, breadcrumb trail, OG title, OG image alt, twitter card title, YouTube iframe title, media gallery alts, and OG image URL params. `generateMetadata()` also uses `localTitle`/`localExcerpt`/`localMetaDesc` for SEO meta tags. Fallback is always the English original. Hreflang alternates in `sitemap.ts` already generate all 12 locale URLs per article.
  - **JSON-LD structured data**: Article, HowTo (from ## Step headings), BreadcrumbList, FAQPage (from FAQ editor), ImageObject (with dateCreated + contentLocation "Pattaya, Thailand" + author Organization), WebPage schema on homepage + about (AboutPage) + blog listing (CollectionPage) + members + category/tag archives (CollectionPage), WebSite with SearchAction, Organization, Person author
  - **Sitemaps** (3 sitemaps, all implemented as Next.js route handlers):
    - `/sitemap.xml` (`src/app/sitemap.ts`) — all pages (homepage, community, blog, about, legal, venues, articles, categories, tags) with `buildAlternates()` generating hreflang for 12 locales + x-default per URL, priority/changefreq based on content age and view count
    - `/image-sitemap.xml` (`src/app/image-sitemap.xml/route.ts`) — all blog cover images, blog media gallery, venue main images, venue media, venue menu images, each with `<image:title>`, `<image:caption>`, `<image:geo_location>Pattaya, Thailand</image:geo_location>`. Revalidation 1h
    - `/news-sitemap.xml` (`src/app/news-sitemap.xml/route.ts` — fully implemented, 62 lines) — Google News format, queries articles with `publishedAt >= 2 days ago`, outputs `<news:publication>` (name + language), `<news:publication_date>`, `<news:title>`, `<news:keywords>` (focusKeyword + tags). Revalidation 30min. Declared in `robots.ts`
  - **EEAT signals**: "Last verified on-site" badge with date, field notes (terrain observations), terrain proof gallery (photo/receipt/GPS with date/location), sources & citations (CreativeWork schema), Person + Organization author microdata, lastReviewed from verification date, reviewedBy
  - **Slug 301 redirects**: auto-created on title/slug change via `SlugRedirect` model with chain resolution (A→B→C updates to A→C, B→C), `permanentRedirect()` on 404 lookup
  - **Other**: dynamic OG image generation (@vercel/og), auto metaTitle/metaDescription, canonicalSlug support, related articles, table of contents, speakable specification, 5 article types (article/guide/howto/review/listicle), ISR 60s listing / 300s detail
  - **Hreflang**: dual implementation — sitemap alternates (12 locales + x-default per URL) + client-side `<link rel="alternate">` head tags
- Community forum with posts, comments, votes, polls, media
- Emoji picker + GIF picker (GIPHY) with Reddit-style inline embedding
- Rating criteria: 5 focused criteria per category + overall rating
- Permanently Closed feature for venues
- Full i18n (12 languages) with URL-prefix routing for international SEO, hreflang via sitemap alternates (12 locales + x-default) + client-side `<link>` head tags
- Admin dashboard with analytics
- Contact form with email delivery
- Content reporting/moderation
- Legal pages (ToS, Privacy, Guidelines)
- PWA with offline support
- 229 passing unit tests
- Performance optimized (Image components, ISR caching, bundle optimization, SW)
- Security hardened (CSP, parameterized SQL, path traversal protection, rate limiting, input validation)

Models for Girls/Events/Discord are reserved in the database schema but not exposed in the UI for V1.

### Architecture Notes
- **Root layout** (`src/app/layout.tsx`): ThemeProvider, Toaster, PageViewTracker, NavigationProgress — these use `next/navigation` (NOT `@/i18n/navigation`) because they are outside `NextIntlClientProvider`
- **Locale layout** (`src/app/[locale]/layout.tsx`): `NextIntlClientProvider` wraps children + `AgeGate` — any component using next-intl hooks (`useTranslations`, i18n `usePathname`/`useRouter`) MUST be inside this provider
- **Smart back navigation**: `BackButton` component on all detail pages (venues, blogs, posts) — uses `router.back()` for browser-history-aware navigation with configurable fallback URL

### SEO Technical Status: COMPLETE (maxed out for 2026)
All SEO best practices implemented: structured data (Article/HowTo/FAQ/BreadcrumbList/WebPage/WebSite/Organization/Person/ImageObject), sitemaps (main + image + news with hreflang), EEAT signals, multi-language translations, internal linking system, 14-check SEO score panel, auto slug 301 redirects, dynamic OG images, speakable specification, and topical authority targeting "Pattaya nightlife 2026".

### Pending / Future Work (non-SEO)
- i18n translations for rating criteria labels (currently English only)
- RedGIFs NSFW tab could be re-added if a reliable API solution is found
- Blog search with full-text search
- Blog analytics dashboard (per-article traffic, reading time, bounce rate)
- AI-assisted content translation (auto-fill translations JSON via API)
