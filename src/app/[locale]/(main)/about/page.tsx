import type { Metadata } from "next"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import Script from "next/script"
import { Heart, Shield, Star, Users, MessageSquare, MapPin, Compass, TrendingUp, Facebook, Twitter, Youtube, Instagram } from "lucide-react"
import { buildWebPageJsonLd } from "@/lib/jsonld"
import { getTranslations } from "next-intl/server"
import { getCurrentUserId } from "@/lib/auth/session"
import s from "./about.module.css"
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "About - Pattaya Nice City | Your Complete Pattaya Guide",
  description: "Meet the Pattaya Nice City Team - Pattaya-based expats documenting the best restaurants, beaches, temples, activities and services with real prices and honest reviews since 2024.",
  openGraph: {
    title: "About Pattaya Nice City - The Team Behind the Guide",
    description: "Pattaya-based expats and regular visitors documenting the best of Pattaya with real prices, honest reviews, and on-the-ground observations. No sponsorships, no paid reviews.",
  },
}

const features = [
  { icon: Star,          title: "communityRatings",  color: "text-[#e8a840]",  bg: "rgba(232,168,64,0.15)",  accent: "rgba(232,168,64,0.6)" },
  { icon: MapPin,        title: "completeDirectory", color: "text-[#3db8a0]",  bg: "rgba(61,184,160,0.15)",  accent: "rgba(61,184,160,0.6)"  },
  { icon: TrendingUp,    title: "liveRankings",      color: "text-[#e07850]",  bg: "rgba(224,120,80,0.15)",  accent: "rgba(224,120,80,0.6)"},
  { icon: MessageSquare, title: "realReviews",        color: "text-[#3db8a0]",  bg: "rgba(61,184,160,0.15)",  accent: "rgba(61,184,160,0.6)"  },
]

const tiers = [
  { emoji: "\ud83d\udc40", label: "lurker",  accentColor: "#e8a840", shadowColor: "rgba(232,168,64,0.25)" },
  { emoji: "\u2708\ufe0f", label: "tourist", accentColor: "#e07850", shadowColor: "rgba(224,120,80,0.25)" },
  { emoji: "\ud83d\udc51", label: "local",   accentColor: "#3db8a0", shadowColor: "rgba(61,184,160,0.25)" },
  { emoji: "\ud83d\udd25", label: "og",      accentColor: "#6366f1", shadowColor: "rgba(99,102,241,0.25)" },
  { emoji: "\ud83c\udf34", label: "legend",  accentColor: "#e8a840", shadowColor: "rgba(232,168,64,0.25)"  },
]

const tierRanges: Record<string, string> = {
  lurker: "0 pts", tourist: "10+ pts", local: "150+ pts", og: "400+ pts", legend: "1000+ pts",
}

