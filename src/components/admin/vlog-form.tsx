"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "@/i18n/navigation"
import { createVlog, updateVlog } from "@/actions/vlogs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { InternalLinkModal } from "./internal-link-modal"
import { SeoScorePanel } from "./seo-score-panel"
import dynamic from "next/dynamic"
import {
  Loader2, Video, FileText, Search, HelpCircle, Plus, Trash2,
  Image as ImageIcon, BookOpen, MapPin, Link2, Layers, Shield,
  Calendar, Globe, Sparkles, type LucideIcon,
} from "lucide-react"

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false })

interface FaqItem { question: string; answer: string }
interface SourceItem { title: string; url: string; date: string }
interface TerrainProofItem { type: string; url: string; caption: string; date: string; location: string }
interface BlogCategoryOption { id: string; name: string; slug: string; color: string }

interface VlogFormProps {
  initialData?: Record<string, any>
  categories?: BlogCategoryOption[]
}

const ARTICLE_TYPES = [
  { value: "article", label: "Article" },
  { value: "guide", label: "Guide" },
  { value: "howto", label: "How-To" },
  { value: "review", label: "Review" },
  { value: "listicle", label: "Listicle" },
] as const

const PROOF_TYPES = [
  { value: "photo", label: "Photo" },
  { value: "receipt", label: "Receipt" },
  { value: "gps", label: "GPS/Location" },
] as const

