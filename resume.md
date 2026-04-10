# PattayaNiceCity - Complete Project Resume

## Overview

**PattayaNiceCity** is a family-friendly community-driven platform for discovering attractions, services, and venues in Pattaya, Thailand. It combines a comprehensive venue directory (83 categories) with a Reddit-style community forum, offering multi-language support, user ratings, content reporting, polls, and a full admin dashboard. It targets tourists, families, digital nomads, and expats - with no adult content.

**Repository:** https://github.com/hanadorobo69/PattayaNiceCity.git
**Dev port:** 3003
**Database:** PostgreSQL via Supabase
**Deployment:** Hetzner VPS (separate from ViceCity), PM2, Nginx reverse proxy

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, SSR/ISR) | 15.5.14 |
| Language | TypeScript | ^5.7.0 |
| React | React + React DOM | 19.0.0 |
| ORM | Prisma | ^6.0.0 |
| Database | PostgreSQL (Supabase) | - |
| Auth | NextAuth (Auth.js v5 beta) | ^5.0.0-beta.30 |
| i18n | next-intl (URL-prefix routing + cookie fallback) | ^4.8.3 |
| CSS | Tailwind CSS + tailwindcss-animate | ^3.4.0 |
| UI Components | Radix UI (Avatar, Dialog, Dropdown, Label, Select, Separator, Tabs, Toast) | Various |
| Forms | react-hook-form + @hookform/resolvers + Zod | ^7.54.0 / ^3.23.0 |
| Icons | lucide-react | ^0.460.0 |
| Emoji Picker | emoji-picker-react (EmojiStyle.NATIVE) | ^4.18.0 |
| GIF Picker | GIPHY API (via /api/gifs proxy) | - |
| Email | Resend API | ^6.9.4 |
| Theming | next-themes | ^0.4.0 |
| Passwords | bcryptjs | ^2.4.3 |
| Slugs | slugify | ^1.6.6 |
| Dates | date-fns | ^3.6.0 |
| Maps | Google Maps Embed API + Google Geocoding API | - |
| Markdown | react-markdown + remark-gfm + rehype-slug + rehype-autolink-headings | ^10.1.0 |
| Markdown Editor | @uiw/react-md-editor (admin blog form) | ^4.0.11 |
| OG Images | @vercel/og (dynamic branded images) | latest |
| Testing | Vitest | ^2.1.9 |

---

## Design System

### Theme Colors

**Dark mode (default):**
- Background: #1a1510
- Foreground: #ededed
- Primary: #e8a840 (gold)
- Accent: #3db8a0 (mint)

**Light mode (nicecity-light):**
- Background: #f5f0e8
- Primary: #b8860b (dark gold)
- Accent: #2a9080 (dark mint)

**Neon contrast mode:**
- Background: #0a0a12
- Primary: #3db8a0 (cyan)
- Accent: #e8a840 (gold)

### Typography
- **Headings:** Orbitron via `font-[family-name:var(--font-orbitron)]`
- **Body:** Inter
- **Font loading:** `next/font/google` with `display: "swap"`

### Visual Style
- Gradient: Gold to Mint
- Glass morphism cards (`glass-card` class)
- Neon orb breathing animations
- CSS modules for page-specific styles
- 3 theme options: dark (default), light, neon contrast

---

## Codebase Stats

- **267 TypeScript files**
- **85+ components**
- **22+ API routes**
- **39 Prisma models** (~830 lines)
- **83 categories** across 13 groups
- **19 languages**
- **1,295 translation keys** per language

---

## Pages & Routes

All public routes live under `src/app/[locale]/`.

### Public Pages

| Route | Description |
|---|---|
| `/` | Homepage - venue listing, filters, categories, search |
| `/places/[slug]` | Venue detail - reviews, ratings, maps, gallery |
| `/community` | Community forum |
| `/post/[slug]` | Post detail with comments, votes, polls |
| `/about` | About page |
| `/legal` | Legal / Terms of Service |
| `/contact` | Contact form |
| `/members` | Member profiles |
| `/20` | Special route |

### Auth Pages

| Route | Description |
|---|---|
| `/login` | Login |
| `/register` | Registration |
| `/forgot-password` | Password recovery |
| `/reset-password` | Password reset |

### Admin Pages

