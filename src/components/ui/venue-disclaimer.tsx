import { Link } from "@/i18n/navigation"
import { Info } from "lucide-react"

export function VenueDisclaimer() {
  return (
    <div className="rounded-lg border border-[rgba(232,168,64,0.12)] bg-[rgba(36,28,20,0.4)] p-3 text-xs text-muted-foreground leading-relaxed">
      <div className="flex gap-2">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[rgba(232,168,64,0.5)]" />
        <p>
          Listing on this platform does not constitute endorsement, sponsorship, or verification.
          Details may change without notice. User opinions are their own.
          If you are the business owner, <Link href="/contact" className="text-primary hover:underline">contact us</Link> for
          correction or removal requests.{" "}
          <Link href="/legal" className="text-primary hover:underline">Legal</Link>
        </p>
      </div>
    </div>
  )
}
