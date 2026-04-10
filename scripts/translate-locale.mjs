/**
 * Translate en.json to a target locale using Google Translate API.
 * Usage: node scripts/translate-locale.mjs <targetLocale>
 * Example: node scripts/translate-locale.mjs da
 *
 * Preserves JSON structure and {placeholder} variables.
 */

import { readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const MESSAGES_DIR = join(__dirname, "..", "src", "i18n", "messages")
const API_KEY = "AIzaSyAl5sSRBWJTQYd_h7lZYngI_O2JK162YY0"

const targetLocale = process.argv[2]
if (!targetLocale) {
  console.error("Usage: node scripts/translate-locale.mjs <locale>")
  process.exit(1)
}

// Map locale codes to Google Translate language codes
const GOOGLE_LANG_MAP = {
  da: "da",  // Danish
  no: "no",  // Norwegian
  sv: "sv",  // Swedish
  tr: "tr",  // Turkish
  nl: "nl",  // Dutch
  it: "it",  // Italian
  pl: "pl",  // Polish
}

const googleLang = GOOGLE_LANG_MAP[targetLocale] || targetLocale

async function translateSingle(text, targetLang) {
  // Free Google Translate endpoint (no API key needed)
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Translate HTTP ${res.status}`)
  const data = await res.json()
  // Response format: [[["translated text","source text",null,null,x],...],null,"en",...]
  let result = ""
  if (data && data[0]) {
    for (const seg of data[0]) {
      if (seg[0]) result += seg[0]
    }
  }
  return result || text
}

async function translateBatch(texts, targetLang) {
  // Translate one by one using free endpoint (batching not supported)
  // Join with separator to reduce API calls
  const CHUNK = 30
  const results = []
  for (let i = 0; i < texts.length; i += CHUNK) {
    const chunk = texts.slice(i, i + CHUNK)
    const separator = "\n|||SEP|||\n"
    const joined = chunk.join(separator)
    const translated = await translateSingle(joined, targetLang)
    const parts = translated.split(/\|\|\|SEP\|\|\||\|\|\| SEP \|\|\|/)
    // Handle cases where separator gets translated
    if (parts.length === chunk.length) {
      results.push(...parts.map(p => p.trim()))
    } else {
      // Fallback: translate one by one
      for (const t of chunk) {
        await new Promise(r => setTimeout(r, 100))
        const single = await translateSingle(t, targetLang)
        results.push(single.trim())
      }
    }
  }
  return results
}

// Flatten nested JSON to key-value pairs
function flatten(obj, prefix = "") {
  const result = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result.push(...flatten(value, path))
    } else {
      result.push({ path, value })
    }
  }
  return result
}

// Unflatten key-value pairs back to nested object
function unflatten(entries) {
  const result = {}
  for (const { path, value } of entries) {
    const keys = path.split(".")
    let current = result
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) current[keys[i]] = {}
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
  }
  return result
}

async function main() {
  console.log(`Translating en.json -> ${targetLocale}.json (Google lang: ${googleLang})\n`)

  const enJson = JSON.parse(readFileSync(join(MESSAGES_DIR, "en.json"), "utf-8"))
  const flat = flatten(enJson)

  console.log(`Total strings to translate: ${flat.length}`)

  // Protect {placeholders} by replacing them temporarily
  const placeholderMap = new Map()
  let phIdx = 0
  const textsToTranslate = flat.map(entry => {
    let text = String(entry.value)
    // Replace {xxx} placeholders with unique tokens
    text = text.replace(/\{([^}]+)\}/g, (match) => {
      const token = `__PH${phIdx}__`
      placeholderMap.set(token, match)
      phIdx++
      return token
    })
    return text
  })

  // Translate in batches of 100 (API limit)
  const BATCH_SIZE = 100
  const translated = []

  for (let i = 0; i < textsToTranslate.length; i += BATCH_SIZE) {
    const batch = textsToTranslate.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(textsToTranslate.length / BATCH_SIZE)
    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} strings)...`)

    await new Promise(r => setTimeout(r, 200)) // Rate limit
    const results = await translateBatch(batch, googleLang)
    translated.push(...results)
  }

  // Restore placeholders and build result
  const resultEntries = flat.map((entry, idx) => {
    let text = translated[idx]
    // Restore {placeholders}
    for (const [token, original] of placeholderMap) {
      text = text.replace(token, original)
      // Google sometimes adds spaces around tokens
      text = text.replace(token.replace(/__/g, "__ "), original)
    }
    // Fix HTML entities Google might introduce
    text = text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    return { path: entry.path, value: text }
  })

  const resultJson = unflatten(resultEntries)

  // Write output
  const outPath = join(MESSAGES_DIR, `${targetLocale}.json`)
  writeFileSync(outPath, JSON.stringify(resultJson, null, 2) + "\n", "utf-8")
  console.log(`\nWritten: ${outPath}`)
  console.log(`Done!`)
}

main().catch(err => {
  console.error("Error:", err.message)
  process.exit(1)
})
