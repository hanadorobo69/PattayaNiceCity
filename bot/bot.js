require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const OpenAI = require("openai");
const fs = require("fs");
const { execFile, exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// ── Config ──
const PROJECT_DIR =
  process.env.PROJECT_DIR || "/home/bababobo/PattayaViceCity";
const ALLOWED_IDS = (process.env.TELEGRAM_ALLOWED_IDS || "")
  .split(",")
  .map(Number)
  .filter(Boolean);

// ── Clients ──
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const whisper = new OpenAI({
  apiKey: process.env.WHISPER_API_KEY,
  baseURL: process.env.WHISPER_BASE_URL || "https://api.groq.com/openai/v1",
});

// ── System prompt appended to Claude Code ──
const CLAUDE_SYSTEM = [
  "Tu réponds en français, ULTRA COURT.",
  "WORKFLOW OBLIGATOIRE après chaque modification de code :",
  "1. Fais les modifications demandées",
  "2. npm test (lance les tests unitaires, DOIT passer)",
  "3. npm run build (build Next.js, DOIT passer)",
  "4. git add <fichiers modifiés> && git commit -m 'description courte' && git push",
  "5. pm2 restart pattaya",
  "FORMAT DE RÉPONSE FINAL OBLIGATOIRE — UNE SEULE LIGNE :",
  "✅ Tests OK · Build OK · push: 'nom du commit'",
  "ou si erreur : ❌ Tests FAIL / Build FAIL + 1 ligne d'erreur",
  "C'EST TOUT. Rien d'autre. Pas de résumé, pas de détails, pas de liste, pas d'explication.",
  "Si les tests ou le build échouent, corrige et recommence. Ne demande pas confirmation.",
  "Si l'utilisateur dit juste 'commit push' ou similaire sans modif, fais git add + commit + push du code actuel.",
  "Design: gradient Rose #ff2d95 → Violet #8a2be2 → Cyan #00f5ff, font Orbitron.",
  'PM2 process: "pattaya". Restart: pm2 restart pattaya.',
].join("\n");

// ── Conversation tracking for --continue ──
let lastSessionActive = false;

// ── Transcribe voice via Groq Whisper ──
async function transcribe(fileUrl) {
  const res = await fetch(fileUrl);
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = `/tmp/voice_${Date.now()}.ogg`;
  fs.writeFileSync(tmp, buf);
  try {
    const t = await whisper.audio.transcriptions.create({
      file: fs.createReadStream(tmp),
      model: process.env.WHISPER_MODEL || "whisper-large-v3-turbo",
      language: "fr",
    });
    return t.text;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {}
  }
}

// ── Run Claude Code CLI ──
async function runClaude(prompt, useContinue = false) {
  const args = [
    "-p",
    `ULTRATHINK THROUGH THIS STEP BY STEP:\n${prompt}`,
    "--model",
    "claude-opus-4-6",
    "--append-system-prompt",
    CLAUDE_SYSTEM,
    "--dangerously-skip-permissions",
    "--output-format",
    "text",
    "--max-turns",
    "30",
  ];

  // Continue previous conversation if follow-up
  if (useContinue && lastSessionActive) {
    args.push("--continue");
  }

  const { stdout, stderr } = await execFileAsync("claude", args, {
    cwd: PROJECT_DIR,
    timeout: 300_000, // 5 min for builds
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      HOME: process.env.HOME || "/home/bababobo",
      PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
    },
  });

  lastSessionActive = true;
  const raw = (stdout || "").trim();

  // Post-process: extract only the final status line(s) to keep Telegram response short
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  // Look for the status line (starts with ✅ or ❌)
  const statusLine = lines.filter((l) => /^[✅❌]/.test(l));
  if (statusLine.length > 0) {
    return statusLine.join("\n");
  }

  // Fallback: return last 2 non-empty lines (likely the conclusion)
  return lines.slice(-2).join("\n");
}

// ── Telegram helpers ──
async function sendMsg(chatId, text) {
  if (!text?.trim()) return;
  const MAX = 4000;

  async function send(chunk) {
    try {
      await bot.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
    } catch {
      await bot.sendMessage(chatId, chunk);
    }
  }

  if (text.length <= MAX) return send(text);

  let current = "";
  for (const line of text.split("\n")) {
    if (current.length + line.length + 1 > MAX) {
      await send(current);
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }
  }
  if (current) await send(current);
}

function startTyping(chatId) {
  bot.sendChatAction(chatId, "typing").catch(() => {});
  const iv = setInterval(() => {
    bot.sendChatAction(chatId, "typing").catch(() => {});
  }, 4000);
  return () => clearInterval(iv);
}

