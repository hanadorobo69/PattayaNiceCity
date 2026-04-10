"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSlug from "rehype-slug"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import Image from "next/image"
import { Link } from "@/i18n/navigation"
import type { Components } from "react-markdown"

interface MarkdownContentProps {
  content: string
}

// Transform @mentions and #hashtags before markdown parsing
function preprocessContent(raw: string): string {
  return raw
    // @mentions → markdown links: @windmill-club → [@windmill-club](/go/windmill-club)
    .replace(/@([a-zA-Z0-9_-]+)/g, (match, slug) => `[@${slug}](/go/${slug})`)
    // #hashtags → bold cyan styled spans (rendered via custom component)
    .replace(/#([a-zA-Z0-9À-ÿ_]+)/g, "**#$1**{.hashtag}")
}

const components: Components = {
  // Headings with gradient styling
  h1: ({ children, id, ...props }) => (
    <h1 id={id} className="text-2xl md:text-3xl font-bold mt-8 mb-4 scroll-mt-24" {...props}>
      <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">
        {children}
      </span>
    </h1>
  ),
  h2: ({ children, id, ...props }) => (
    <h2 id={id} className="text-xl md:text-2xl font-bold mt-8 mb-3 scroll-mt-24 text-foreground" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, id, ...props }) => (
    <h3 id={id} className="text-lg md:text-xl font-semibold mt-6 mb-2 scroll-mt-24 text-foreground/90" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, id, ...props }) => (
    <h4 id={id} className="text-base font-semibold mt-4 mb-2 scroll-mt-24 text-foreground/80" {...props}>
      {children}
    </h4>
  ),

  // Paragraphs
  p: ({ children, ...props }) => (
    <p className="text-sm md:text-base text-foreground/90 leading-relaxed mb-4" {...props}>
      {children}
    </p>
  ),

  // Links - venue @mentions or regular links
  a: ({ href, children, ...props }) => {
    if (href?.startsWith("/go/")) {
      return (
        <Link href={href} className="text-[#e07850] hover:text-[#e8a840] transition-colors font-medium" {...props}>
          {children}
        </Link>
      )
    }
    if (href?.startsWith("/")) {
      return (
        <Link href={href} className="text-[#3db8a0] hover:text-[#e8a840] transition-colors underline underline-offset-2" {...props}>
          {children}
        </Link>
      )
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#3db8a0] hover:text-[#e8a840] transition-colors underline underline-offset-2" {...props}>
        {children}
      </a>
    )
  },

  // Images with Next.js optimization
  img: ({ src, alt }) => {
    if (!src || typeof src !== "string") return null
    return (
      <span className="block my-4 rounded-xl overflow-hidden border satine-border">
        <Image
          src={src}
          alt={alt || ""}
          width={896}
          height={504}
          className="w-full h-auto object-cover"
          sizes="(max-width: 896px) 100vw, 896px"
        />
        {alt && <span className="block text-xs text-muted-foreground text-center py-2 px-4">{alt}</span>}
      </span>
    )
  },

  // Tables with dark neon styling
  table: ({ children, ...props }) => (
    <div className="my-6 overflow-x-auto rounded-xl border satine-border">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-[rgba(224,120,80,0.10)] border-b border-[rgba(224,120,80,0.20)]" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-[#e07850] uppercase tracking-wider" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-4 py-3 text-sm text-foreground/80 border-t border-border/30" {...props}>
      {children}
    </td>
  ),
  tr: ({ children, ...props }) => (
    <tr className="hover:bg-[rgba(232,168,64,0.05)] transition-colors" {...props}>
      {children}
    </tr>
  ),

  // Lists
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-outside ml-6 mb-4 space-y-1 text-sm md:text-base text-foreground/90" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-outside ml-6 mb-4 space-y-1 text-sm md:text-base text-foreground/90" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),

  // Blockquotes as callout cards
  blockquote: ({ children, ...props }) => (
    <blockquote className="my-4 border-l-4 border-[#e8a840] bg-[rgba(232,168,64,0.08)] rounded-r-xl px-5 py-4 text-sm text-foreground/85 italic" {...props}>
      {children}
    </blockquote>
  ),

  // Code blocks
  code: ({ children, className, ...props }) => {
    const isBlock = className?.includes("language-")
    if (isBlock) {
      return (
        <code className={`block bg-[rgba(26,21,16,0.8)] border border-border/30 rounded-xl p-4 text-xs md:text-sm font-mono text-[#3db8a0] overflow-x-auto my-4 ${className || ""}`} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className="bg-[rgba(224,120,80,0.15)] text-[#e07850] px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }) => (
    <pre className="my-4" {...props}>
      {children}
    </pre>
  ),

  // Horizontal rule
  hr: () => (
    <hr className="my-8 border-t border-[rgba(224,120,80,0.30)]" />
  ),

  // Strong - check for hashtag pattern
  strong: ({ children, ...props }) => {
    const text = typeof children === "string" ? children : ""
    if (text.startsWith("#")) {
      return <span className="text-[#3db8a0] font-semibold">{text}</span>
    }
    return <strong className="font-bold text-foreground" {...props}>{children}</strong>
  },
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const processed = preprocessContent(content)

  return (
    <div className="prose-pvc">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]]}
        components={components}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}
