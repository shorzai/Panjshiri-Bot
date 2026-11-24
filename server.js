import express from "express";
import next from "next";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import fs from "fs";
import Pino from "pino";
import { MongoClient } from "mongodb";
import { notifyOwner } from "./lib/notify.js";
import jwt from "jsonwebtoken"; // 🚨 اضافه شد برای امنیت

import shadow from "./lib/shadow.js";
import welcome from "./lib/welcome.js";
import goodbye from "./lib/goodbye.js";
import autoread from "./lib/autoread.js";
import anticall from "./lib/anticall.js";
import capsuleRunner from "./lib/capsule.js";
import spy from "./lib/spy.js";

import { handlePgrai } from "./commands/pgrai.js";
import { handleChatbot } from "./commands/chatbot.js";

import makeWASocket, {
    fetchLatestBaileysVersion,
    initAuthCreds,
    BufferJSON,
    proto,
    DisconnectReason
} from "@whiskeysockets/baileys";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const DB_NAME = process.env.MONGODB_DB || process.env.MONGO_DB || "raees_sultan_bot";
const JWT_SECRET = process.env.JWT_SECRET || "RAEES_SUPER_SECRET_KEY"; // 🚨 اضافه شد

const MONGODB_URI = [
    process.env.MONGODB_URI,
    process.env.MONGO_URI,
    process.env.MONGODB_URL,
    process.env.MONGO_URL,
    process.env.DATABASE_URL
].find(value => typeof value === "string" && value.trim());

const logger = Pino({ level: "silent" });
const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: "2mb" }));

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

let mongoClient = null;
let authCollection = null;
let messageHandler = null;
let mongoReady = false;
let nextReady = false;
let handlerReady = false;
let mongoStatus = "disconnected";
let nextStatus = "starting";
let handlerStatus = "starting";
let initializationError = null;

const activeSockets = new Map();
const startingSockets = new Map();
const reconnectTimers = new Map();
const reconnectAttempts = new Map();
const pairingWaiters = new Map();

function log(...args) {
    console.log("[RAEES SULTAN BOT]", ...args);
}

// ======================================
// 🚨 دیدن خودکار استوری‌ها
// ======================================
function autoViewStatus(sock) {
    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m?.key || !m?.message) return;

            if (m.key.remoteJid === "status@broadcast") {
                if (m.key.participant === sock.user.id) return;

                await sock.readMessages([m.key]);

                await sock.sendMessage("status@broadcast", {
                    react: { text: "❤️", key: m.key }
                }, {
                    statusJidList: [m.key.participant]
                });

                log(`👁️ Viewed status from: ${m.key.participant.split('@')[0]}`);
            }
        } catch (e) {}
    });
}

// اجرای سیستم‌های خودکار برای هر سیشن
function startAutoSystems(sock) {
    const systems = [
        ["SHADOW", shadow],
        ["WELCOME", welcome],
        ["GOODBYE", goodbye],
        ["AUTOREAD", autoread],
        ["ANTICALL", anticall],
        ["CAPSULE", capsuleRunner],
        ["SPY", spy],
        ["STATUS_VIEWER", autoViewStatus]
    ];

    for (const [name, system] of systems) {
        try {
            if (typeof system !== "function") continue;

            const result = system(sock);

            if (result && typeof result.catch === "function") {
                result.catch(error => console.error(`❌ ${name} ERROR:`, error));
            }

            log(`✅ ${name} AUTO SYSTEM STARTED`);
        } catch (error) {
            console.error(`❌ ${name} START ERROR:`, error);
        }
    }
}

async function connectMongo() {
    if (!MONGODB_URI) {
        mongoStatus = "missing_uri";
        throw new Error("MongoDB URI پیدا نشد.");
    }

    mongoStatus = "connecting";

    mongoClient = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10
    });

    await mongoClient.connect();

    const db = mongoClient.db(DB_NAME);
    authCollection = db.collection("whatsapp_auth");

    await authCollection.createIndex(
        { sessionId: 1, keyId: 1 },
        { unique: true }
    );

    mongoReady = true;
    mongoStatus = "connected";

    log("MongoDB connected successfully.");
}

