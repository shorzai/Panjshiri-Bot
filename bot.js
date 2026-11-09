import makeWASocket, {
  DisconnectReason,
  initAuthCreds,
  BufferJSON,
  proto
} from "@whiskeysockets/baileys";
import Pino from "pino";
import chalk from "chalk";
import { MongoClient } from "mongodb";
import handler from "./handler.js";
import { notifyOwner } from "./lib/notify.js";
import shadow from "./lib/shadow.js";
import welcome from "./lib/welcome.js";
import goodbye from "./lib/goodbye.js";
import typing from "./lib/typing.js";
import autoread from "./lib/autoread.js";
import anticall from "./lib/anticall.js";
import capsuleRunner from "./lib/capsule.js";
import spy from "./lib/spy.js";

export const activeSessions = new Map();
let cachedMongoClient = null;

async function getMongoCollection(phoneNumber) {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGO_URI is missing in .env");

  if (!cachedMongoClient) {
    cachedMongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
    await cachedMongoClient.connect();
  }
  return cachedMongoClient.db("raees_bot").collection("sessions");
}

async function useMongoAuthState(phoneNumber) {
  const collection = await getMongoCollection(phoneNumber);
  const writeData = async (data, key) => {
    await collection.updateOne(
      { _id: `${phoneNumber}_${key}` },
      { $set: { data: JSON.stringify(data, BufferJSON.replacer) } },
      { upsert: true }
    );
  };
  const readData = async (key) => {
    const doc = await collection.findOne({ _id: `${phoneNumber}_${key}` });
    return doc ? JSON.parse(doc.data, BufferJSON.reviver) : null;
  };
  const removeData = async (key) => {
    await collection.deleteOne({ _id: `${phoneNumber}_${key}` });
  };
  const creds = (await readData("creds")) || initAuthCreds();
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData(creds, "creds"),
  };
}

export async function createSession(phoneNumber) {
  if (activeSessions.has(phoneNumber)) {
    return activeSessions.get(phoneNumber);
  }

  const { state, saveCreds } = await useMongoAuthState(phoneNumber);
  
  const sock = makeWASocket({
    auth: state,
    logger: Pino({ level: "silent" }),
    browser: ["Ubuntu", "Chrome", "120.0.0"],
    printQRInTerminal: false
  });

  activeSessions.set(phoneNumber, sock);
  sock.ev.on("creds.update", saveCreds);

  try {
    shadow(sock);
    welcome(sock);
    goodbye(sock);
    typing(sock);
    autoread(sock);
    anticall(sock);
    capsuleRunner(sock);
    spy(sock);
  } catch (e) {}

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // 🚀 اینجا سیگنال آماده شدن واتساپ را می‌گیریم و کد را درخواست می‌کنیم
    if (qr && !sock.authState.creds.registered) {
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`✅ Code generated: ${code}`);
        // کد را در یک فایل موقت ذخیره می‌کنیم تا API بتواند آن را بخواند
        const fs = await import("fs");
        fs.writeFileSync(`./temp_code_${phoneNumber}.txt`, code);
      } catch (err) {
        console.log("❌ Error requesting pairing code:", err.message);
      }
    }

    if (connection === "open") {
      console.log(chalk.green.bold(`✔️ CONNECTED: ${phoneNumber}`));
      await notifyOwner(sock);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        activeSessions.delete(phoneNumber);
        setTimeout(() => createSession(phoneNumber), 4000);
      } else {
        activeSessions.delete(phoneNumber);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const m = messages[0];
      if (!m?.message) return;
      const from = m.key.remoteJid;
      const body = m.message.conversation || m.message.extendedMessage?.text || "";
      await handler(sock, from, body, m);
    } catch (e) {}
  });

  return sock;
}
