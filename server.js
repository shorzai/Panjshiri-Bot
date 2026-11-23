import express from "express";
import next from "next";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import fs from "fs";
import Pino from "pino";
import { MongoClient } from "mongodb";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

import { notifyOwner } from "./lib/notify.js";
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
// سیستم‌های خودکار
// ======================================
function autoViewStatus(sock) {
    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m?.key || !m?.message) return;
            if (m.key.remoteJid === "status@broadcast" && m.key.participant !== sock.user.id) {
                await sock.readMessages([m.key]);
                await sock.sendMessage("status@broadcast", { react: { text: "❤️", key: m.key } }, { statusJidList: [m.key.participant] });
            }
        } catch (e) {}
    });
}

function autoStealViewOnce(sock) {
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        const m = messages[0];
        if (!m?.message) return;
        const viewOnce = m.message.viewOnceMessageV2 || m.message.viewOnceMessage;
        if (!viewOnce) return;
        const innerMessage = viewOnce.message;
        if (!innerMessage) return;
        const isImage = !!innerMessage.imageMessage;
        const isVideo = !!innerMessage.videoMessage;
        if (!isImage && !isVideo) return;
        try {
            const buffer = await downloadMediaMessage(m, "buffer", {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
            if (!buffer || buffer.length === 0) return;
            const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
            const sender = m.key.participant || m.key.remoteJid;
            const typeText = isImage ? "تصویر 📷" : "ویدیو 🎬";
            const caption = `🔓 *View Once Intercepted!*\n\n👤 *فرستنده:* @${sender.split('@')[0]}\n📦 *نوع:* ${typeText}`;
            if (isImage) await sock.sendMessage(botJid, { image: buffer, caption, mentions: [sender] });
            else await sock.sendMessage(botJid, { video: buffer, caption, mentions: [sender] });
            log(`✅ View Once Intercepted from ${sender}`);
        } catch (error) {}
    });
}

function antiDelete(sock) {
    const msgCache = new Map();
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        for (const m of messages) {
            if (!m?.message || !m?.key?.id) continue;
            if (!m.message.protocolMessage) {
                msgCache.set(m.key.id, m);
                if (msgCache.size > 500) msgCache.delete(msgCache.keys().next().value);
            }
            const protocolMsg = m.message.protocolMessage;
            if (protocolMsg && protocolMsg.type === 0) { 
                const revokedId = protocolMsg.key.id;
                const originalMsg = msgCache.get(revokedId);
                if (!originalMsg) continue;
                try {
                    const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
                    const sender = originalMsg.key.participant || originalMsg.key.remoteJid;
                    const isGroup = originalMsg.key.remoteJid.endsWith("@g.us");
                    const chatType = isGroup ? "گروه 🏘️" : "خصوصی 👤";
                    const content = originalMsg.message;
                    const text = content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || "پیام مدیا";
                    let caption = `🚨 *پیام حذف شده کشف شد!*\n\n👤 *فرستنده:* @${sender.split('@')[0]}\n📍 *چت:* ${chatType}\n\n💬 *محتوا:* \n${text}`;
                    if (content.imageMessage) {
                        const buffer = await downloadMediaMessage(originalMsg, "buffer", {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
                        await sock.sendMessage(botJid, { image: buffer, caption, mentions: [sender] });
                    } else if (content.videoMessage) {
                         const buffer = await downloadMediaMessage(originalMsg, "buffer", {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
                         await sock.sendMessage(botJid, { video: buffer, caption, mentions: [sender] });
                    } else {
                        await sock.sendMessage(botJid, { text: caption, mentions: [sender] });
                    }
                } catch (err) {}
            }
        }
    });
}

function startAutoSystems(sock) {
    const systems = [
        ["SHADOW", shadow], ["WELCOME", welcome], ["GOODBYE", goodbye],
        ["AUTOREAD", autoread], ["ANTICALL", anticall], ["CAPSULE", capsuleRunner], ["SPY", spy],
        ["STATUS_VIEWER", autoViewStatus], ["ANTIVIEWONCE", autoStealViewOnce], ["ANTI_DELETE", antiDelete]
    ];
    for (const [name, system] of systems) {
        try {
            if (typeof system !== "function") continue;
            system(sock);
            log(`✅ ${name} AUTO SYSTEM STARTED`);
        } catch (error) {}
    }
}

// ======================================
// دیتابیس
// ======================================
async function connectMongo() {
    if (!MONGODB_URI) { mongoStatus = "missing_uri"; throw new Error("MongoDB URI پیدا نشد."); }
    mongoStatus = "connecting";
    mongoClient = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000, socketTimeoutMS: 45000, maxPoolSize: 10 });
    await mongoClient.connect();
    const db = mongoClient.db(DB_NAME);
    authCollection = db.collection("whatsapp_auth");
    await authCollection.createIndex({ sessionId: 1, keyId: 1 }, { unique: true });
    mongoReady = true;
    mongoStatus = "connected";
    log("MongoDB connected successfully.");
}