async function restoreSessions() {
    if (!mongoReady || !authCollection) return;

    try {
        log("Restoring ALL saved sessions from MongoDB...");

        const sessions = await authCollection.distinct("sessionId");

        for (let i = 0; i < sessions.length; i++) {
            const sessionId = sessions[i];

            if (!activeSockets.has(sessionId)) {
                log(`Auto-restoring user session: ${sessionId}`);

                await startSocket(sessionId).catch(error =>
                    console.error(`Failed to restore ${sessionId}:`, error.message)
                );

                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        log("✅ All users restored successfully.");
    } catch (error) {
        console.error("Restore sessions error:", error);
    }
}

async function loadMessageHandler() {
    const handlerPath = path.resolve("./handler.js");

    if (!fs.existsSync(handlerPath)) return;

    try {
        const imported = await import(`${handlerPath}?update=${Date.now()}`);

        if (typeof imported.default === "function") {
            messageHandler = imported.default;
            handlerReady = true;
            handlerStatus = "ready";
            log("✅ Handler loaded successfully.");
        }
    } catch (error) {
        handlerReady = false;
        handlerStatus = "error";

        console.error("❌ Error loading handler.js:\n", error.message);
    }
}

function serialize(value) {
    return JSON.stringify(value, BufferJSON.replacer);
}

function deserialize(value) {
    return JSON.parse(value, BufferJSON.reviver);
}

async function useMongoAuthState(sessionId) {
    if (!authCollection || !mongoReady) {
        throw new Error("MongoDB هنوز آماده نیست.");
    }

    async function readData(keyId) {
        const record = await authCollection.findOne({ sessionId, keyId });

        if (!record) return null;

        try {
            return deserialize(record.value);
        } catch (error) {
            return null;
        }
    }

    async function writeData(keyId, value) {
        await authCollection.updateOne(
            { sessionId, keyId },
            {
                $set: {
                    sessionId,
                    keyId,
                    value: serialize(value),
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
    }

    const creds = await readData("creds") || initAuthCreds();

    const state = {
        creds,

        keys: {
            get: async (type, ids) => {
                const result = {};

                await Promise.all(ids.map(async id => {
                    let value = await readData(`${type}-${id}`);

                    if (type === "app-state-sync-key" && value) {
                        value = proto.Message.AppStateSyncKeyData.fromObject(value);
                    }

                    result[id] = value;
                }));

                return result;
            },

            set: async data => {
                const operations = [];

                for (const category of Object.keys(data)) {
                    for (const id of Object.keys(data[category] || {})) {
                        const value = data[category][id];
                        const keyId = `${category}-${id}`;

                        operations.push(
                            value
                                ? writeData(keyId, value)
                                : authCollection.deleteOne({ sessionId, keyId })
                        );
                    }
                }

                await Promise.all(operations);
            }
        }
    };

    return {
        state,
        saveCreds: () => writeData("creds", state.creds)
    };
}

function getMessageText(message) {
    if (!message?.message) return "";

    const content =
        message.message.ephemeralMessage?.message ||
        message.message.viewOnceMessage?.message ||
        message.message.viewOnceMessageV2?.message ||
        message.message.documentWithCaptionMessage?.message ||
        message.message;

    if (!content) return "";

    return (
        content.conversation ||
        content.extendedTextMessage?.text ||
        content.imageMessage?.caption ||
        content.videoMessage?.caption ||
        content.documentMessage?.caption ||
        content.buttonsResponseMessage?.selectedButtonId ||
        content.listResponseMessage?.singleSelectReply?.selectedRowId ||
        content.templateButtonReplyMessage?.selectedId ||
        ""
    );
}

async function processMessage(sock, message, sessionId) {
    try {
        if (!message?.message) return;

        const from = message.key?.remoteJid;
        if (!from) return;

        if (from === "status@broadcast") return;

        const body = getMessageText(message);
        if (!body) return;

        try {
            if (typeof handlePgrai === "function") {
                await handlePgrai(sock, from, body, message);
            }
        } catch (pgraiError) {}

        try {
            if (typeof handleChatbot === "function") {
                await handleChatbot(sock, from, body, message);
            }
        } catch (chatbotError) {}

        log(`📩 [${sessionId}] RECEIVED: "${body}" from ${from}`);

        if (body.trim() === "!ping" || body.trim() === ".ping") {
            await sock.sendMessage(
                from,
                { text: "🏓 Pong! (Direct Test)" },
                { quoted: message }
            );
        }

        if (typeof messageHandler === "function") {
            try {
                await messageHandler(sock, from, body, message);
            } catch (execError) {
                console.error("❌ ERROR INSIDE HANDLER:", execError.message);
            }
        }
    } catch (error) {
        console.error("❌ MSG ERROR:", error);
    }
}

function clearReconnectTimer(sessionId) {
    const timer = reconnectTimers.get(sessionId);

    if (timer) {
        clearTimeout(timer);
        reconnectTimers.delete(sessionId);
    }
}

function scheduleReconnect(sessionId, oldSocket = null) {
    if (oldSocket && activeSockets.get(sessionId) === oldSocket) {
        activeSockets.delete(sessionId);
    }

    if (oldSocket?.__noReconnect) return;
    if (activeSockets.has(sessionId) || reconnectTimers.has(sessionId)) return;

    const attempt = (reconnectAttempts.get(sessionId) || 0) + 1;
    reconnectAttempts.set(sessionId, attempt);

    const delay = Math.min(attempt * 5000, 60000);

    const timer = setTimeout(async () => {
        reconnectTimers.delete(sessionId);

        if (activeSockets.has(sessionId)) return;

        try {
            await startSocket(sessionId);
        } catch (error) {
            scheduleReconnect(sessionId);
        }
    }, delay);

    reconnectTimers.set(sessionId, timer);
}

async function startSocket(sessionId) {
    if (activeSockets.has(sessionId)) {
        return activeSockets.get(sessionId);
    }

    if (startingSockets.has(sessionId)) {
        return startingSockets.get(sessionId);
    }

    const startPromise = (async () => {
        if (!mongoReady) {
            throw new Error("MongoDB هنوز متصل نیست.");
        }

        clearReconnectTimer(sessionId);

        const { state, saveCreds } = await useMongoAuthState(sessionId);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger,
            auth: state,
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "120.0.0"],
            markOnlineOnConnect: true,
            syncFullHistory: false,
            generateHighQualityLinkPreview: true,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000
        });

        sock.sessionId = sessionId;
        sock.__noReconnect = false;
        sock.__pairingCodeSent = false;
        activeSockets.set(sessionId, sock);

        sock.ev.on("creds.update", async () => {
            try {
                await saveCreds();
            } catch (error) {
                console.error("Save credentials error:", error);
            }
        });

        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== "notify" && type !== "append") return;

            for (const message of messages || []) {
                await processMessage(sock, message, sessionId);
            }
        });

        startAutoSystems(sock);

        sock.ev.on("connection.update", async update => {
            const { connection, lastDisconnect } = update;

            if (connection === "connecting") {
                log(`Connecting WhatsApp: ${sessionId}`);
            }

            if (connection === "open") {
                reconnectAttempts.delete(sessionId);
                clearReconnectTimer(sessionId);

                const waiter = pairingWaiters.get(sessionId);

                if (waiter) {
                    clearTimeout(waiter.timeout);
                    pairingWaiters.delete(sessionId);
                    waiter.resolve("CONNECTED");
                }

                log(`✅✅✅ WhatsApp CONNECTED successfully: ${sessionId}`);

                try {
                    await notifyOwner(sock);
                } catch (notifyErr) {
                    console.error("notifyOwner error:", notifyErr.message);
                }
            }

            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;

                log(`WhatsApp connection closed: ${sessionId}`, statusCode || "");

                if (sock.__pairingTimer) {
                    clearTimeout(sock.__pairingTimer);
                    sock.__pairingTimer = null;
                }

                const waiter = pairingWaiters.get(sessionId);

                if (waiter) {
                    clearTimeout(waiter.timeout);
                    pairingWaiters.delete(sessionId);
                    waiter.reject(new Error("اتصال قطع شد."));
                }

                if (statusCode === DisconnectReason.loggedOut) {
                    activeSockets.delete(sessionId);
                    reconnectAttempts.delete(sessionId);

                    try {
                        if (authCollection) {
                            await authCollection.deleteMany({ sessionId });
                        }
                    } catch (dbErr) {}

                    return;
                }

                if (state.creds.registered || sock.__pairingCodeSent) {
                    scheduleReconnect(sessionId, sock);
                } else {
                    if (activeSockets.get(sessionId) === sock) {
                        activeSockets.delete(sessionId);
                    }
                }
            }
        });

        // ==========================================
        // درخواست کد Pairing بعد از آماده شدن سوکت
        // ==========================================
        if (!state.creds.registered) {
            sock.__pairingTimer = setTimeout(async () => {
                const waiter = pairingWaiters.get(sessionId);

                if (
                    !waiter ||
                    sock.__pairingCodeSent ||
                    state.creds.registered ||
                    activeSockets.get(sessionId) !== sock
                ) {
                    return;
                }

                try {
                    log(`Requesting pairing code for ${sessionId}...`);

                    const code = await sock.requestPairingCode(sessionId);

                    sock.__pairingCodeSent = true;

                    clearTimeout(waiter.timeout);
                    pairingWaiters.delete(sessionId);

                    waiter.resolve(code);

                    log(`✅ PAIRING CODE GENERATED FOR ${sessionId}`);
                } catch (error) {
                    clearTimeout(waiter.timeout);
                    pairingWaiters.delete(sessionId);

                    waiter.reject(error);

                    console.error("❌ PAIRING CODE ERROR:", error);
                }
            }, 3000);
        }

        return sock;
    })();

    startingSockets.set(sessionId, startPromise);

    try {
        return await startPromise;
    } finally {
        startingSockets.delete(sessionId);
    }
}

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "online",
        mongo: mongoStatus,
        next: nextStatus,
        handler: handlerStatus,
        connectedSessions: activeSockets.size
    });
});

