import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

import Pino from "pino";
import cfonts from "cfonts";
import handler from "./handler.js";

// =========================
// START BOT
// =========================
async function start() {

  cfonts.say("SMART JS BOT", {
    font: "block",
    align: "center",
    colors: ["cyan", "yellow"]
  });

  console.log("🚀 BOT STARTING...");

  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    logger: Pino({ level: "silent" }),
    browser: ["SmartJS", "Chrome", "120.0"],
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  // =========================
  // CONNECTION
  // =========================
  sock.ev.on("connection.update", async (update) => {

    const { connection, lastDisconnect, pairingCode } = update;

    console.log("STATE:", connection);

    // 🔑 Pairing Code (اگر نیاز باشد)
    if (pairingCode) {
      console.log("\n🔑 PAIRING CODE:");
      console.log(pairingCode);
    }

    if (connection === "open") {
      console.log("✔ CONNECTED SUCCESSFULLY");
    }

    if (connection === "close") {

      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;

      console.log("❌ DISCONNECTED");

      if (shouldReconnect) {
        setTimeout(start, 3000);
      }
    }
  });

  // =========================
  // MESSAGES
  // =========================
  sock.ev.on("messages.upsert", async ({ messages }) => {

    const m = messages[0];
    if (!m?.message) return;

    const from = m.key.remoteJid;

    const body =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      "";

    await handler(sock, from, body, m);
  });

  console.log("🟢 BOT RUNNING ON RENDER...");
}

// =========================
// ERROR HANDLER
// =========================
process.on("uncaughtException", console.log);
process.on("unhandledRejection", console.log);

// START
start();