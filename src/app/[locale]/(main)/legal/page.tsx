import type { Metadata } from "next"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"

export const revalidate = 86400

export const metadata: Metadata = {
  title: "Legal - Pattaya Nice City",
  description: "Terms of service, privacy policy, community guidelines, and legal information for Pattaya Nice City.",
}

const g = "bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent"
const orb = "font-[family-name:var(--font-orbitron)]"
const card = "rounded-xl border satine-border bg-card p-6"
const body = "text-sm text-muted-foreground leading-relaxed"

export default async function LegalPage() {
  const t = await getTranslations("legal")

  return (
    <div className="max-w-3xl mx-auto space-y-10 py-4">

      {/* Header */}
      <div className="space-y-2">
        <h1 className={`text-3xl font-bold ${orb}`}>
          <span className={g}>{t("pageTitle")}</span>
        </h1>
        <p className="text-muted-foreground">{t("lastUpdated")}</p>
        <p className={`${body} italic`}>{t("langNote")}</p>
      </div>

      {/* ============================================================ */}
      {/* 1. TERMS OF SERVICE */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <h2 className={`text-2xl font-bold ${orb}`}>
          <span className={g}>{t("tosTitle")}</span>
        </h2>
        <div className={`${card} space-y-6 ${body}`}>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos11Title")}</h3>
            <p>{t("tos11P1")}</p>
            <p>{t("tos11P2")}</p>
            <p>{t("tos11P3")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos12Title")}</h3>
            <p>{t("tos12P1")}</p>
            <p>{t("tos12P2")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos13Title")}</h3>
            <p>{t("tos13P1")}</p>
            <p>{t("tos13P2")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos14Title")}</h3>
            <p>{t("tos14P1")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos15Title")}</h3>
            <p>{t("tos15P1")}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15] as const).map(i => (
                <li key={i}>{t(`tos15Item${i}` as any)}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos16Title")}</h3>
            <p>{t("tos16P1")}</p>
            <p>{t("tos16P2")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos17Title")}</h3>
            <p>{t("tos17P1")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos18Title")}</h3>
            <p>{t("tos18P1")}</p>
            <p>{t("tos18P2")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos19Title")}</h3>
            <p>{t("tos19P1")}</p>
            <p>{t("tos19P2")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos110Title")}</h3>
            <p>{t("tos110P1")}</p>
            <p>{t("tos110P2")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos111Title")}</h3>
            <p>{t("tos111P1")}</p>
            <p>{t("tos111P2")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos112Title")}</h3>
            <p>{t("tos112P1")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos113Title")}</h3>
            <p>{t("tos113P1")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("tos114Title")}</h3>
            <p>{t("tos114P1")}</p>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. COMMUNITY GUIDELINES */}
      {/* ============================================================ */}
      <section className="space-y-4" id="community-guidelines">
        <h2 className={`text-2xl font-bold ${orb}`}>
          <span className={g}>{t("guidelinesTitle")}</span>
        </h2>
        <div className={`${card} space-y-6 ${body}`}>

          <p>{t("guidelinesIntro")}</p>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("guidelinesWelcomeTitle")}</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {([1,2,3,4,5,6] as const).map(i => (
                <li key={i}>{t(`guidelinesWelcomeItem${i}` as any)}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("guidelinesNotAllowedTitle")}</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {([1,2,3,4,5,6,7,8,9] as const).map(i => (
                <li key={i}><strong className="text-foreground">{t(`guidelinesNA${i}Label` as any)}</strong> {t(`guidelinesNA${i}Text` as any)}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("guidelinesReportTitle")}</h3>
            <p>
              {t("guidelinesReportP1")}{" "}
              <span className="text-primary">contact@pattayanicecity.com</span>
              {t("guidelinesReportP2")}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("guidelinesAfterReportTitle")}</h3>
            <p>{t("guidelinesAfterReportP1")}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {([1,2,3,4,5] as const).map(i => (
                <li key={i}>{t(`guidelinesAfterReportItem${i}` as any)}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("guidelinesRepeatTitle")}</h3>
            <p>{t("guidelinesRepeatP1")}</p>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. CONTENT & MODERATION POLICY */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <h2 className={`text-2xl font-bold ${orb}`}>
          <span className={g}>{t("moderationTitle")}</span>
        </h2>
        <div className={`${card} space-y-6 ${body}`}>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("moderationEditorialTitle")}</h3>
            <p>{t("moderationEditorialP1")}</p>
            <p>{t("moderationEditorialP2")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("moderationApproachTitle")}</h3>
            <p>{t("moderationApproachP1")}</p>
            <p>{t("moderationApproachP2")}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {([1,2,3,4] as const).map(i => (
                <li key={i}>{t(`moderationApproachItem${i}` as any)}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("moderationActionsTitle")}</h3>
            <p>{t("moderationActionsP1")}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {([1,2,3,4] as const).map(i => (
                <li key={i}>{t(`moderationActionsItem${i}` as any)}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("moderationTakedownTitle")}</h3>
            <p>
              {t("moderationTakedownP1")}{" "}
              <span className="text-primary">contact@pattayanicecity.com</span>
              {t("moderationTakedownP2")}
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {([1,2,3] as const).map(i => (
                <li key={i}>{t(`moderationTakedownItem${i}` as any)}</li>
              ))}
            </ul>
            <p>{t("moderationTakedownP3")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("moderationCounterTitle")}</h3>
            <p>{t("moderationCounterP1")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("moderationResponsibilityTitle")}</h3>
            <p>{t("moderationResponsibilityP1")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("moderationCooperationTitle")}</h3>
            <p>{t("moderationCooperationP1")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("moderationUrgentTitle")}</h3>
            <p>
              {t("moderationUrgentP1")}{" "}
              <span className="text-primary">contact@pattayanicecity.com</span>
              {t("moderationUrgentP2")}
            </p>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. PRIVACY POLICY */}
      {/* ============================================================ */}
      <section className="space-y-4" id="privacy-policy">
        <h2 className={`text-2xl font-bold ${orb}`}>
          <span className={g}>{t("privacyTitle")}</span>
        </h2>
        <div className={`${card} space-y-6 ${body}`}>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("privacyDataTitle")}</h3>
            <p>{t("privacyDataP1")}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {([1,2,3,4] as const).map(i => (
                <li key={i}><strong className="text-foreground">{t(`privacyDataItem${i}Label` as any)}</strong> {t(`privacyDataItem${i}Text` as any)}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("privacyCookiesTitle")}</h3>
            <p>{t("privacyCookiesP1")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("privacyUseTitle")}</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {([1,2,3,4,5,6] as const).map(i => (
                <li key={i}>{t(`privacyUseItem${i}` as any)}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("privacyRetentionTitle")}</h3>
            <p>{t("privacyRetentionP1")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("privacySharingTitle")}</h3>
            <p>{t("privacySharingP1")}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {([1,2,3,4] as const).map(i => (
                <li key={i}><strong className="text-foreground">{t(`privacySharingItem${i}Label` as any)}</strong> {t(`privacySharingItem${i}Text` as any)}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("privacyRightsTitle")}</h3>
            <p>
              {t("privacyRightsP1")}{" "}
              <span className="text-primary">contact@pattayanicecity.com</span>
              {t("privacyRightsP2")}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("privacyTransfersTitle")}</h3>
            <p>{t("privacyTransfersP1")}</p>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. COPYRIGHT & INTELLECTUAL PROPERTY */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <h2 className={`text-2xl font-bold ${orb}`}>
          <span className={g}>{t("copyrightTitle")}</span>
        </h2>
        <div className={`${card} space-y-6 ${body}`}>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("copyrightReportingTitle")}</h3>
            <p>
              {t("copyrightReportingP1")}{" "}
              <span className="text-primary">contact@pattayanicecity.com</span>{" "}
              {t("copyrightReportingP2")}
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {([1,2,3,4,5,6] as const).map(i => (
                <li key={i}>{t(`copyrightReportingItem${i}` as any)}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("copyrightAfterTitle")}</h3>
            <p>{t("copyrightAfterP1")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("copyrightCounterTitle")}</h3>
            <p>
              {t("copyrightCounterP1")}{" "}
              <span className="text-primary">contact@pattayanicecity.com</span>{" "}
              {t("copyrightCounterP2")}
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {([1,2,3,4,5] as const).map(i => (
                <li key={i}>{t(`copyrightCounterItem${i}` as any)}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("copyrightRepeatTitle")}</h3>
            <p>{t("copyrightRepeatP1")}</p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("copyrightPlatformTitle")}</h3>
            <p>{t("copyrightPlatformP1")}</p>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. CONTACT & REPORTING */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <h2 className={`text-2xl font-bold ${orb}`}>
          <span className={g}>{t("contactTitle")}</span>
        </h2>
        <div className={`${card} space-y-6 ${body}`}>

          <p>{t("contactIntro")}</p>

          <div className="flex items-center gap-3 p-4 rounded-lg border border-[rgba(232,168,64,0.15)] bg-[rgba(36,28,20,0.4)]">
            <span className="font-medium text-foreground">{t("contactEmailLabel")}</span>
            <Link href="/contact" className="text-primary hover:underline font-medium">contact@pattayanicecity.com</Link>
          </div>

          <p>{t("contactAllRequests")}</p>

          <div className="space-y-2">
            <h3 className={`font-semibold ${g}`}>{t("contactBusinessTitle")}</h3>
            <p>{t("contactBusinessP1Unified")}</p>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            {t("contactSeeAlso")} <Link href="/about" className="text-primary hover:underline">About Pattaya Nice City</Link>
          </p>

        </div>
      </section>

    </div>
  )
}