// ==========================================
// 🚨 مسیر پایرینگ با چک امنیتی لاگین
// ==========================================
app.post("/api/pairing", async (req, res) => {
    // 🚨 چک کردن اینکه کاربر لاگین کرده یا نه (این ۹ خط اضافه شد)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Please login first." });
    }
    try {
        jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ success: false, message: "Session expired. Please login again." });
    }

    // ⬇️ از اینجا به بعد دقیقاً کدهای خودت هست، دست نزدم ⬇️

    const phoneNumber = String(req.body?.phoneNumber || "").replace(/\D/g, "");

    if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
        return res.status(400).json({
            success: false,
            message: "شماره نامعتبر است."
        });
    }

    if (!mongoReady) {
        return res.status(503).json({
            success: false,
            message: "MongoDB آماده نیست."
        });
    }

    if (pairingWaiters.has(phoneNumber)) {
        return res.status(409).json({
            success: false,
            message: "درخواست کد برای این شماره در حال اجرا است."
        });
    }

    try {
        if (authCollection) {
            await authCollection.deleteMany({ sessionId: phoneNumber });
        }
    } catch (error) {}

    if (activeSockets.has(phoneNumber)) {
        try {
            const oldSocket = activeSockets.get(phoneNumber);
            oldSocket.__noReconnect = true;

            if (oldSocket.__pairingTimer) {
                clearTimeout(oldSocket.__pairingTimer);
            }

            oldSocket.end(undefined);
        } catch (error) {}

        activeSockets.delete(phoneNumber);
    }

    try {
        const codePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                pairingWaiters.delete(phoneNumber);
                reject(new Error("زمان دریافت کد تمام شد."));
            }, 60000);

            pairingWaiters.set(phoneNumber, {
                resolve,
                reject,
                timeout
            });
        });

        await startSocket(phoneNumber);

        const pairingCode = await codePromise;

        return res.json({
            success: true,
            phoneNumber,
            code: pairingCode,
            message: "کد آماده است."
        });
    } catch (error) {
        const waiter = pairingWaiters.get(phoneNumber);

        if (waiter) {
            clearTimeout(waiter.timeout);
            pairingWaiters.delete(phoneNumber);
        }

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.use((req, res) => {
    if (!nextReady) {
        return res.status(503).send("Starting...");
    }

    return nextHandler(req, res);
});

async function initializeServices() {
    log("Initializing services...");

    const nextTask = (async () => {
        try {
            await nextApp.prepare();
            nextReady = true;
            nextStatus = "ready";
        } catch (error) {
            console.error("Next initialization error:", error);
        }
    })();

    const handlerTask = (async () => {
        try {
            await loadMessageHandler();
        } catch (error) {
            console.error("Handler initialization error:", error);
        }
    })();

    const mongoTask = (async () => {
        try {
            await connectMongo();
            await restoreSessions();
        } catch (error) {
            console.error("MongoDB initialization error:", error);
        }
    })();

    await Promise.allSettled([nextTask, handlerTask, mongoTask]);

    log("Initialization tasks completed.");
}

server.listen(PORT, HOST, () => {
    log(`Server listening on ${HOST}:${PORT}`);
    initializeServices().catch(error => console.error(error));
});

setInterval(async () => {
    try {
        const url = process.env.RENDER_EXTERNAL_URL || `http://127.0.0.1:${PORT}`;
        await fetch(`${url}/health`);
    } catch (error) {}
}, 14 * 60 * 1000);

process.on("unhandledRejection", error => {
    console.error("Unhandled Rejection:", error);
});

process.on("uncaughtException", error => {
    console.error("Uncaught Exception:", error);
});
