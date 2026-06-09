import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

import Pino from "pino";
import express from "express";
import cfonts from "cfonts";
import handler from "./handler.js";

// =========================
// KEEP ALIVE (Render Fix)
// =========================
const app = express();

app.get("/", (req, res) => {
  res.status(200).send("🟢 BOT IS RUNNING");
});

app.listen(process.env.PORT || 10000, () => {
  console.log("🌐 Keep alive server running");
});

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
  // PAIRING CODE (IMPORTANT)
  // =========================
  const phone = process.env.PHONE_NUMBER;

  if (phone) {
    try {
      const code = await sock.requestPairingCode(phone);
      console.log("\n🔑 PAIRING CODE:");
      console.log(code);
    } catch (e) {
      console.log("❌ Pairing error:", e);
    }
  }

  // =========================
  // CONNECTION HANDLER
  // =========================
  sock.ev.on("connection.update", (update) => {

    const { connection, lastDisconnect, pairingCode } = update;

    console.log("STATE:", connection);

    if (pairingCode) {
      console.log("🔑 PAIRING CODE:", pairingCode);
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
  // MESSAGE HANDLER
  // =========================
  sock.ev.on("messages.upsert", async ({ messages }) => {

    try {

      const m = messages[0];
      if (!m?.message) return;

      const from = m.key.remoteJid;

      const body =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        "";

      await handler(sock, from, body, m);

    } catch (e) {
      console.log("MESSAGE ERROR:", e);
    }

  });

  console.log("🟢 BOT ONLINE");
}

// =========================
// ERROR HANDLING
// =========================
process.on("uncaughtException", (e) => console.log(e));
process.on("unhandledRejection", (e) => console.log(e));

// START
start();