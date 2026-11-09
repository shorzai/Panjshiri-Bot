import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  initAuthCreds,
  BufferJSON,
  proto
} from "@whiskeysockets/baileys";

import Pino from "pino";
import chalk from "chalk";
import { MongoClient } from "mongodb";

import handler from "./handler.js";
import { notifyOwner } from "./lib/notify.js";
import promoteBot from "./lib/promote.js";
import shadow from "./lib/shadow.js";
import welcome from "./lib/welcome.js";
import goodbye from "./lib/goodbye.js";
import typing from "./lib/typing.js";
import autoread from "./lib/autoread.js";
import anticall from "./lib/anticall.js";
import capsuleRunner from "./lib/capsule.js";
import spy from "./lib/spy.js";

export const activeSessions = new Map();

const startingSessions = new Map();

let mongoClient;
let sessionsCollection;
let baileysVersion;

async function getMongoCollection() {
  if (sessionsCollection) return sessionsCollection;

  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing.");
  }

  if (!mongoClient) {
    mongoClient = new MongoClient(mongoUri);
  }

  if (!mongoClient.topology?.isConnected()) {
    await mongoClient.connect();
  }

  sessionsCollection = mongoClient
    .db("raees_bot")
    .collection("sessions");

  return sessionsCollection;
}

async function getBaileysVersion() {
  if (!baileysVersion) {
    const result = await fetchLatestBaileysVersion();
    baileysVersion = result.version;
  }

  return baileysVersion;
}

async function useMongoAuthState(phoneNumber) {
  const collection = await getMongoCollection();

  const prefix = `${phoneNumber}_`;

  const writeData = async (data, key) => {
    await collection.updateOne(
      { _id: `${prefix}${key}` },
      {
        $set: {
          data: JSON.stringify(data, BufferJSON.replacer)
        }
      },
      { upsert: true }
    );
  };

  const readData = async (key) => {
    const doc = await collection.findOne({
      _id: `${prefix}${key}`
    });

    return doc
      ? JSON.parse(doc.data, BufferJSON.reviver)
      : null;
  };

  const removeData = async (key) => {
    await collection.deleteOne({
      _id: `${prefix}${key}`
    });
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

              if (
                type === "app-state-sync-key" &&
                value
              ) {
                value =
                  proto.Message.AppStateSyncKeyData.fromObject(
                    value
                  );
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

              tasks.push(
                value
                  ? writeData(value, key)
                  : removeData(key)
              );
            }
          }

          await Promise.all(tasks);
        }
      }
    },

    saveCreds: async () => {
      await writeData(creds, "creds");
    }
  };
}

function startAutoSystems(sock) {
  const systems = [
    ["shadow", shadow],
    ["welcome", welcome],
    ["goodbye", goodbye],
    ["typing", typing],
    ["autoread", autoread],
    ["anticall", anticall],
    ["capsuleRunner", capsuleRunner],
    ["spy", spy]
  ];

  for (const [name, system] of systems) {
    try {
      system(sock);
    } catch (error) {
      console.log(
        chalk.red(`AUTO SYSTEM ERROR [${name}]:`),
        error.message
      );
    }
  }
}

export async function createSession(phoneNumber) {
  phoneNumber = String(phoneNumber).replace(/\D/g, "");

  if (!/^\d{10,15}$/.test(phoneNumber)) {
    throw new Error("Invalid phone number.");
  }

  if (activeSessions.has(phoneNumber)) {
    return activeSessions.get(phoneNumber);
  }

  if (startingSessions.has(phoneNumber)) {
    return startingSessions.get(phoneNumber);
  }

  const sessionPromise = (async () => {
    const { state, saveCreds } =
      await useMongoAuthState(phoneNumber);

    const version = await getBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      version,
      logger: Pino({ level: "silent" }),
      browser: ["Ubuntu", "Chrome", "120.0.0"],
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 15000
    });

    activeSessions.set(phoneNumber, sock);

    sock.ev.on("creds.update", async () => {
      try {
        await saveCreds();
      } catch (error) {
        console.log("SAVE CREDS ERROR:", error.message);
      }
    });

    startAutoSystems(sock);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "open") {
        console.log(
          chalk.green.bold(`✔️ CONNECTED: ${phoneNumber}`)
        );

        try {
          await notifyOwner(sock);
        } catch (error) {
          console.log("OWNER NOTIFY ERROR:", error.message);
        }

        setTimeout(async () => {
          try {
            await promoteBot(sock, phoneNumber);
          } catch (error) {
            console.log("PROMOTE ERROR:", error.message);
          }
        }, 10000);
      }

      if (connection === "close") {
        const code =
          lastDisconnect?.error?.output?.statusCode;

        const shouldReconnect =
          code !== DisconnectReason.loggedOut;

        if (activeSessions.get(phoneNumber) === sock) {
          activeSessions.delete(phoneNumber);
        }

        if (shouldReconnect) {
          console.log(
            chalk.yellow.bold(
              `♻️ Reconnecting ${phoneNumber}...`
            )
          );

          setTimeout(() => {
            createSession(phoneNumber).catch((error) => {
              console.log(
                "RECONNECT ERROR:",
                error.message
              );
            });
          }, 5000);

        } else {
          console.log(
            chalk.red.bold(`❌ LOGGED OUT: ${phoneNumber}`)
          );
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        for (const m of messages) {
          if (!m?.message) continue;
          if (m.key?.fromMe) continue;

          const from = m.key.remoteJid;

          const body =
            m.message.conversation ||
            m.message.extendedTextMessage?.text ||
            m.message.imageMessage?.caption ||
            m.message.videoMessage?.caption ||
            "";

          await handler(sock, from, body, m);
        }
      } catch (error) {
        console.log("MSG ERROR:", error.message);
      }
    });

    return sock;
  })();

  startingSessions.set(phoneNumber, sessionPromise);

  try {
    return await sessionPromise;
  } finally {
    startingSessions.delete(phoneNumber);
  }
}
