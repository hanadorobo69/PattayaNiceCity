const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
type Day = typeof DAYS[number]
type DaySchedule = { open: string; close: string; closed: boolean }
type WeekSchedule = Record<Day, DaySchedule>

const JS_DAY_MAP: Record<number, Day> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 0: "Sun" }

const DAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

// Translated day abbreviations per locale
const DAY_NAMES: Record<string, Record<Day, string>> = {
  en: { Mon: "Mon", Tue: "Tue", Wed: "Wed", Thu: "Thu", Fri: "Fri", Sat: "Sat", Sun: "Sun" },
  fr: { Mon: "Lun", Tue: "Mar", Wed: "Mer", Thu: "Jeu", Fri: "Ven", Sat: "Sam", Sun: "Dim" },
  es: { Mon: "Lun", Tue: "Mar", Wed: "Mié", Thu: "Jue", Fri: "Vie", Sat: "Sáb", Sun: "Dom" },
  zh: { Mon: "周一", Tue: "周二", Wed: "周三", Thu: "周四", Fri: "周五", Sat: "周六", Sun: "周日" },
  ko: { Mon: "월", Tue: "화", Wed: "수", Thu: "목", Fri: "금", Sat: "토", Sun: "일" },
  ja: { Mon: "月", Tue: "火", Wed: "水", Thu: "木", Fri: "金", Sat: "土", Sun: "日" },
  de: { Mon: "Mo", Tue: "Di", Wed: "Mi", Thu: "Do", Fri: "Fr", Sat: "Sa", Sun: "So" },
  yue: { Mon: "週一", Tue: "週二", Wed: "週三", Thu: "週四", Fri: "週五", Sat: "週六", Sun: "週日" },
  th: { Mon: "จ.", Tue: "อ.", Wed: "พ.", Thu: "พฤ.", Fri: "ศ.", Sat: "ส.", Sun: "อา." },
  da: { Mon: "Man", Tue: "Tir", Wed: "Ons", Thu: "Tor", Fri: "Fre", Sat: "Lør", Sun: "Søn" },
  no: { Mon: "Man", Tue: "Tir", Wed: "Ons", Thu: "Tor", Fri: "Fre", Sat: "Lør", Sun: "Søn" },
  sv: { Mon: "Mån", Tue: "Tis", Wed: "Ons", Thu: "Tor", Fri: "Fre", Sat: "Lör", Sun: "Sön" },
  tr: { Mon: "Pzt", Tue: "Sal", Wed: "Çar", Thu: "Per", Fri: "Cum", Sat: "Cmt", Sun: "Paz" },
  nl: { Mon: "Ma", Tue: "Di", Wed: "Wo", Thu: "Do", Fri: "Vr", Sat: "Za", Sun: "Zo" },
  it: { Mon: "Lun", Tue: "Mar", Wed: "Mer", Thu: "Gio", Fri: "Ven", Sat: "Sab", Sun: "Dom" },
  pl: { Mon: "Pon", Tue: "Wt", Wed: "Śr", Thu: "Czw", Fri: "Pt", Sat: "Sob", Sun: "Ndz" },
}