| Route | Description |
|---|---|
| `/admin` | Dashboard |
| `/admin/venues` | Venue management |
| `/admin/venues/[id]/edit` | Edit venue |
| `/admin/vlogs` | Vlog management |
| `/admin/vlogs/[id]/edit` | Edit vlog |
| `/admin/users` | User management |
| `/admin/comments` | Comment moderation |
| `/admin/posts` | Post moderation |
| `/admin/analytics` | Analytics |
| `/admin/admins` | Admin management |

### Community Pages

| Route | Description |
|---|---|
| `/create` | Create post |
| `/messages` | Direct messages inbox |
| `/messages/[conversationId]` | Conversation thread |
| `/go/[slug]` | Short URL redirect |

---

## API Routes (22+)

| Endpoint | Description |
|---|---|
| `/api/auth/*` | NextAuth authentication |
| `/api/venues` | Venue CRUD |
| `/api/posts` | Post CRUD |
| `/api/comments` | Comment CRUD |
| `/api/votes` | Voting system |
| `/api/upload` | File uploads |
| `/api/og` | Dynamic OG image generation |
| `/api/gifs` | GIPHY integration proxy |
| `/api/translate` | Translation with caching |
| `/api/notifications` | User notifications |
| `/api/messages` | Direct messaging |
| `/api/places-autocomplete` | Google Places autocomplete |
| `/api/places-details` | Google Places details |
| `/api/places-photo` | Google Places photo proxy |

---

## 83 Categories (13 Groups)

### 1. Daily Life & Services (9)
ATM, Clinic, Pharmacy, Supermarket, Convenience Store, Coworking, Post Office, Laundry, Pet Services

### 2. Accommodation (6)
Hotel, Guesthouse, Hostel, Serviced Apartment, Villa Rental, Camping & Glamping

### 3. Food & Drink (10)
Thai Restaurant, Seafood, International, Vegetarian, Halal, Street Food, Cafe, Bakery, Buffet, Rooftop Restaurant

### 4. Going Out & Soft Nightlife (7)
Sunset Bar, Rooftop Bar, Live Music, Sports Bar, Family Karaoke, Night Market, Cinema

### 5. Activities & Attractions (9)
Water Park, Theme Park, Aquarium & Zoo, Museum & Gallery, Temple & Attraction, Cultural Show, Viewpoint, Farm Park, Indoor Playground

### 6. Nature & Beaches (4)
Beach, Island Trip, Park & Garden, Pier & Marina

### 7. Shopping & Markets (5)
Shopping Mall, Day Market, Shopping Night Market, Floating Market, Souvenir Shop

### 8. Wellness & Health (3)
Spa & Massage, Wellness Center, Beauty Salon

### 9. Sports & Adventure (8)
Karting, Bowling, Golf, Water Sports, Zipline & Adventure, Fitness Gym, Muay Thai Gym, Climbing & Skate

### 10. Kids & Family (4)
Kids Club, Family Activity, Edutainment, Animal Experience

### 11. Transport (7)
Bike Rental, Car Rental, Bicycle Rental, Airport Transfer, Bus Station, Boat & Ferry, Driving School

### 12. Administration & Info (5)
Immigration, Government Office, Embassy & Consulate, School & Education, Language School

### 13. Post-only (6)
General, Events, Promos & Deals, Q&A, Lost & Found, Site Admin

---

## Key Features

### Venue Directory
- Full venue listing with filters, sorting, and search
- Map view with Google Maps integration
- Category-based browsing (83 categories, 13 groups)
- Venue detail pages with reviews, ratings, gallery
- Venue favorites
- Venue media and menu media support

### Community Forum
- Reddit-style posts with comments, votes
- Poll creation and voting
- Comment media (images, GIFs, emojis)
- Content reporting
- Karma system for user reputation

### User System
- Registration, login, password recovery
- User profiles with karma
- Direct messaging (conversations)
- Notification system
- Favorite venues
- User preference persistence (language, theme)

### Admin Dashboard
- Analytics and page view tracking
- Venue CRUD with media management
- Blog/vlog management
- User management
- Comment and post moderation
- Verification request handling
- Content report handling

### Blog/Vlog System
- Blog posts with markdown editor
- Blog categories and tags
- Blog media support
- Vlog management

### Event Management
- Event creation and listing
- Event interest tracking