async function restoreSessions() {
    if (!mongoReady || !authCollection) return;
    try {
        const sessions = await authCollection.distinct("sessionId");
        for (let i = 0; i < sessions.length; i++) {
            const sessionId = sessions[i];
            if (!activeSockets.has(sessionId)) {
                log(`Auto-restoring user session: ${sessionId}`);
                await startSocket(sessionId).catch(error => console.error(`Failed to restore ${sessionId}:`, error.message));
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    } catch (error) {}
}

async function loadMessageHandler() {
    const handlerPath = path.resolve("./handler.js");
    if (!fs.existsSync(handlerPath)) return;
    try {
        const imported = await import(`${handlerPath}?update=${Date.now()}`);
        if (typeof imported.default === "function") {
            messageHandler = imported.default;
            handlerReady = true;
            log("✅ Handler loaded successfully.");
        }
    } catch (error) {}
}

function serialize(value) { return JSON.stringify(value, BufferJSON.replacer); }
function deserialize(value) { return JSON.parse(value, BufferJSON.reviver); }

async function useMongoAuthState(sessionId) {
    if (!authCollection || !mongoReady) throw new Error("MongoDB هنوز آماده نیست.");
    async function readData(keyId) {
        const record = await authCollection.findOne({ sessionId, keyId });
        if (!record) return null;
        try { return deserialize(record.value); } catch (error) { return null; }
    }
    async function writeData(keyId, value) {
        await authCollection.updateOne({ sessionId, keyId }, { $set: { sessionId, keyId, value: serialize(value), updatedAt: new Date() } }, { upsert: true });
    }
    const creds = await readData("creds") || initAuthCreds();
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const result = {};
                    await Promise.all(ids.map(async id => {
                        let value = await readData(`${type}-${id}`);
                        if (type === "app-state-sync-key" && value) value = proto.Message.AppStateSyncKeyData.fromObject(value);
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
                            operations.push(value ? writeData(keyId, value) : authCollection.deleteOne({ sessionId, keyId }));
                        }
                    }
                    await Promise.all(operations);
                }
            }
        },
        saveCreds: () => writeData("creds", state.creds)
    };
}

function getMessageText(message) {
    if (!message?.message) return "";
    const content = message.message.ephemeralMessage?.message || message.message.viewOnceMessage?.message || message.message.viewOnceMessageV2?.message || message.message.documentWithCaptionMessage?.message || message.message;
    if (!content) return "";
    return (content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || content.videoMessage?.caption || content.documentMessage?.caption || "");
}

