"use client"

import { Link } from "@/i18n/navigation"

interface MentionTextProps {
  content: string
  /** Where hashtag clicks navigate: "spots" → /?q=keyword, "community" → /community?q=keyword */
  hashtagContext?: "spots" | "community"
}

// Check if URL is a video (mp4) or image (gif/jpg/webp)
function isVideoUrl(url: string) {
  return url.includes(".mp4") || url.includes(".webm")
}

// Parse rich formatting: **bold**, *italic*, __underline__, ~~strikethrough~~, [c=#hex]color[/c]
// Supports nesting (e.g. ***bold+italic***, __**underline+bold**__)
function parseFormatting(text: string, keyPrefix: string): React.ReactNode[] {
  const regex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\n]+\*|__[^_]+__|~~[^~]+~~|\[c=#[a-fA-F0-9]{3,6}\][^\[]*\[\/c\])/g
  const parts = text.split(regex)
  return parts.map((part, i) => {
    const key = `${keyPrefix}-f${i}`
    // Bold+Italic (*** must come before ** and *)
    if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
      return <strong key={key} className="font-bold"><em>{parseFormatting(part.slice(3, -3), key)}</em></strong>
    }
    if (part.startsWith("**") && part.endsWith("**") && !part.startsWith("***") && part.length > 4) {
      return <strong key={key} className="font-bold">{parseFormatting(part.slice(2, -2), key)}</strong>
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**") && part.length > 2) {
      return <em key={key}>{parseFormatting(part.slice(1, -1), key)}</em>
    }
    if (part.startsWith("__") && part.endsWith("__") && part.length > 4) {
      return <span key={key} className="underline">{parseFormatting(part.slice(2, -2), key)}</span>
    }
    if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
      return <span key={key} className="line-through">{parseFormatting(part.slice(2, -2), key)}</span>
    }
    const colorMatch = part.match(/^\[c=(#[a-fA-F0-9]{3,6})\]([\s\S]*)\[\/c\]$/)
    if (colorMatch) {
      return <span key={key} style={{ color: colorMatch[1] }}>{parseFormatting(colorMatch[2], key)}</span>
    }
    return part
  })
}

// Render plain text with auto-linked URLs
function renderWithLinks(text: string, keyPrefix: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s<]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      // Check if it's an internal link
      const isInternal = part.includes("pattayanicecity.com")
      const href = isInternal ? part.replace(/https?:\/\/(www\.)?pattayanicecity\.com/, "") || "/" : part
      if (isInternal) {
        return (
          <Link key={`${keyPrefix}-l${i}`} href={href} className="font-semibold hover:underline" style={{ color: "#3db8a0" }} onClick={(e) => e.stopPropagation()}>
            {part}
          </Link>
        )
      }
      return (
        <a key={`${keyPrefix}-l${i}`} href={part} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: "#3db8a0" }} onClick={(e) => e.stopPropagation()}>
          {part}
        </a>
      )
    }
    return <span key={`${keyPrefix}-l${i}`}>{parseFormatting(part, `${keyPrefix}-l${i}`)}</span>
  })
}

// Parse @slug mentions, #hashtags, [c=#hex]color[/c], [link](url), and [gif](url) embeds
export function MentionText({ content, hashtagContext }: MentionTextProps) {
  // Split on color tags FIRST (before #hashtag grabs #hex inside [c=#hex]),
  // then !user mentions, @venue mentions, #hashtags, and [text](url) links
  const parts = content.split(/(\[c=#[a-fA-F0-9]{3,6}\][^\[]*\[\/c\]|![a-zA-Z0-9_-]+|@[a-z0-9-]+|#[a-zA-Z0-9_\u00C0-\u024F]+|\[[^\]]+\]\([^)]+\))/g)

  return (
    <>
      {parts.map((part, i) => {
        // [c=#hex]text[/c] - color tag (matched before #hashtag to prevent #hex collision)
        const colorMatch = part.match(/^\[c=(#[a-fA-F0-9]{3,6})\]([\s\S]*)\[\/c\]$/)
        if (colorMatch) {
          return <span key={i} style={{ color: colorMatch[1] }}>{renderWithLinks(colorMatch[2], String(i))}</span>
        }
        // !user mention - links to profile
        if (part.startsWith("!") && /^![a-zA-Z0-9_-]+$/.test(part)) {
          const username = part.slice(1)
          return (
            <Link
              key={i}
              href={`/profile/${username}`}
              className="font-semibold hover:underline"
              style={{ color: "#e8a840" }}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          )
        }
        // @venue mention
        if (part.startsWith("@")) {
          const slug = part.slice(1)
          return (
            <Link
              key={i}
              href={`/go/${slug}`}
              className="font-semibold hover:underline"
              style={{ color: "#C084FC" }}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          )
        }
        // #hashtag - clickable: navigates to spots or community search
        if (part.startsWith("#")) {
          const keyword = part.slice(1)
          const href = hashtagContext === "spots"
            ? `/?q=${encodeURIComponent(keyword)}`
            : `/community?q=${encodeURIComponent(keyword)}`
          return (
            <Link
              key={i}
              href={href}
              className="font-semibold hover:underline cursor-pointer"
              style={{ color: "#3db8a0" }}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          )
        }
        // [text](url) - markdown link or gif embed
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (linkMatch) {
          const [, text, url] = linkMatch
          // [gif](url) - inline GIF embed
          if (text === "gif") {
            return (
              <span key={i} className="block my-2">
                {isVideoUrl(url) ? (
                  <video
                    src={url}
                    muted
                    autoPlay
                    loop
                    playsInline
                    className="rounded-lg max-w-xs max-h-[280px] object-contain"
                    {...{ referrerPolicy: "no-referrer" } as any}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={url}
                    alt="GIF"
                    className="rounded-lg max-w-xs max-h-[280px] object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
              </span>
            )
          }
          // Regular markdown link [text](url)
          const isInternal = url.startsWith("/") || url.includes("pattayanicecity.com")
          const href = url.includes("pattayanicecity.com") ? url.replace(/https?:\/\/(www\.)?pattayanicecity\.com/, "") || "/" : url
          if (isInternal) {
            return (
              <Link key={i} href={href} className="font-semibold hover:underline" style={{ color: "#3db8a0" }} onClick={(e) => e.stopPropagation()}>
                {text}
              </Link>
            )
          }
          return (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: "#3db8a0" }} onClick={(e) => e.stopPropagation()}>
              {text}
            </a>
          )
        }
        // Plain text - apply rich formatting + auto-link URLs
        return <span key={i}>{renderWithLinks(part, String(i))}</span>
      })}
    </>
  )
}