export default async function AboutPage() {
  const t  = await getTranslations("about")
  const tk = await getTranslations("karma")
  await getCurrentUserId()

  const boldTag = (chunks: React.ReactNode) => <strong className="text-primary font-semibold">{chunks}</strong>
  const rules = [t("rule1"), t("rule2"), t("rule3")]

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com"

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Pattaya Nice City",
    alternateName: "Pattaya Nice City Team",
    url: siteUrl,
    logo: { "@type": "ImageObject", url: `${siteUrl}/logo_hot.jpg`, width: 512, height: 512 },
    description: "Community-driven guide to Pattaya. Real reviews, real prices, by expats and regular visitors since 2024.",
    foundingDate: "2024",
    foundingLocation: { "@type": "Place", name: "Pattaya, Thailand", address: { "@type": "PostalAddress", addressLocality: "Pattaya", addressCountry: "TH" } },
    areaServed: { "@type": "City", name: "Pattaya", containedInPlace: { "@type": "Country", name: "Thailand" } },
    sameAs: [
      "https://www.youtube.com/@pattayanicecity",
    ],
    knowsAbout: [
      "Pattaya guide", "Pattaya restaurants", "Pattaya beaches", "Pattaya activities", "Pattaya family",
      "Pattaya temples", "Pattaya markets", "Thailand tourism", "Pattaya expat guide", "Pattaya digital nomad",
    ],
  }

  const authorJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Pattaya Nice City Team",
    url: `${siteUrl}/about`,
    jobTitle: "City Guide & Community Reporter",
    worksFor: { "@type": "Organization", name: "Pattaya Nice City", url: siteUrl },
    knowsAbout: ["Pattaya guide", "Thailand tourism", "Pattaya restaurants", "Pattaya beaches", "Pattaya activities"],
    description: "Pattaya-based expats and regular visitors documenting the city with first-hand observations, real prices, and honest reviews since 2024.",
  }

  const webPageJsonLd = buildWebPageJsonLd({
    title: "About - Pattaya Nice City | Your Complete Pattaya Guide",
    description: "Meet the Pattaya Nice City Team - Pattaya-based expats documenting the best restaurants, beaches, temples, activities and services with real prices and honest reviews.",
    url: `${siteUrl}/about`,
    siteUrl,
    type: "AboutPage",
  })

  return (
    <>
    <Script id="org-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
    <Script id="author-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(authorJsonLd) }} />
    <Script id="webpage-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    <div className={s.pageWrap}>

      {/* ══ HERO ══ */}
      <section className={s.hero}>
        <img
          src="/assets/about/background+logo.png"
          alt="Pattaya Nice City skyline"
          className={s.heroSkyline}
          width={1400}
          height={640}
        />
        <img
          src="/assets/white_theme/background+lady_white.png"
          alt="Pattaya Nice City skyline day"
          className={s.heroSkylineLight}
          width={1400}
          height={640}
        />
        <div className={s.heroFade} />
        <div className={s.heroContent}>
          <div className={s.heroEyebrow}>
            <span className={s.heroLine} />
            <span className={s.heroEyebrowText}>Your Complete Pattaya Guide</span>
          </div>
          <img
            src="/assets/about/logo_reflect.png"
            alt="Pattaya Nice City"
            className={s.heroTextImg}
            width={520}
            height={200}
          />
          <p className={s.heroTagline}>
            {t("heroSubtitle").split("Built").map((part, i) =>
              i === 0 ? part : <span key={i}><br />Built{part}</span>
            )}
          </p>
        </div>
      </section>

      {/* ══ SELLING POINTS ══ */}
      <section className={s.pitchWrap}>
        <div className={s.pitchGrid}>

          <div className={s.pitchCard} style={{ "--pc-accent": "#ff4757" } as React.CSSProperties}>
            <span className={s.pitchIcon}>{"\ud83d\udea9"}</span>
            <h3 className={s.pitchHeadline}>Discover Pattaya</h3>
            <p className={s.pitchSub}>Restaurants, beaches, temples, activities - all in one place.</p>
          </div>

          <div className={s.pitchCard} style={{ "--pc-accent": "#e8a840" } as React.CSSProperties}>
            <span className={s.pitchIcon}>{"\ud83c\udf1f"}</span>
            <h3 className={s.pitchHeadline}>Best Food & Drink</h3>
            <p className={s.pitchSub}>Real prices shared by real people. No surprises.</p>
          </div>

          <div className={s.pitchCard} style={{ "--pc-accent": "#3db8a0" } as React.CSSProperties}>
            <span className={s.pitchIcon}>{"\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d\udc66"}</span>
            <h3 className={s.pitchHeadline}>Family Friendly</h3>
            <p className={s.pitchSub}>Kid-friendly spots, family activities, safe areas.</p>
          </div>

        </div>
      </section>

      {/* ══ OUR STORY ══ */}
      <section className={s.bottomSection}>
        <h2 className={`${s.bottomTitle} neon-text-pink`}>{t("ourStory")}</h2>
        <div className={s.bottomCard}>
          <div className={s.storyBody}>
            <p>{t.rich("storyP1", { b: boldTag })}</p>
            <p>{t.rich("storyP3", { b: boldTag })}</p>
          </div>
        </div>
      </section>

      {/* ══ FIND THE BEST SPOTS ══ */}
      <section className={s.featuresWrap}>
        <h2 className={`${s.bottomTitle} neon-text-cyan`}>
          {t("findBestSpots")}
        </h2>
        <div className={s.featureGrid}>
          {features.map(({ icon: Icon, title, color, bg, accent }) => (
            <div
              key={title}
              className={s.featureCard}
              style={{ "--fc-accent": accent } as React.CSSProperties}
            >
              <div className={s.featureIconWrap} style={{ background: bg }}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className={s.featureTitle}>{t(title as Parameters<typeof t>[0])}</p>
            </div>
          ))}
        </div>

      {/* ══ REPUTATION + COMMUNITY SPIRIT ══ */}
      <section className={s.reputationWrap}>

        <div>
          <h2 className={`${s.bottomTitle} neon-text-pink`}>{t("reputationTiers")}</h2>
          <div className={s.bottomCard}>
            <div className={s.tiersStrip}>
              {tiers.map(({ emoji, label, accentColor, shadowColor }) => (
                <div
                  key={label}
                  className={s.tierCard}
                  style={{
                    borderTopColor: accentColor,
                    boxShadow: `0 4px 22px ${shadowColor}`,
                    "--tier-color": accentColor,
                    "--tier-shadow": shadowColor,
                  } as React.CSSProperties}
                >
                  <span className={s.tierEmoji} style={{ color: accentColor }}>{emoji}</span>
                  <span className={s.tierLabel}>{tk(label as Parameters<typeof tk>[0])}</span>
                  <span className={s.tierKarma} style={{ color: accentColor }}>{tierRanges[label]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h2 className={`${s.bottomTitle} neon-text-cyan`}>{t("communitySpirit")}</h2>
          <div className={s.ruleCard}>
            <ul className={s.ruleList}>
              {rules.map((rule, i) => (
                <li key={i} className={s.ruleItem}>
                  <span className={s.ruleNum}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={s.ruleText}>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* What We Cover */}
      <section className={s.bottomSection}>
        <h2 className={`${s.bottomTitle} neon-text-pink`}>What We Cover</h2>
        <div className={s.bottomHighlightGrid}>
          <div className={s.highlightItem}>
            <span className={s.highlightEmoji}>{"\ud83d\udccd"}</span>
            <span className={s.highlightLabel}>Hundreds of Spots</span>
            <span className={s.highlightDesc}>Restaurants, cafes, beaches, temples, activities</span>
          </div>
          <div className={s.highlightItem}>
            <span className={s.highlightEmoji}>{"\ud83d\udcb0"}</span>
            <span className={s.highlightLabel}>Real Prices</span>
            <span className={s.highlightDesc}>Food, activities, services - no surprises</span>
          </div>
          <div className={s.highlightItem}>
            <span className={s.highlightEmoji}>{"\ud83d\uddfa\ufe0f"}</span>
            <span className={s.highlightLabel}>Every Area</span>
            <span className={s.highlightDesc}>Pattaya, Pratamnak, Jomtien & more</span>
          </div>
          <div className={s.highlightItem}>
            <span className={s.highlightEmoji}>{"\ud83c\udf0d"}</span>
            <span className={s.highlightLabel}>Multilingual</span>
            <span className={s.highlightFlags}>
              {["gb","fr","th","ru","cn","jp","de","kr","es","sa"].map(cc => (
                <img key={cc} src={`/flags/${cc}.png`} alt={cc} width={22} height={16} className={s.flagImg} />
              ))}
            </span>
          </div>
        </div>
      </section>

      {/* Our Vision */}
      <section className={s.bottomSection}>
        <h2 className={`${s.bottomTitle} neon-text-cyan`}>Our Vision</h2>
        <div className={s.bottomCard}>
          <p className={s.bottomText}>
            Good vibes, mutual help, and a <strong>global community</strong> that shares real experiences. No paid reviews, no sponsorships - just people who actually live and explore Pattaya.
          </p>
          <p className={s.bottomText}>
            We want Pattaya Nice City to be <strong>THE reference guide</strong> for everyone visiting or living in Pattaya - constantly evolving, always honest, and built by the community. Got a tip? A correction? <strong>We&apos;re always reachable.</strong>
          </p>
          <div className={s.ctaRow}>
            <Link href="/contact" className={`${s.ctaBtn} ${s.ctaPink}`}>Contact Us</Link>
            <Link href="/places" className={`${s.ctaBtn} ${s.ctaCyan}`}>Explore Spots</Link>
          </div>
        </div>
      </section>

      {/* Follow Us + Links */}
      <section className={s.bottomSection}>
        <h2 className={`${s.bottomTitle} neon-text-pink`}>Follow Us</h2>
        <div className={s.socialCard}>
          <div className={s.socialRow}>
            <a href="#" className={s.socialIcon} aria-label="Facebook"><Facebook /></a>
            <a href="#" className={s.socialIcon} aria-label="Twitter"><Twitter /></a>
            <a href="#" className={s.socialIcon} aria-label="YouTube"><Youtube /></a>
            <a href="#" className={s.socialIcon} aria-label="Instagram"><Instagram /></a>
          </div>
        </div>
      </section>

      </section>

    </div>
    </>
  )
}