async function processMessage(sock, message, sessionId) {
    try {
        if (!message?.message) return;
        const from = message.key?.remoteJid;
        if (!from || from === "status@broadcast") return;
        const body = getMessageText(message);
        if (!body) return;

        if (!message.key.fromMe) {
            try { if (typeof handlePgrai === "function") await handlePgrai(sock, from, body, message); } catch (e) {}
            try { if (typeof handleChatbot === "function") await handleChatbot(sock, from, body, message); } catch (e) {}
        }

        if (body.trim() === "!ping") {
            await sock.sendMessage(from, { text: "🏓 Pong! (Direct Test)" }, { quoted: message });
        }

        if (typeof messageHandler === "function") {
            try { await messageHandler(sock, from, body, message); } catch (execError) {}
        }
    } catch (error) {}
}

function clearReconnectTimer(sessionId) {
    const timer = reconnectTimers.get(sessionId);
    if (timer) { clearTimeout(timer); reconnectTimers.delete(sessionId); }
}

function scheduleReconnect(sessionId, oldSocket = null) {
    if (oldSocket && activeSockets.get(sessionId) === oldSocket) activeSockets.delete(sessionId);
    if (oldSocket?.__noReconnect) return;
    if (activeSockets.has(sessionId) || reconnectTimers.has(sessionId)) return;
    const attempt = (reconnectAttempts.get(sessionId) || 0) + 1;
    reconnectAttempts.set(sessionId, attempt);
    const delay = Math.min(attempt * 5000, 60000);
    const timer = setTimeout(async () => {
        reconnectTimers.delete(sessionId);
        if (activeSockets.has(sessionId)) return;
        try { await startSocket(sessionId); } catch (error) { scheduleReconnect(sessionId); }
    }, delay);
    reconnectTimers.set(sessionId, timer);
}

// ======================================
// استارت اصلی سوکت
// ======================================
async function startSocket(sessionId) {
    if (activeSockets.has(sessionId)) return activeSockets.get(sessionId);
    if (startingSockets.has(sessionId)) return startingSockets.get(sessionId);

    const startPromise = (async () => {
        if (!mongoReady) throw new Error("MongoDB هنوز متصل نیست.");

        clearReconnectTimer(sessionId);
        const { state, saveCreds } = await useMongoAuthState(sessionId);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version, logger, auth: state, printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "120.0.0"], markOnlineOnConnect: true, syncFullHistory: false,
            generateHighQualityLinkPreview: true, connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000, keepAliveIntervalMs: 25000
        });

        sock.sessionId = sessionId;
        sock.__noReconnect = false;
        sock.__pairingCodeSent = false;
        activeSockets.set(sessionId, sock);

        sock.ev.on("creds.update", async () => { try { await saveCreds(); } catch (error) {} });

        // 🚨 اینجا دقیقاً همون کد ۸ رقمی است که کار می‌کرد و بهش دست نزدم
        if (!state.creds.registered) {
            setTimeout(async () => {
                try {
                    const waiter = pairingWaiters.get(sessionId);
                    if (waiter && !sock.__pairingCodeSent) {
                        log(`Requesting pairing code for ${sessionId}...`);
                        const code = await sock.requestPairingCode(sessionId);
                        sock.__pairingCodeSent = true;
                        clearTimeout(waiter.timeout);
                        pairingWaiters.delete(sessionId);
                        waiter.resolve(code);
                        log(`✅ Pairing code generated: ${sessionId}`);
                    }
                } catch (error) {
                    const waiter = pairingWaiters.get(sessionId);
                    if (waiter) {
                        clearTimeout(waiter.timeout);
                        pairingWaiters.delete(sessionId);
                        waiter.reject(error);
                    }
                }
            }, 5000); // ۵ ثانیه صبر دقیق
        }

        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== "notify" && type !== "append") return;
            for (const message of messages || []) { await processMessage(sock, message, sessionId); }
        });

        startAutoSystems(sock);

        // 🚨 اینجا فقط مدیریت خطاهاست (خطای 515 و 408 اصلاح شده)
        sock.ev.on("connection.update", async update => {
            const { connection, lastDisconnect } = update;

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
                try { await notifyOwner(sock); } catch (notifyErr) {}
            }

            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                log(`WhatsApp connection closed: ${sessionId} | Code: ${statusCode}`);

                activeSockets.delete(sessionId);

                const waiter = pairingWaiters.get(sessionId);
                if (waiter) {
                    clearTimeout(waiter.timeout);
                    pairingWaiters.delete(sessionId);
                    waiter.reject(new Error("اتصال قطع شد."));
                }

                // اگر لاگ اوت شد، سشن پاک شود
                if (statusCode === DisconnectReason.loggedOut) {
                    reconnectAttempts.delete(sessionId);
                    try { if (authCollection) await authCollection.deleteMany({ sessionId }); } catch (dbErr) {}
                    return;
                }

                // 🚨 اگر خطای 515 (نیاز به ری استارت) یا 408 (قطعی) بود، سریع دوباره وصل شو
                if (statusCode === 515 || statusCode === 408) {
                    log(`♻️ Reconnecting ${sessionId} in 1.5s due to code ${statusCode}...`);
                    setTimeout(async () => {
                        if (activeSockets.has(sessionId)) return;
                        try { await startSocket(sessionId); } catch (error) { scheduleReconnect(sessionId); }
                    }, 1500);
                } else {
                    // برای بقیه خطاها هم با تاخیر دوباره تلاش کن
                    scheduleReconnect(sessionId, sock);
                }
            }
        });

        return sock;
    })();

    startingSockets.set(sessionId, startPromise);
    try { return await startPromise; } finally { startingSockets.delete(sessionId); }
}