const DAY_NAMES_FULL: Record<string, Record<Day, string>> = {
  en: { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" },
  fr: { Mon: "Lundi", Tue: "Mardi", Wed: "Mercredi", Thu: "Jeudi", Fri: "Vendredi", Sat: "Samedi", Sun: "Dimanche" },
  es: { Mon: "Lunes", Tue: "Martes", Wed: "Miercoles", Thu: "Jueves", Fri: "Viernes", Sat: "Sabado", Sun: "Domingo" },
  zh: { Mon: "星期一", Tue: "星期二", Wed: "星期三", Thu: "星期四", Fri: "星期五", Sat: "星期六", Sun: "星期日" },
  ko: { Mon: "월요일", Tue: "화요일", Wed: "수요일", Thu: "목요일", Fri: "금요일", Sat: "토요일", Sun: "일요일" },
  ja: { Mon: "月曜日", Tue: "火曜日", Wed: "水曜日", Thu: "木曜日", Fri: "金曜日", Sat: "土曜日", Sun: "日曜日" },
  de: { Mon: "Montag", Tue: "Dienstag", Wed: "Mittwoch", Thu: "Donnerstag", Fri: "Freitag", Sat: "Samstag", Sun: "Sonntag" },
  yue: { Mon: "星期一", Tue: "星期二", Wed: "星期三", Thu: "星期四", Fri: "星期五", Sat: "星期六", Sun: "星期日" },
  th: { Mon: "จันทร์", Tue: "อังคาร", Wed: "พุธ", Thu: "พฤหัสบดี", Fri: "ศุกร์", Sat: "เสาร์", Sun: "อาทิตย์" },
  da: { Mon: "Mandag", Tue: "Tirsdag", Wed: "Onsdag", Thu: "Torsdag", Fri: "Fredag", Sat: "Lørdag", Sun: "Søndag" },
  no: { Mon: "Mandag", Tue: "Tirsdag", Wed: "Onsdag", Thu: "Torsdag", Fri: "Fredag", Sat: "Lørdag", Sun: "Søndag" },
  sv: { Mon: "Måndag", Tue: "Tisdag", Wed: "Onsdag", Thu: "Torsdag", Fri: "Fredag", Sat: "Lördag", Sun: "Söndag" },
  tr: { Mon: "Pazartesi", Tue: "Sali", Wed: "Carsamba", Thu: "Persembe", Fri: "Cuma", Sat: "Cumartesi", Sun: "Pazar" },
  nl: { Mon: "Maandag", Tue: "Dinsdag", Wed: "Woensdag", Thu: "Donderdag", Fri: "Vrijdag", Sat: "Zaterdag", Sun: "Zondag" },
  it: { Mon: "Lunedi", Tue: "Martedi", Wed: "Mercoledi", Thu: "Giovedi", Fri: "Venerdi", Sat: "Sabato", Sun: "Domenica" },
  pl: { Mon: "Poniedzialek", Tue: "Wtorek", Wed: "Sroda", Thu: "Czwartek", Fri: "Piatek", Sat: "Sobota", Sun: "Niedziela" },
}

/**
 * Parse hours from either JSON or text format:
 * JSON: {"Mon":{"open":"19:00","close":"03:00","closed":false}, ...}
 * Text: "Mon–Sun 19:00–02:00" or "Fri–Sun 22:00–05:00"
 */
export function parseHoursJson(raw: string | null | undefined): WeekSchedule | null {
  if (!raw) return null

  // Try JSON first
  try {
    const parsed = JSON.parse(raw)
    if (parsed.Mon !== undefined) return parsed
  } catch {}

  // Try text format: "Day–Day HH:MM–HH:MM" or "Day-Day HH:MM-HH:MM"
  const textMatch = raw.match(/^(\w{3})\s*[–\-]\s*(\w{3})\s+(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})$/)
  if (textMatch) {
    const [, startDay, endDay, open, close] = textMatch
    const startIdx = DAY_INDEX[startDay]
    const endIdx = DAY_INDEX[endDay]
    if (startIdx === undefined || endIdx === undefined) return null

    const schedule = {} as WeekSchedule
    for (let i = 0; i < DAYS.length; i++) {
      const day = DAYS[i]
      // Check if this day is in range (handles wrap-around like Fri-Sun)
      const inRange = startIdx <= endIdx
        ? (i >= startIdx && i <= endIdx)
        : (i >= startIdx || i <= endIdx)
      schedule[day] = inRange
        ? { open, close, closed: false }
        : { open: "", close: "", closed: true }
    }
    return schedule
  }

  // Try Google Places format: "Monday: Open 24 hours; Tuesday: 10:00 AM – 11:00 PM; ..."
  if (raw.includes(";") && /day:/i.test(raw)) {
    const GOOGLE_DAY_MAP: Record<string, Day> = {
      monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
      friday: "Fri", saturday: "Sat", sunday: "Sun",
    }
    const schedule = {} as WeekSchedule
    const parts = raw.split(";").map(s => s.trim()).filter(Boolean)
    let parsed = 0
    for (const part of parts) {
      const m = part.match(/^(\w+):\s*(.+)$/i)
      if (!m) continue
      const dayKey = GOOGLE_DAY_MAP[m[1].toLowerCase()]
      if (!dayKey) continue
      const value = m[2].trim()
      if (/open\s+24\s+hours/i.test(value)) {
        schedule[dayKey] = { open: "0:00", close: "23:59", closed: false }
        parsed++
      } else if (/closed/i.test(value)) {
        schedule[dayKey] = { open: "", close: "", closed: true }
        parsed++
      } else {
        // Try to parse "10:00 AM – 11:00 PM" or "10:00 - 23:00"
        const timeMatch = value.match(/(\d{1,2}:\d{2})\s*(AM|PM)?\s*[–\-]\s*(\d{1,2}:\d{2})\s*(AM|PM)?/i)
        if (timeMatch) {
          let openH = parseInt(timeMatch[1].split(":")[0])
          const openM = timeMatch[1].split(":")[1]
          if (timeMatch[2]?.toUpperCase() === "PM" && openH < 12) openH += 12
          if (timeMatch[2]?.toUpperCase() === "AM" && openH === 12) openH = 0
          let closeH = parseInt(timeMatch[3].split(":")[0])
          const closeM = timeMatch[3].split(":")[1]
          if (timeMatch[4]?.toUpperCase() === "PM" && closeH < 12) closeH += 12
          if (timeMatch[4]?.toUpperCase() === "AM" && closeH === 12) closeH = 0
          schedule[dayKey] = { open: `${openH}:${openM}`, close: `${closeH}:${closeM}`, closed: false }
          parsed++
        }
      }
    }
    if (parsed >= 3) return schedule
  }

  return null
}

/** Get current Bangkok time reliably (UTC+7) */
function getBangkokNow() {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  const bangkokMs = utcMs + 7 * 3600000
  const bangkok = new Date(bangkokMs)
  return {
    dayOfWeek: bangkok.getDay(),
    hours: bangkok.getHours(),
    minutes: bangkok.getMinutes(),
  }
}