export function VlogForm({ initialData, categories = [] }: VlogFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [content, setContent] = useState(initialData?.content ?? "")
  const [youtubeUrl, setYoutubeUrl] = useState(initialData?.youtubeUrl ?? "")
  const [faqs, setFaqs] = useState<FaqItem[]>(initialData?.faqs ?? [])
  const [sources, setSources] = useState<SourceItem[]>(initialData?.sources ?? [])
  const [terrainProofs, setTerrainProofs] = useState<TerrainProofItem[]>(initialData?.terrainProof ?? [])
  const [tags, setTags] = useState(
    initialData?.tags?.map((t: any) => t.name).join(", ") ?? ""
  )
  const [linkModal, setLinkModal] = useState<"article" | "venue" | null>(null)

  // Refs for live SEO score
  const titleRef = useRef<HTMLInputElement>(null)
  const metaTitleRef = useRef<HTMLInputElement>(null)
  const metaDescRef = useRef<HTMLTextAreaElement>(null)
  const focusKwRef = useRef<HTMLInputElement>(null)
  const excerptRef = useRef<HTMLTextAreaElement>(null)
  const [seoTrigger, setSeoTrigger] = useState(0)
  function triggerSeo() { setSeoTrigger(n => n + 1) }

  function optimizeSeo() {
    const title = titleRef.current?.value || ""
    const keyword = focusKwRef.current?.value || ""
    const excerpt = excerptRef.current?.value || ""

    // Auto-generate metaTitle: title + brand suffix, max ~60 chars
    if (metaTitleRef.current && !metaTitleRef.current.value) {
      const suffix = " - Pattaya Nice City"
      const maxTitleLen = 60 - suffix.length
      const metaTitle = title.length > maxTitleLen ? title.slice(0, maxTitleLen).trim() + suffix : title + suffix
      metaTitleRef.current.value = metaTitle
    }

    // Auto-generate metaDescription: keyword-rich from excerpt, max 155 chars
    if (metaDescRef.current && !metaDescRef.current.value) {
      let desc = excerpt || title
      // Ensure keyword is at the front if possible
      if (keyword && !desc.toLowerCase().startsWith(keyword.toLowerCase())) {
        desc = `${keyword} - ${desc}`
      }
      metaDescRef.current.value = desc.slice(0, 155)
    }

    triggerSeo()
  }

  function getYtId(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
    return m ? m[1] : null
  }

  const ytId = getYtId(youtubeUrl)

  // FAQ helpers
  function addFaq() { setFaqs([...faqs, { question: "", answer: "" }]) }
  function updateFaq(i: number, field: "question" | "answer", value: string) {
    const updated = [...faqs]; updated[i] = { ...updated[i], [field]: value }; setFaqs(updated)
  }
  function removeFaq(i: number) { setFaqs(faqs.filter((_, idx) => idx !== i)) }

  // Source helpers
  function addSource() { setSources([...sources, { title: "", url: "", date: "" }]) }
  function updateSource(i: number, field: keyof SourceItem, value: string) {
    const updated = [...sources]; updated[i] = { ...updated[i], [field]: value }; setSources(updated)
  }
  function removeSource(i: number) { setSources(sources.filter((_, idx) => idx !== i)) }

  // Terrain proof helpers
  function addProof() { setTerrainProofs([...terrainProofs, { type: "photo", url: "", caption: "", date: "", location: "" }]) }
  function updateProof(i: number, field: keyof TerrainProofItem, value: string) {
    const updated = [...terrainProofs]; updated[i] = { ...updated[i], [field]: value }; setTerrainProofs(updated)
  }
  function removeProof(i: number) { setTerrainProofs(terrainProofs.filter((_, idx) => idx !== i)) }

  // Insert link from modal at cursor position (or end if no cursor)
  function handleInsertLink(markdown: string) {
    const textarea = document.querySelector<HTMLTextAreaElement>(".w-md-editor-text-input")
    if (textarea) {
      const start = textarea.selectionStart ?? content.length
      const before = content.slice(0, start)
      const after = content.slice(start)
      const needsSpace = before.length > 0 && !before.endsWith(" ") && !before.endsWith("\n")
      setContent(before + (needsSpace ? " " : "") + markdown + after)
    } else {
      setContent((prev: string) => prev + "\n" + markdown)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    fd.set("content", content)

    const validFaqs = faqs.filter(f => f.question.trim() && f.answer.trim())
    if (validFaqs.length > 0) fd.set("faqs", JSON.stringify(validFaqs))
    else fd.delete("faqs")

    const validSources = sources.filter(s => s.title.trim())
    if (validSources.length > 0) fd.set("sources", JSON.stringify(validSources))
    else fd.delete("sources")

    const validProofs = terrainProofs.filter(p => p.url.trim() || p.caption.trim())
    if (validProofs.length > 0) fd.set("terrainProof", JSON.stringify(validProofs))
    else fd.delete("terrainProof")

    fd.set("tags", tags)

    startTransition(async () => {
      const result = initialData?.id
        ? await updateVlog(initialData.id, fd)
        : await createVlog(fd)
      if (result.success) {
        toast({ title: initialData?.id ? "Article updated" : "Article created", description: result.data.title })
        router.push("/admin/vlogs")
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    })
  }

  const d = initialData ?? {}

  return (
    <>
      {linkModal && (
        <InternalLinkModal
          type={linkModal}
          onInsert={handleInsertLink}
          onClose={() => setLinkModal(null)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main form column */}
        <form onSubmit={handleSubmit} className="space-y-6" id="vlog-form">

          {/* ═══ MAIN CONTENT ═══ */}
          <div className="rounded-2xl border satine-border bg-card p-6 space-y-5">
            <SectionTitle icon={FileText} color="#e8a840" label="Article Content" />

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input ref={titleRef} id="title" name="title" defaultValue={d.title} placeholder="e.g. Top 10 Restaurants in Pattaya - Updated March 2026" required onBlur={triggerSeo} />
              <p className="text-xs text-muted-foreground">Strong SEO title with keywords and date. 50-70 characters ideal.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="articleType">Article Type</Label>
              <select
                id="articleType" name="articleType" defaultValue={d.articleType ?? "article"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ARTICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">How-To generates HowToStep schema from ## headings. Guide/Listicle optimize for featured snippets.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt / Summary</Label>
              <Textarea ref={excerptRef} id="excerpt" name="excerpt" defaultValue={d.excerpt ?? ""} placeholder="A compelling 2-3 sentence summary..." rows={3} onBlur={triggerSeo} />
              <p className="text-xs text-muted-foreground">150-300 characters. Used on blog cards and as fallback meta description.</p>
            </div>

            {/* Content - Markdown Editor + Internal Link Buttons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#3db8a0]" /> Main Content (Markdown) *
                </Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setLinkModal("venue")} className="gap-1.5 text-xs">
                    <MapPin className="h-3.5 w-3.5 text-[#e8a840]" /> + Venue Link
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setLinkModal("article")} className="gap-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5 text-[#3db8a0]" /> + Article Link
                  </Button>
                </div>
              </div>
              <div data-color-mode="dark">
                <MDEditor
                  value={content}
                  onChange={(val) => { setContent(val || ""); triggerSeo() }}
                  height={500}
                  preview="edit"
                  visibleDragbar={false}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Markdown: **bold**, ## Heading, - list, | table |. Use @spot-slug for venue links, #hashtags for topics.
                For How-To articles, use ## Step 1: Title format.
              </p>
            </div>

            {/* Cover Image */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coverImageUrl" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#3db8a0]" /> Cover Image URL
                </Label>
                <Input id="coverImageUrl" name="coverImageUrl" defaultValue={d.coverImageUrl ?? ""} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverImageAlt">Cover Image Alt Text</Label>
                <Input id="coverImageAlt" name="coverImageAlt" defaultValue={d.coverImageAlt ?? ""} placeholder="e.g. Pattaya beach sunset with family activities, 2026" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverImageCaption">Cover Image Caption (EEAT)</Label>
              <Input id="coverImageCaption" name="coverImageCaption" defaultValue={d.coverImageCaption ?? ""} placeholder="e.g. Photo taken on Walking Street, March 15, 2026 - Pattaya Nice City Team" />
              <p className="text-xs text-muted-foreground">Visible caption with date/location proves first-hand experience.</p>
            </div>
          </div>

          {/* ═══ SEO SETTINGS ═══ */}
          <div className="rounded-2xl border border-[rgba(61,184,160,0.20)] bg-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <SectionTitle icon={Search} color="#3db8a0" label="SEO Settings" />
              <Button type="button" variant="outline" size="sm" onClick={optimizeSeo} className="gap-1.5 text-xs border-[rgba(61,184,160,0.30)] text-[#3db8a0] hover:bg-[rgba(61,184,160,0.10)]">
                <Sparkles className="h-3.5 w-3.5" /> Optimize SEO
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title (override)</Label>
                <Input ref={metaTitleRef} id="metaTitle" name="metaTitle" defaultValue={d.metaTitle ?? ""} placeholder="Auto-generated if empty" onBlur={triggerSeo} />
                <p className="text-xs text-muted-foreground">Max 60 chars.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="focusKeyword">Focus Keyword</Label>
                <Input ref={focusKwRef} id="focusKeyword" name="focusKeyword" defaultValue={d.focusKeyword ?? ""} placeholder="e.g. pattaya restaurants guide 2026" onBlur={triggerSeo} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">Meta Description (override)</Label>
              <Textarea ref={metaDescRef} id="metaDescription" name="metaDescription" defaultValue={d.metaDescription ?? ""} placeholder="Auto-generated from excerpt if empty" rows={2} onBlur={triggerSeo} />
              <p className="text-xs text-muted-foreground">Max 160 chars.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="canonicalSlug">Canonical Slug (optional)</Label>
              <Input id="canonicalSlug" name="canonicalSlug" defaultValue={d.canonicalSlug ?? ""} placeholder="Leave empty unless consolidating duplicate content" />
              <p className="text-xs text-muted-foreground">If this article should canonical to another slug (e.g. updated version).</p>
            </div>
          </div>

          {/* ═══ CATEGORY & TAGS ═══ */}
          <div className="rounded-2xl border satine-border bg-card p-6 space-y-4">
            <SectionTitle icon={Layers} color="#e07850" label="Category & Tags" />

            {categories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="blogCategoryId">Main Category</Label>
                <select
                  id="blogCategoryId" name="blogCategoryId" defaultValue={d.blogCategoryId ?? ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">- No category -</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                value={tags} onChange={(e) => setTags(e.target.value)}
                placeholder="Restaurants 2026, Beaches, Family Activities, Pattaya Guide"
              />
              <p className="text-xs text-muted-foreground">Comma-separated. Used for filtering and internal linking.</p>
            </div>
          </div>

          {/* ═══ EEAT - FIELD NOTES, SOURCES & TERRAIN PROOF ═══ */}
          <div className="rounded-2xl border border-[rgba(232,168,64,0.20)] bg-card p-6 space-y-5">
            <SectionTitle icon={Shield} color="#e8a840" label="EEAT - Experience & Trust Signals" />

            {/* Last Verified On-Site */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lastVerifiedAt" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#3db8a0]" /> Last Verified On-Site
                </Label>
                <Input
                  id="lastVerifiedAt" name="lastVerifiedAt" type="date"
                  defaultValue={d.lastVerifiedAt ? new Date(d.lastVerifiedAt).toISOString().slice(0, 10) : ""}
                />
                <p className="text-xs text-muted-foreground">When did you last physically visit and verify this content? Displayed prominently on the article.</p>
              </div>
            </div>

            {/* Field Notes */}
            <div className="space-y-2">
              <Label htmlFor="fieldNotes">Field Notes (terrain observations)</Label>
              <Textarea
                id="fieldNotes" name="fieldNotes" defaultValue={d.fieldNotes ?? ""}
                placeholder="e.g. Visited Walking Street on March 15, 2026. Prices verified at Windmill, Sapphire, Baccara..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Displayed on the article page to prove first-hand experience.</p>
            </div>

            {/* Terrain Proofs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#e8a840]" /> Terrain Proofs (photos, receipts, GPS)
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addProof} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Proof
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Physical evidence of on-site visits. Strengthens EEAT credibility.</p>

              {terrainProofs.map((proof, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-2 rounded-lg border border-[rgba(232,168,64,0.15)] p-3 relative">
                  <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-red-400 hover:text-red-300" onClick={() => removeProof(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <select
                      value={proof.type} onChange={e => updateProof(i, "type", e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      {PROOF_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Image/File URL</Label>
                    <Input value={proof.url} onChange={e => updateProof(i, "url", e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Caption</Label>
                    <Input value={proof.caption} onChange={e => updateProof(i, "caption", e.target.value)} placeholder="Receipt from Beach Restaurant, 350 THB seafood lunch" />
                  </div>
                  <div className="space-y-1 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={proof.date} onChange={e => updateProof(i, "date", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Location</Label>
                      <Input value={proof.location} onChange={e => updateProof(i, "location", e.target.value)} placeholder="Walking Street" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sources */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-[#3db8a0]" /> Sources & References
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addSource} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Source
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">References generate citation schema for EEAT credibility.</p>

              {sources.map((src, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-3 rounded-lg border border-border p-3 relative">
                  <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-red-400 hover:text-red-300" onClick={() => removeSource(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Input value={src.title} onChange={(e) => updateSource(i, "title", e.target.value)} placeholder="Source title" />
                  <Input value={src.url} onChange={(e) => updateSource(i, "url", e.target.value)} placeholder="URL (optional)" />
                  <Input value={src.date} onChange={(e) => updateSource(i, "date", e.target.value)} placeholder="Date (e.g. 2026-03-15)" />
                </div>
              ))}
            </div>
          </div>

          {/* ═══ FAQs ═══ */}
          <div className="rounded-2xl border satine-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle icon={HelpCircle} color="#eab308" label="FAQ Section" />
              <Button type="button" variant="outline" size="sm" onClick={addFaq} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add FAQ
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">FAQs generate rich snippets in Google search results (FAQ Schema).</p>

            {faqs.map((faq, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border p-4 relative">
                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-red-400 hover:text-red-300" onClick={() => removeFaq(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <div className="space-y-1">
                  <Label className="text-xs">Question {i + 1}</Label>
                  <Input value={faq.question} onChange={(e) => updateFaq(i, "question", e.target.value)} placeholder="e.g. What are the best restaurants in Pattaya?" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Answer</Label>
                  <Textarea value={faq.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} placeholder="Detailed answer..." rows={3} />
                </div>
              </div>
            ))}
          </div>

          {/* ═══ TRANSLATIONS ═══ */}
          <TranslationsSection initialData={d.translations} />

          {/* ═══ YOUTUBE (optional) ═══ */}
          <div className="rounded-2xl border border-[rgba(232,168,64,0.20)] bg-card p-6 space-y-4">
            <SectionTitle icon={Video} color="#ef4444" label="YouTube Video (optional)" />
            <Input
              id="youtubeUrl" name="youtubeUrl" value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {ytId && (
              <div className="rounded-lg overflow-hidden border border-[rgba(232,168,64,0.20)]">
                <div className="aspect-video">
                  <iframe src={`https://www.youtube.com/embed/${ytId}`} title="Preview" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Optional. Leave empty for text-only articles.</p>

            <div className="space-y-2">
              <Label htmlFor="thumbnailUrl">Custom Thumbnail URL (optional)</Label>
              <Input id="thumbnailUrl" name="thumbnailUrl" defaultValue={d.thumbnailUrl ?? ""} placeholder="Leave empty to use cover image or YouTube thumbnail" />
            </div>
          </div>

          {/* ═══ PUBLISH SETTINGS ═══ */}
          <div className="rounded-2xl border satine-border bg-card p-6 space-y-4">
            <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Publish Settings</h2>

            <div className="flex flex-wrap gap-6 items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isPublished" defaultChecked={d.isPublished ?? false} className="rounded" />
                <span className="text-sm">Published</span>
              </label>

              <div className="space-y-1">
                <Label htmlFor="publishedAt" className="text-xs">Publish Date</Label>
                <Input
                  id="publishedAt" name="publishedAt" type="datetime-local"
                  defaultValue={d.publishedAt ? new Date(d.publishedAt).toISOString().slice(0, 16) : ""}
                  className="w-auto"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="lastModifiedAt" className="text-xs">Last Modified Date</Label>
                <Input
                  id="lastModifiedAt" name="lastModifiedAt" type="datetime-local"
                  defaultValue={d.lastModifiedAt ? new Date(d.lastModifiedAt).toISOString().slice(0, 16) : ""}
                  className="w-auto"
                />
                <p className="text-xs text-muted-foreground">Set when you make meaningful content updates.</p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Saving..." : d.id ? "Update Article" : "Create Article"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>

        {/* Right sidebar - SEO Score Panel (sticky) */}
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <SeoScorePanel
              key={seoTrigger}
              title={titleRef.current?.value || d.title || ""}
              metaTitle={metaTitleRef.current?.value || d.metaTitle || ""}
              metaDescription={metaDescRef.current?.value || d.metaDescription || ""}
              content={content}
              focusKeyword={focusKwRef.current?.value || d.focusKeyword || ""}
              excerpt={excerptRef.current?.value || d.excerpt || ""}
            />
          </div>
        </div>
      </div>
    </>
  )
}

const TRANSLATION_LOCALES = [
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "th", label: "ไทย" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
  { code: "yue", label: "粵語" },
]

function TranslationsSection({ initialData }: { initialData?: Record<string, any> }) {
  const [translations, setTranslations] = useState<Record<string, { title: string; excerpt: string; metaDescription: string }>>(
    initialData && typeof initialData === "object" ? initialData : {}
  )
  const [activeLang, setActiveLang] = useState<string | null>(null)

  function updateField(locale: string, field: string, value: string) {
    setTranslations(prev => ({
      ...prev,
      [locale]: { ...(prev[locale] || { title: "", excerpt: "", metaDescription: "" }), [field]: value },
    }))
  }

  const filledLocales = Object.entries(translations).filter(([, v]) => v.title || v.excerpt || v.metaDescription).map(([k]) => k)

  return (
    <div className="rounded-2xl border border-[rgba(61,184,160,0.15)] bg-card p-6 space-y-4">
      <SectionTitle icon={Globe} color="#3db8a0" label="Translations" />
      <p className="text-xs text-muted-foreground">
        Optional per-locale overrides for title, excerpt, and meta description. Content auto-translates for non-filled locales.
      </p>

      {/* Locale pills */}
      <div className="flex flex-wrap gap-1.5">
        {TRANSLATION_LOCALES.map(loc => {
          const filled = filledLocales.includes(loc.code)
          const isActive = activeLang === loc.code
          return (
            <button
              key={loc.code}
              type="button"
              onClick={() => setActiveLang(isActive ? null : loc.code)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? "bg-[#3db8a0] text-black"
                  : filled
                    ? "bg-[rgba(61,184,160,0.15)] text-[#3db8a0] border border-[rgba(61,184,160,0.30)]"
                    : "bg-card border border-border text-muted-foreground hover:border-[rgba(61,184,160,0.30)]"
              }`}
            >
              {loc.label} {filled && "✓"}
            </button>
          )
        })}
      </div>

      {/* Active locale fields */}
      {activeLang && (
        <div className="space-y-3 rounded-lg border border-[rgba(61,184,160,0.15)] p-4">
          <h4 className="text-xs font-bold text-[#3db8a0]">
            {TRANSLATION_LOCALES.find(l => l.code === activeLang)?.label} ({activeLang})
          </h4>
          <div className="space-y-2">
            <Label className="text-xs">Title</Label>
            <Input
              value={translations[activeLang]?.title || ""}
              onChange={e => updateField(activeLang, "title", e.target.value)}
              placeholder="Translated title..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Excerpt</Label>
            <Textarea
              value={translations[activeLang]?.excerpt || ""}
              onChange={e => updateField(activeLang, "excerpt", e.target.value)}
              placeholder="Translated excerpt..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Meta Description</Label>
            <Textarea
              value={translations[activeLang]?.metaDescription || ""}
              onChange={e => updateField(activeLang, "metaDescription", e.target.value)}
              placeholder="Translated meta description..."
              rows={2}
            />
          </div>
        </div>
      )}

      <input type="hidden" name="translations" value={JSON.stringify(translations)} />
    </div>
  )
}

function SectionTitle({ icon: Icon, color, label }: { icon: LucideIcon; color: string; label: string }) {
  return (
    <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
      <Icon className="h-4 w-4" style={{ color }} /> {label}
    </h2>
  )
}