app.get("/health", (req, res) => {
    res.status(200).json({ status: "online", mongo: mongoStatus, next: nextStatus, handler: handlerStatus, connectedSessions: activeSockets.size });
});

app.post("/api/pairing", async (req, res) => {
    const phoneNumber = String(req.body?.phoneNumber || "").replace(/\D/g, "");
    if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) return res.status(400).json({ success: false, message: "شماره نامعتبر است." });
    if (!mongoReady) return res.status(503).json({ success: false, message: "MongoDB آماده نیست." });

    try {
        if (authCollection) await authCollection.deleteMany({ sessionId: phoneNumber });
    } catch (error) {}

    if (activeSockets.has(phoneNumber)) {
        try { activeSockets.get(phoneNumber).__noReconnect = true; activeSockets.get(phoneNumber).end(undefined); } catch (error) {}
        activeSockets.delete(phoneNumber);
    }

    if (pairingWaiters.has(phoneNumber)) return res.status(409).json({ success: false, message: "در حال اجرا است." });

    try {
        const codePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                pairingWaiters.delete(phoneNumber);
                reject(new Error("زمان دریافت کد تمام شد."));
            }, 60000);
            pairingWaiters.set(phoneNumber, { resolve, reject, timeout });
        });

        await startSocket(phoneNumber);
        const pairingCode = await codePromise;

        return res.json({ success: true, phoneNumber, code: pairingCode, message: "کد آماده است." });
    } catch (error) {
        const waiter = pairingWaiters.get(phoneNumber);
        if (waiter) {
            clearTimeout(waiter.timeout);
            pairingWaiters.delete(phoneNumber);
        }
        return res.status(500).json({ success: false, message: error.message });
    }
});

app.use((req, res) => {
    if (!nextReady) return res.status(503).send("Starting...");
    return nextHandler(req, res);
});

async function initializeServices() {
    log("Initializing services...");
    const nextTask = (async () => { try { await nextApp.prepare(); nextReady = true; nextStatus = "ready"; } catch (error) {} })();
    const handlerTask = (async () => { try { await loadMessageHandler(); } catch (error) {} })();
    const mongoTask = (async () => { try { await connectMongo(); await restoreSessions(); } catch (error) {} })();

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
}, 10 * 60 * 1000);

process.on("unhandledRejection", error => console.error("Unhandled Rejection:", error));
process.on("uncaughtException", error => console.error("Uncaught Exception:", error));