/**
 * Returns "open" | "closed" | "closing-soon" based on current time in Bangkok (UTC+7)
 */
export function getVenueStatus(hoursJson: string | null | undefined): "open" | "closed" | "closing-soon" {
  const schedule = parseHoursJson(hoursJson)
  if (!schedule) return "closed"

  const { dayOfWeek, hours, minutes } = getBangkokNow()
  const today: Day = JS_DAY_MAP[dayOfWeek]
  const yesterday: Day = JS_DAY_MAP[(dayOfWeek + 6) % 7]
  const nowMinutes = hours * 60 + minutes

  // Check today's schedule
  const todaySched = schedule[today]
  if (todaySched && !todaySched.closed) {
    const openMin = parseTimeToMinutes(todaySched.open)
    const closeMin = parseTimeToMinutes(todaySched.close)

    if (closeMin > openMin) {
      // Same-day (e.g. 09:00-17:00)
      if (nowMinutes >= openMin && nowMinutes < closeMin) {
        if (closeMin - nowMinutes <= 60) return "closing-soon"
        return "open"
      }
    } else if (closeMin <= openMin) {
      // Overnight (e.g. 19:00-03:00)
      if (nowMinutes >= openMin) {
        const minutesToClose = (24 * 60 - nowMinutes) + closeMin
        if (minutesToClose <= 60) return "closing-soon"
        return "open"
      }
    }
  }

  // Check yesterday's overnight window (e.g. it's 01:00 and yesterday opened 19:00-03:00)
  const yesterdaySched = schedule[yesterday]
  if (yesterdaySched && !yesterdaySched.closed) {
    const openMin = parseTimeToMinutes(yesterdaySched.open)
    const closeMin = parseTimeToMinutes(yesterdaySched.close)
    if (closeMin <= openMin && nowMinutes < closeMin) {
      if (closeMin - nowMinutes <= 60) return "closing-soon"
      return "open"
    }
  }

  return "closed"
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + (m || 0)
}

/** Format time based on locale: 24h for fr/es/zh, 12h AM/PM for en */
function formatTime(time: string, locale: string): string {
  const [h, m] = time.split(":").map(Number)
  if (locale === "en") {
    const suffix = h >= 12 ? "PM" : "AM"
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return m ? `${hour12}:${String(m).padStart(2, "0")} ${suffix}` : `${hour12} ${suffix}`
  }
  // French style: 19h, 19h30
  if (locale === "fr") {
    return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`
  }
  // All other locales: 24h format HH:MM
  return `${h}:${String(m).padStart(2, "0")}`
}

/**
 * Smart hours display: groups consecutive days with same hours.
 * Returns lines like "Mon-Thu: 7 PM – 3 AM" (en) or "Lun-Jeu: 19h – 3h" (fr)
 * closedLabel: translated "Closed" string
 */
export function formatSmartHours(
  hoursJson: string | null | undefined,
  locale: string = "en",
  closedLabel: string = "Closed"
): string[] {
  const schedule = parseHoursJson(hoursJson)
  if (!schedule) return []

  const dayNames = DAY_NAMES[locale] ?? DAY_NAMES.en

  const groups: { days: Day[]; open: string; close: string; closed: boolean }[] = []

  for (const day of DAYS) {
    const s = schedule[day]
    if (!s) continue
    const last = groups[groups.length - 1]
    if (last && last.open === s.open && last.close === s.close && last.closed === s.closed) {
      last.days.push(day)
    } else {
      groups.push({ days: [day], open: s.open, close: s.close, closed: s.closed })
    }
  }

  return groups
    .filter(g => !g.closed)
    .map(g => {
      const firstDay = dayNames[g.days[0]]
      const lastDay = dayNames[g.days[g.days.length - 1]]
      const dayRange = g.days.length === 1 ? firstDay : `${firstDay}-${lastDay}`
      return `${dayRange}: ${formatTime(g.open, locale)} – ${formatTime(g.close, locale)}`
    })
}

/**
 * Full daily hours display: one line per day (Mon-Sun), each with hours or "24h/24".
 * Used on venue detail page for complete schedule view.
 */
export function formatDailyHours(
  hoursJson: string | null | undefined,
  locale: string = "en",
  closedLabel: string = "Closed"
): { day: string; time: string; is24h: boolean; isClosed: boolean }[] {
  const schedule = parseHoursJson(hoursJson)
  if (!schedule) return []

  const dayNames = DAY_NAMES_FULL[locale] ?? DAY_NAMES_FULL.en

  return DAYS.map(day => {
    const s = schedule[day]
    if (!s || s.closed) {
      return { day: dayNames[day], time: closedLabel, is24h: false, isClosed: true }
    }
    const openMin = parseTimeToMinutes(s.open)
    const closeMin = parseTimeToMinutes(s.close)
    if (openMin === 0 && (closeMin >= 1439 || closeMin === 0)) {
      return { day: dayNames[day], time: "24h/24", is24h: true, isClosed: false }
    }
    return {
      day: dayNames[day],
      time: `${formatTime(s.open, locale)} - ${formatTime(s.close, locale)}`,
      is24h: false,
      isClosed: false,
    }
  })
}
