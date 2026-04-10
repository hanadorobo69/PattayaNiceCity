"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { EmojiPickerButton } from "./emoji-picker-button"
import { GifPicker } from "./gif-picker"
import { X, Bold, Italic, Underline, Strikethrough, Palette } from "lucide-react"

interface VenueSuggestion {
  slug: string
  name: string
  type?: "venue" | "girl"
  category: { name: string; slug: string; icon?: string | null }
}

interface UserSuggestion {
  username: string
  displayName: string | null
  avatarUrl: string | null
  isAdmin: boolean
}

interface MentionInputProps {
  name: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  required?: boolean
  showGifPicker?: boolean
}

/* ── Markdown → HTML (for display in contentEditable) ── */
function mdToHtml(md: string): string {
  if (!md) return ""
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<i>$1</i>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/\[c=(#[a-fA-F0-9]{3,6})\]([\s\S]*?)\[\/c\]/g, '<span data-color="$1" style="color:$1">$2</span>')
    .replace(/!([a-zA-Z0-9_-]+)/g, '<span data-usermention="$1" contenteditable="false" class="usermention-tag">!$1</span>')
    .replace(/@([a-z0-9-]+)/g, '<span data-mention="$1" contenteditable="false" class="mention-tag">@$1</span>')
    .replace(/#([a-zA-Z0-9_\u00C0-\u024F]+)/g, '<span data-hashtag="$1" contenteditable="false" class="hashtag-tag">#$1</span>')
    .replace(/\n/g, "<br>")
}

/* ── HTML → Markdown (flat segment approach - no nested tags) ── */
interface Seg { text: string; b: boolean; i: boolean; u: boolean; s: boolean; color: string | null; raw?: boolean }

function walkDom(node: Node, b: boolean, i: boolean, u: boolean, s: boolean, color: string | null, out: Seg[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = (node.textContent || "").replace(/\u200B/g, "")
    if (t) out.push({ text: t, b, i, u, s, color })
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return
  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()

  // Special: user mentions, venue mentions & hashtags - output as raw text, no formatting
  if (tag === "span" && el.getAttribute("data-usermention")) {
    out.push({ text: `!${el.getAttribute("data-usermention")}`, b: false, i: false, u: false, s: false, color: null, raw: true })
    const txt = el.textContent || ""
    if (txt.endsWith(" ")) out.push({ text: " ", b: false, i: false, u: false, s: false, color: null, raw: true })
    return
  }
  if (tag === "span" && el.getAttribute("data-mention")) {
    out.push({ text: `@${el.getAttribute("data-mention")}`, b: false, i: false, u: false, s: false, color: null, raw: true })
    // Include trailing space if present
    const txt = el.textContent || ""
    if (txt.endsWith(" ")) out.push({ text: " ", b: false, i: false, u: false, s: false, color: null, raw: true })
    return
  }
  if (tag === "span" && el.getAttribute("data-hashtag")) {
    out.push({ text: `#${el.getAttribute("data-hashtag")}`, b: false, i: false, u: false, s: false, color: null, raw: true })
    return
  }

  // Line breaks
  if (tag === "br") {
    // Skip trailing <br> inside a <div> that has other content (Chrome adds these for cursor positioning)
    const parent = el.parentElement
    if (parent && (parent.tagName === "DIV" || parent.tagName === "P") && el === parent.lastChild && el.previousSibling) {
      return
    }
    out.push({ text: "\n", b: false, i: false, u: false, s: false, color: null, raw: true })
    return
  }
  if ((tag === "div" || tag === "p") && el.previousSibling && out.length > 0 && out[out.length - 1]?.text !== "\n") {
    out.push({ text: "\n", b: false, i: false, u: false, s: false, color: null, raw: true })
  }

  // Inherit formatting from this element
  let nb = b, ni = i, nu = u, ns = s, nc = color
  if (tag === "b" || tag === "strong") nb = true
  if (tag === "i" || tag === "em") ni = true
  if (tag === "u") nu = true
  if (tag === "s" || tag === "strike" || tag === "del") ns = true

  // Color: inner overrides outer (last one wins)
  const dc = el.getAttribute("data-color")
  if (dc) nc = dc
  else if (tag === "font" && el.getAttribute("color")) nc = el.getAttribute("color")
  else {
    const style = el.getAttribute("style") || ""
    const hm = style.match(/color:\s*(#[a-fA-F0-9]{3,6})/)
    if (hm) nc = hm[1]
    else {
      const rm = style.match(/color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (rm) nc = "#" + [rm[1], rm[2], rm[3]].map(n => parseInt(n).toString(16).padStart(2, "0")).join("")
    }
  }

  for (const child of Array.from(el.childNodes)) walkDom(child, nb, ni, nu, ns, nc, out)
}

function htmlToMd(root: HTMLElement): string {
  const segs: Seg[] = []
  walkDom(root, false, false, false, false, null, segs)

  // Merge adjacent segments with identical formatting
  const merged: Seg[] = []
  for (const seg of segs) {
    const last = merged[merged.length - 1]
    if (last && !last.raw && !seg.raw && last.b === seg.b && last.i === seg.i && last.u === seg.u && last.s === seg.s && last.color === seg.color && !last.text.includes("\n") && !seg.text.includes("\n")) {
      last.text += seg.text
    } else {
      merged.push({ ...seg })
    }
  }

  // Convert each segment to markdown (flat, never nested formatting tags)
  let md = ""
  for (const seg of merged) {
    if (!seg.text) continue
    if (seg.raw) { md += seg.text; continue }
    let t = seg.text
    if (seg.b) t = `**${t}**`
    if (seg.i) t = `*${t}*`
    if (seg.u) t = `__${t}__`
    if (seg.s) t = `~~${t}~~`
    if (seg.color) t = `[c=${seg.color}]${t}[/c]`
    md += t
  }

  return md.replace(/^\n/, "")
}

/* ── Component ── */
export function MentionInput({ name, value, onChange, placeholder, rows = 4, className, required, showGifPicker = false }: MentionInputProps) {
  const t = useTranslations("ui")
  const tcat = useTranslations("categoryNames")
  const editorRef = useRef<HTMLDivElement>(null)
  const lastMdRef = useRef("")
  const isInternalChange = useRef(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([])
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionType, setMentionType] = useState<"venue" | "user">("venue")
  const [mentionStart, setMentionStart] = useState(-1)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [gifPickerOpen, setGifPickerOpen] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  // GIF extraction
  const gifMatch = value.match(/\[gif\]\(([^)]+)\)/)
  const gifUrl = gifMatch ? gifMatch[1] : null
  const gifIsVideo = gifUrl ? (gifUrl.includes(".mp4") || gifUrl.includes(".webm")) : false
  const textOnly = gifMatch ? value.slice(0, value.indexOf(gifMatch[0])).replace(/\n$/, "") : value

  // Compose text + gif for storage
  const composeRef = useRef(gifUrl)
  composeRef.current = gifUrl
  function compose(text: string, gif?: string | null): string {
    const g = gif !== undefined ? gif : composeRef.current
    if (!g) return text
    return text ? `${text}\n[gif](${g})` : `[gif](${g})`
  }

  // Sync: set editor HTML from markdown (only on external changes)
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    // Always allow clearing (form reset) even if last change was internal
    if (!textOnly && lastMdRef.current) {
      el.innerHTML = ""
      lastMdRef.current = ""
      setIsEmpty(true)
      isInternalChange.current = false
      return
    }
    if (isInternalChange.current) {
      isInternalChange.current = false
      return
    }
    if (textOnly !== lastMdRef.current) {
      el.innerHTML = mdToHtml(textOnly)
      lastMdRef.current = textOnly
      setIsEmpty(!textOnly)
    }
  }, [textOnly])

  // Set initial content
  useEffect(() => {
    const el = editorRef.current
    if (el && textOnly) {
      el.innerHTML = mdToHtml(textOnly)
      lastMdRef.current = textOnly
      setIsEmpty(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restore cursor in editor by character offset
  function restoreCursor(el: HTMLElement, offset: number) {
    const sel = window.getSelection()
    if (!sel) return
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let pos = 0
    while (walker.nextNode()) {
      const node = walker.currentNode as Text
      const len = (node.textContent || "").length
      if (pos + len >= offset) {
        try {
          const range = document.createRange()
          range.setStart(node, Math.min(offset - pos, len))
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
        } catch {}
        return
      }
      pos += len
    }
    sel.selectAllChildren(el)
    sel.collapseToEnd()
  }

  // Detect hashtags in plain text nodes and wrap them as styled spans
  function highlightHashtags(el: HTMLElement) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const found: { node: Text }[] = []
    while (walker.nextNode()) {
      const node = walker.currentNode as Text
      if (node.parentElement?.closest("[data-hashtag]")) continue
      if (/#[a-zA-Z0-9_\u00C0-\u024F]+(?=[\s.,;:!?\u00A0]|$)/.test(node.textContent || "")) {
        found.push({ node })
      }
    }
    if (found.length === 0) return false

    // Save cursor offset
    const sel = window.getSelection()
    let cursorOffset = 0
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      const pre = document.createRange()
      pre.selectNodeContents(el)
      pre.setEnd(range.startContainer, range.startOffset)
      cursorOffset = pre.toString().length
    }

    // Re-render from markdown (roundtrip) to wrap hashtags
    const md = htmlToMd(el)
    el.innerHTML = mdToHtml(md)
    restoreCursor(el, cursorOffset)
    return true
  }

  // On user input: convert HTML → markdown and call onChange
  const handleInput = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const md = htmlToMd(el)
    lastMdRef.current = md
    isInternalChange.current = true
    setIsEmpty(!el.textContent?.trim())

    const g = composeRef.current
    const finalValue = g ? (md ? `${md}\n[gif](${g})` : `[gif](${g})`) : md
    onChange(finalValue)

    // Auto-highlight hashtags in the editor
    highlightHashtags(el)

    // !user or @venue mention detection
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      const pre = document.createRange()
      pre.selectNodeContents(el)
      pre.setEnd(range.startContainer, range.startOffset)
      const textBefore = pre.toString()
      // Check for !user first, then @venue
      const userMatch = textBefore.match(/!([a-zA-Z0-9_-]*)$/i)
      const venueMatch = !userMatch ? textBefore.match(/@([a-z0-9\s]*)$/i) : null
      if (userMatch) {
        setMentionType("user")
        setMentionQuery(userMatch[1].toLowerCase())
        setMentionStart(textBefore.length - userMatch[0].length)
        setSelectedIdx(0)
      } else if (venueMatch) {
        setMentionType("venue")
        setMentionQuery(venueMatch[1].toLowerCase().replace(/\s/g, "-"))
        setMentionStart(textBefore.length - venueMatch[0].length)
        setSelectedIdx(0)
      } else {
        setMentionQuery(null)
        setSuggestions([])
        setUserSuggestions([])
      }
    }
  }, [onChange])

  // Fetch mention suggestions (venues or users)
  useEffect(() => {
    if (mentionQuery === null) return
    const timer = setTimeout(async () => {
      if (mentionQuery.length < 1) { setSuggestions([]); setUserSuggestions([]); return }
      setLoading(true)
      try {
        if (mentionType === "user") {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(mentionQuery)}`)
          const data = await res.json()
          setUserSuggestions(data.users ?? [])
          setSuggestions([])
        } else {
          const res = await fetch(`/api/venues/search?q=${encodeURIComponent(mentionQuery)}`)
          const data = await res.json()
          setSuggestions(data.venues ?? [])
          setUserSuggestions([])
        }
      } catch { setSuggestions([]); setUserSuggestions([]) }
      finally { setLoading(false) }
    }, 200)
    return () => clearTimeout(timer)
  }, [mentionQuery, mentionType])

  function pickVenueSuggestion(venue: VenueSuggestion) {
    const el = editorRef.current
    if (!el) return
    const full = el.textContent || ""
    const before = full.slice(0, mentionStart)
    const searchEnd = full.indexOf(" ", mentionStart + 1)
    const after = searchEnd >= 0 ? full.slice(searchEnd) : ""
    const mention = `@${venue.slug} `
    const newMd = before + mention + after
    el.innerHTML = mdToHtml(newMd)
    lastMdRef.current = newMd
    isInternalChange.current = true
    onChange(compose(newMd))
    setIsEmpty(false)
    setMentionQuery(null)
    setSuggestions([])
    setTimeout(() => { el.focus(); const s = window.getSelection(); if (s) { s.selectAllChildren(el); s.collapseToEnd() } }, 0)
  }

  function pickUserSuggestion(user: UserSuggestion) {
    const el = editorRef.current
    if (!el) return
    const full = el.textContent || ""
    const before = full.slice(0, mentionStart)
    const searchEnd = full.indexOf(" ", mentionStart + 1)
    const after = searchEnd >= 0 ? full.slice(searchEnd) : ""
    const mention = `!${user.username} `
    const newMd = before + mention + after
    el.innerHTML = mdToHtml(newMd)
    lastMdRef.current = newMd
    isInternalChange.current = true
    onChange(compose(newMd))
    setIsEmpty(false)
    setMentionQuery(null)
    setUserSuggestions([])
    setTimeout(() => { el.focus(); const s = window.getSelection(); if (s) { s.selectAllChildren(el); s.collapseToEnd() } }, 0)
  }

  const activeSuggestions = mentionType === "user" ? userSuggestions : suggestions
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (activeSuggestions.length === 0) return
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, activeSuggestions.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      if (mentionType === "user" && userSuggestions[selectedIdx]) pickUserSuggestion(userSuggestions[selectedIdx])
      else if (suggestions[selectedIdx]) pickVenueSuggestion(suggestions[selectedIdx])
    }
    else if (e.key === "Escape") { setMentionQuery(null); setSuggestions([]); setUserSuggestions([]) }
  }

  // Insert emoji at cursor
  function insertEmoji(emoji: string) {
    const el = editorRef.current
    if (!el) return
    el.focus()
    document.execCommand("insertText", false, emoji)
  }

  // GIF
  function insertGif(url: string) {
    isInternalChange.current = true
    onChange(compose(textOnly, url))
    setGifPickerOpen(false)
    setTimeout(() => editorRef.current?.focus(), 0)
  }
  function removeGif() {
    isInternalChange.current = true
    onChange(textOnly)
    setTimeout(() => editorRef.current?.focus(), 0)
  }

  // Formatting via execCommand (true WYSIWYG)
  function applyFormat(cmd: string) {
    const el = editorRef.current
    if (!el) return
    el.focus()
    document.execCommand(cmd, false)
    setTimeout(() => handleInput(), 0)
  }

  function applyColor(hex: string) {
    const el = editorRef.current
    if (!el) return
    el.focus()

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return

    if (!sel.isCollapsed) {
      // Has selection - use execCommand then normalize font→span
      document.execCommand("foreColor", false, hex)
      el.querySelectorAll("font[color]").forEach(font => {
        const span = document.createElement("span")
        span.setAttribute("data-color", hex)
        span.style.color = hex
        span.innerHTML = font.innerHTML
        font.replaceWith(span)
      })
    } else {
      // No selection - insert colored zero-width space so future typing is colored
      const span = document.createElement("span")
      span.setAttribute("data-color", hex)
      span.style.color = hex
      span.textContent = "\u200B"
      const range = sel.getRangeAt(0)
      range.insertNode(span)
      // Place cursor inside the span after the zero-width space
      range.setStart(span.childNodes[0], 1)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }

    setTimeout(() => handleInput(), 0)
    setColorPickerOpen(false)
  }

  // Strip external formatting on paste
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    document.execCommand("insertText", false, text)
  }

  // Close color picker on outside click
  useEffect(() => {
    if (!colorPickerOpen) return
    function h(e: MouseEvent) { if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) setColorPickerOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [colorPickerOpen])

  const COLORS = [
    { hex: "#e8a840", label: "Pink" },
    { hex: "#3db8a0", label: "Cyan" },
    { hex: "#e07850", label: "Purple" },
    { hex: "#FFD700", label: "Gold" },
    { hex: "#FF6B35", label: "Orange" },
    { hex: "#00FF88", label: "Green" },
    { hex: "#FF4444", label: "Red" },
    { hex: "#FFFFFF", label: "White" },
  ]

  return (
    <div className="space-y-3">
      {/* Main composition area */}
      <div className="relative rounded-md" style={{ background: "rgba(80, 20, 45, 0.35)" }}>
        {/* Placeholder overlay */}
        {isEmpty && placeholder && (
          <div className="absolute inset-0 px-3 py-2 text-sm text-muted-foreground pointer-events-none select-none">
            {placeholder}
          </div>
        )}

        {/* ContentEditable rich text editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={cn(
            "min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "whitespace-pre-wrap [overflow-wrap:break-word]",
            gifUrl ? "rounded-b-none border-b-0" : "",
            className
          )}
          style={{ minHeight: rows * 24, outline: "none" }}
        />

        {/* Embedded GIF preview */}
        {gifUrl && (
          <div className="border border-input border-t-0 rounded-b-md px-3 py-2 bg-transparent">
            <div className="relative group inline-block rounded-lg overflow-hidden">
              {gifIsVideo ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={gifUrl} muted autoPlay loop playsInline className="max-h-[200px] max-w-full rounded-lg object-contain" {...{ referrerPolicy: "no-referrer" } as any} />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={gifUrl} alt="GIF" className="max-h-[200px] max-w-full rounded-lg object-contain" referrerPolicy="no-referrer" />
              )}
              <button type="button" onClick={removeGif} className="absolute top-1 left-1 bg-black/70 hover:bg-black/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Venue autocomplete dropdown */}
        {mentionType === "venue" && suggestions.length > 0 && (
          <div className="absolute z-50 left-0 mt-1 w-72 rounded-xl border satine-border bg-card shadow-xl shadow-black/30 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-[rgba(232,168,64,0.20)]">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t("venuesAndGirls")}</p>
            </div>
            {suggestions.map((v, i) => (
              <button
                key={v.slug}
                type="button"
                onClick={() => pickVenueSuggestion(v)}
                className={cn(
                  "w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors",
                  i === selectedIdx ? "bg-[rgba(232,168,64,0.10)] text-primary" : "hover:bg-muted text-foreground"
                )}
              >
                <span className="text-base shrink-0">{v.category.icon ?? "📍"}</span>
                <span className="font-medium">{v.name}</span>
                <span className={cn("text-xs ml-auto shrink-0 px-1.5 py-0.5 rounded-full", v.type === "girl" ? "bg-rose-400/10 text-rose-400" : "text-muted-foreground")}>
                  {v.type === "girl" ? `💃 ${t("girl")}` : (tcat.has(v.category.slug) ? tcat(v.category.slug) : v.category.name)}
                </span>
              </button>
            ))}
            {loading && <div className="px-3 py-2 text-xs text-muted-foreground">{t("searching")}</div>}
          </div>
        )}

        {/* User autocomplete dropdown */}
        {mentionType === "user" && userSuggestions.length > 0 && (
          <div className="absolute z-50 left-0 mt-1 w-72 rounded-xl border satine-border bg-card shadow-xl shadow-black/30 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-[rgba(232,168,64,0.20)]">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Users</p>
            </div>
            {userSuggestions.map((u, i) => (
              <button
                key={u.username}
                type="button"
                onClick={() => pickUserSuggestion(u)}
                className={cn(
                  "w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors",
                  i === selectedIdx ? "bg-[rgba(232,168,64,0.10)] text-primary" : "hover:bg-muted text-foreground"
                )}
              >
                {u.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={u.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="h-6 w-6 rounded-full bg-[rgba(232,168,64,0.15)] flex items-center justify-center text-xs shrink-0">👤</span>
                )}
                <span className="font-medium">{u.displayName || u.username}</span>
                <span className="text-xs text-muted-foreground ml-auto">@{u.username}</span>
              </button>
            ))}
            {loading && <div className="px-3 py-2 text-xs text-muted-foreground">{t("searching")}</div>}
          </div>
        )}

        {mentionQuery !== null && activeSuggestions.length === 0 && !loading && mentionQuery.length >= 2 && (
          <div className="absolute z-50 left-0 mt-1 w-64 rounded-xl border satine-border bg-card p-3 shadow-xl shadow-black/30">
            <p className="text-xs text-muted-foreground">{mentionType === "user" ? `No user found for "${mentionQuery}"` : t("noVenueFound", { query: mentionQuery })}</p>
          </div>
        )}
      </div>

      {/* Toolbar: formatting + emoji + GIF */}
      <div className="flex items-center gap-0.5">
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyFormat("bold")} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-[rgba(232,168,64,0.10)] transition-colors" title="Bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyFormat("italic")} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-[rgba(232,168,64,0.10)] transition-colors" title="Italic">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyFormat("underline")} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-[rgba(232,168,64,0.10)] transition-colors" title="Underline">
          <Underline className="h-4 w-4" />
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyFormat("strikethrough")} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-[rgba(232,168,64,0.10)] transition-colors" title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </button>

        {/* Color picker */}
        <div className="relative" ref={colorPickerRef}>
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setColorPickerOpen(!colorPickerOpen)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-[rgba(232,168,64,0.10)] transition-colors" title="Text color">
            <Palette className="h-4 w-4" />
          </button>
          {colorPickerOpen && (
            <div className="absolute z-[100] bottom-full mb-2 left-0 rounded-xl border border-[rgba(232,168,64,0.25)] bg-[rgba(36,28,20,0.98)] shadow-2xl p-3 min-w-[180px]">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Text color</p>
              <div className="grid grid-cols-4 gap-2">
                {COLORS.map((c) => (
                  <button key={c.hex} type="button" onClick={() => applyColor(c.hex)} className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-white/5 transition-colors group">
                    <span className="h-8 w-8 rounded-full border-2 border-white/10 group-hover:border-white/40 group-hover:scale-110 transition-all" style={{ backgroundColor: c.hex }} />
                    <span className="text-[9px] text-muted-foreground">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-[rgba(232,168,64,0.15)] mx-1" />

        <span className="hidden sm:inline-flex">
          <EmojiPickerButton onEmojiSelect={insertEmoji} />
        </span>
        {showGifPicker && (
          <div className="relative">
            <button
              type="button"
              onClick={() => !gifUrl && setGifPickerOpen(!gifPickerOpen)}
              className={cn("transition-colors p-1 text-xs font-bold", gifUrl ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:text-foreground")}
              title={gifUrl ? "1 GIF max - remove the current one first" : "Add a GIF"}
            >
              GIF
            </button>
            {gifPickerOpen && <GifPicker onSelect={insertGif} onClose={() => setGifPickerOpen(false)} />}
          </div>
        )}
      </div>

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value} />
    </div>
  )
}