// ── Main handler ──
async function handleMessage(chatId, text, isContinue = true) {
  const stopTyping = startTyping(chatId);
  await bot.sendMessage(chatId, "🔧 Je travaille dessus...").catch(() => {});

  try {
    const response = await runClaude(text, isContinue);
    stopTyping();

    if (response) {
      await sendMsg(chatId, response);
    } else {
      await sendMsg(chatId, "✅ Terminé (pas de sortie texte).");
    }
  } catch (err) {
    stopTyping();
    console.error("Claude error:", err);
    // Clean error: NEVER expose the raw command or system prompt
    let msg = "";
    // Prefer stderr if it doesn't contain the command itself
    const stderr = (err.stderr || "").trim();
    const raw = stderr || err.message || String(err);
    // Strip every line that contains "Command failed:" or "claude -p" or "--append-system-prompt"
    const safeLines = raw.split("\n").filter(
      (l) => !/Command failed:|claude -p|--append-system-prompt|ULTRATHINK/i.test(l)
    );
    msg = safeLines.join("\n").trim();
    if (!msg || msg.length < 5) msg = "Erreur Claude CLI — réessaie.";
    await sendMsg(chatId, `❌ ${msg.slice(0, 300)}`);
  }
}

// ── Security ──
function isAllowed(msg) {
  if (ALLOWED_IDS.length === 0) return true;
  return ALLOWED_IDS.includes(msg.from.id);
}

// ── Voice messages ──
bot.on("voice", async (msg) => {
  if (!isAllowed(msg)) return;
  try {
    await bot.sendChatAction(msg.chat.id, "typing");
    const file = await bot.getFile(msg.voice.file_id);
    const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const text = await transcribe(url);
    await sendMsg(msg.chat.id, `🎤 _${text}_`);
    await handleMessage(msg.chat.id, text);
  } catch (err) {
    console.error("Voice error:", err);
    await sendMsg(
      msg.chat.id,
      `❌ Erreur transcription: ${err.message?.slice(0, 300)}`
    );
  }
});

// ── Video notes (round videos) ──
bot.on("video_note", async (msg) => {
  if (!isAllowed(msg)) return;
  try {
    await bot.sendChatAction(msg.chat.id, "typing");
    const file = await bot.getFile(msg.video_note.file_id);
    const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const text = await transcribe(url);
    await sendMsg(msg.chat.id, `🎤 _${text}_`);
    await handleMessage(msg.chat.id, text);
  } catch (err) {
    console.error("Video note error:", err);
    await sendMsg(msg.chat.id, `❌ Erreur: ${err.message?.slice(0, 300)}`);
  }
});

// ── Text messages ──
bot.on("message", async (msg) => {
  if (!isAllowed(msg)) return;
  if (msg.voice || msg.video_note || !msg.text) return;

  if (msg.text === "/start") {
    return sendMsg(
      msg.chat.id,
      "👋 *PVC Dev Bot*\n\n" +
        "Envoie un vocal ou un texte.\n" +
        "Je modifie le code, build, restart.\n" +
        "Tu testes sur pattayavicecity.com\n" +
        'Puis dis "commit push".\n\n' +
        "/reset — Nouveau contexte\n" +
        "/id — Ton ID Telegram\n" +
        "/status — État du serveur"
    );
  }

  if (msg.text === "/reset") {
    lastSessionActive = false;
    return sendMsg(msg.chat.id, "🔄 Contexte réinitialisé.");
  }

  if (msg.text === "/id") {
    return bot.sendMessage(msg.chat.id, `Ton ID: ${msg.from.id}`);
  }

  if (msg.text === "/status") {
    try {
      const { stdout } = await execAsync("pm2 jlist", {
        cwd: PROJECT_DIR,
        timeout: 5000,
      });
      const procs = JSON.parse(stdout);
      const pvc = procs.find((p) => p.name === "pattaya");
      if (pvc) {
        const uptime = Math.round(
          (Date.now() - pvc.pm2_env.pm_uptime) / 60_000
        );
        return sendMsg(
          msg.chat.id,
          `✅ *pattaya* — ${pvc.pm2_env.status}\n⏱ Uptime: ${uptime} min\n🔄 Restarts: ${pvc.pm2_env.restart_time}`
        );
      }
      return sendMsg(msg.chat.id, "⚠️ Process 'pattaya' not found");
    } catch (err) {
      return sendMsg(msg.chat.id, `❌ ${err.message?.slice(0, 200)}`);
    }
  }

  await handleMessage(msg.chat.id, msg.text);
});

// ── Start ──
console.log("🤖 PVC Bot started");
console.log(`📁 Project: ${PROJECT_DIR}`);
console.log(
  `🔒 Allowed IDs: ${ALLOWED_IDS.length ? ALLOWED_IDS.join(", ") : "ALL (set TELEGRAM_ALLOWED_IDS!)"}`
);
