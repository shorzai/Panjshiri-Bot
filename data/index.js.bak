import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

import Pino from "pino";
import readline from "readline";
import cfonts from "cfonts";
import handler from "./handler.js";

let reconnecting = false;

// گرفتن ورودی از کاربر (شماره)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(text) {
  return new Promise((resolve) => rl.question(text, resolve));
}

async function start() {

  // 🔥 LOGO
  cfonts.say("LION KING", {
    font: "block",
    align: "center",
    colors: ["red", "yellow"],
    background: "transparent",
    letterSpacing: 1,
    lineHeight: 1
  });

  console.log(`
\x1b[33m
⠀⠀⠀⠀⠀⠀⢀⣤⣶⣾⣿⣿⣷⣶⣤⡀
⠀⠀⠀⠀⢀⣴⣿⠟⠋⠀⠀⠙⠻⣿⣦⡀
⠀⠀⠀⣰⣿⠋⠀⠀🦁⠀⠀⠀⠙⣿⣆
⠀⠀⢰⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡆
⠀⠀⠸⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⠇
⠀⠀⠀⠹⣿⣦⡀⠀⠀⠀⠀⢀⣴⣿⠏
⠀⠀⠀⠀⠈⠻⣿⣶⣤⣤⣶⣿⠟⠁

     CREATED BY
 SULTAN SHIRZOI PANJSHIRI

\x1b[0m
`);

  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    logger: Pino({ level: "silent" }),
    browser: ["Ubuntu", "Chrome", "120.0.0"],
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, pairingCode } = update;

    console.log("STATE:", connection);

    // 🔥 Pairing Code
    if (pairingCode) {
      console.log("\n🔑 YOUR PAIRING CODE:");
      console.log("👉", pairingCode);
      console.log("\n📱 داخل WhatsApp برو:");
      console.log("Linked devices > Link with phone number > Enter code\n");
    }

    if (connection === "open") {
      reconnecting = false;
      console.log("✔️ CONNECTED SUCCESSFULLY");
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;

      const shouldReconnect = code !== DisconnectReason.loggedOut;

      if (!shouldReconnect) {
        console.log("❌ LOGGED OUT");
        return;
      }

      if (reconnecting) return;
      reconnecting = true;

      console.log("♻️ reconnecting...");

      setTimeout(() => {
        reconnecting = false;
        start();
      }, 4000);
    }
  });

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

      console.log("MSG ERROR:", e);

    }
  });

  // 🔥 گرفتن شماره و ساخت Pairing Code
  const phone = await question(
    "📞 Enter your WhatsApp number (example: 937xxxxxxxx): "
  );

  rl.close();

  try {

    const code = await sock.requestPairingCode(phone);

    console.log("\n🔑 Pairing Code:", code);

  } catch (e) {

    console.log("❌ Error generating code:", e);

  }
}

process.on("uncaughtException", console.log);
process.on("unhandledRejection", console.log);

start();