### SEO & Performance
- JSON-LD structured data
- Sitemap generation
- Hreflang tags for all 19 languages
- Dynamic OG image generation per page
- PWA support

### Integrations
- Google Maps (embed, geocoding, places autocomplete, places details, places photos)
- GIPHY for GIF picker
- Resend for transactional emails
- Translation API with DB caching

### Security
- Rate limiting
- Content reporting system
- Admin role management
- bcrypt password hashing

---

## Internationalization (i18n)

### 19 Supported Languages
English (en - default, no URL prefix), French (fr), Spanish (es), Chinese Simplified (zh), Korean (ko), Japanese (ja), German (de), Cantonese (yue), Thai (th), Russian (ru), Arabic (ar), Hindi (hi), Danish (da), Norwegian (no), Swedish (sv), Turkish (tr), Dutch (nl), Italian (it), Polish (pl)

### Implementation
- URL-prefix routing via next-intl (en is default with no prefix)
- 1,295 translation keys per language
- Language selector with `Intl.DisplayNames` sorting
- DB persistence of user language preference
- Translation API with database caching

---

## Prisma Schema (39 Models)

### Core
- **Profile** - User profile with karma, preferences
- **Category** - 83 venue categories
- **Venue** - Main venue entity
- **Girl** - Venue-associated entity
- **GirlComment** - Comments on Girl entities
- **GirlCommentVote** - Votes on girl comments
- **GirlRating** - Ratings for Girl entities

### Community
- **Post** - Forum posts
- **Comment** - Post comments
- **CommentVote** - Votes on comments
- **CommentMedia** - Media attached to comments
- **Vote** - Post votes
- **Favorite** - User favorites
- **Rating** - General ratings
- **Poll** - Poll attached to posts
- **PollOption** - Poll answer options
- **PollVote** - Individual poll votes

### Venue-specific
- **VenueComment** - Comments on venues
- **VenueCommentVote** - Votes on venue comments
- **VenueRating** - Venue ratings
- **VenueMedia** - Venue photos/media
- **VenueMenuMedia** - Venue menu images
- **VenueFavorite** - Venue favorites

### Blog
- **Vlog** - Blog/vlog posts
- **BlogMedia** - Blog media attachments
- **BlogTag** - Blog tags
- **BlogCategory** - Blog categories

### Events
- **Event** - Events
- **EventInterest** - Event interest tracking

### Admin & Moderation
- **VerificationRequest** - Venue verification requests
- **ContentReport** - Content reports
- **PageView** - Page view analytics
- **VenueView** - Venue view tracking

### System
- **Conversation** - DM conversations
- **ConversationParticipant** - Conversation members
- **Message** - Direct messages
- **Translation** - Cached translations
- **PasswordResetToken** - Password reset tokens
- **Notification** - User notifications
- **SlugRedirect** - Short URL redirects

---

## Deployment

- **Server:** Hetzner VPS (separate instance from ViceCity)
- **Process manager:** PM2
- **Reverse proxy:** Nginx
- **Deploy script:** `deploy/deploy.sh`
- **Dev port:** 3003

---

## Key Differences from PattayaViceCity

| Aspect | ViceCity | NiceCity |
|---|---|---|
| Content | Adult nightlife | Family-friendly attractions & services |
| Categories | 21 | 83 (13 groups) |
| Theme | Pink (#ff2d95) / Cyan (#00f5ff) / Purple (#8a2be2) | Gold (#e8a840) / Coral / Mint (#3db8a0) |
| Target audience | Nightlife tourists | Families, tourists, digital nomads, expats |
| Default background | Dark neon | Warm dark (#1a1510) |
| Languages | 19 | 19 |

---

## File Structure Overview

```
src/
  app/
    [locale]/           # All locale-prefixed routes
      admin/            # Admin dashboard pages
      places/[slug]/    # Venue detail
      post/[slug]/      # Post detail
      community/        # Forum
      messages/         # DM system
      login/register/   # Auth pages
      ...
    api/                # API routes (22+)
  components/           # 85+ React components
  lib/                  # Utilities, auth config, prisma client
  i18n/                 # Translation files (19 languages)
  styles/               # Global CSS, CSS modules
prisma/
  schema.prisma         # 39 models, ~830 lines
deploy/
  deploy.sh             # Deployment script
public/                 # Static assets
```
