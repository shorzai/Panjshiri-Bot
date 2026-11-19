import express from "express";
import next from "next";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import fs from "fs";
import Pino from "pino";
import { MongoClient } from "mongodb";
import { notifyOwner } from "./lib/notify.js";

import shadow from "./lib/shadow.js";
import welcome from "./lib/welcome.js";
import goodbye from "./lib/goodbye.js";
import autoread from "./lib/autoread.js";
import anticall from "./lib/anticall.js";
import capsuleRunner from "./lib/capsule.js";
import spy from "./lib/spy.js";

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

function log(...args) { console.log("[RAEES SULTAN BOT]", ...args); }

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
        log("Restoring ALL saved sessions from MongoDB...");
        const sessions = await authCollection.distinct("sessionId");
        log(`Found ${sessions.length} saved users. Reconnecting...`);

        for (let i = 0; i < sessions.length; i++) {
            const sessionId = sessions[i];
            if (!activeSockets.has(sessionId)) {
                log(`Auto-restoring user session: ${sessionId}`);
                await startSocket(sessionId).catch(e => console.error(`Failed to restore ${sessionId}:`, e.message));
                await new Promise(r => setTimeout(r, 2000)); 
            }
        }
        log("✅ All users restored successfully.");
    } catch (err) {
        console.error("Restore sessions error:", err);
    }
}

async function loadMessageHandler() {
    const handlerPath = path.resolve("./handler.js");
    if (!fs.existsSync(handlerPath)) { log("❌ handler.js NOT FOUND!"); return; }
    try {
        const imported = await import(`${handlerPath}?update=${Date.now()}`);
        if (typeof imported.default !== "function") { log("❌ handler.js invalid format!"); return; }
        messageHandler = imported.default;
        handlerReady = true;
        handlerStatus = "ready";
        log("✅ Handler loaded successfully.");
    } catch (error) {
        handlerReady = false;
        handlerStatus = "error";
        console.error("❌ Error loading handler.js:\n", error.message);
    }
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
    const state = {
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
                        if (value) operations.push(writeData(keyId, value));
                        else operations.push(authCollection.deleteOne({ sessionId, keyId }));
                    }
                }
                await Promise.all(operations);
            }
        }
    };
    return { state, saveCreds: () => writeData("creds", state.creds) };
}

function getMessageText(message) {
    if (!message?.message) return "";
    const content = message.message.ephemeralMessage?.message || message.message.viewOnceMessage?.message || message.message.viewOnceMessageV2?.message || message.message.documentWithCaptionMessage?.message || message.message;
    if (!content) return "";
    return (content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || content.videoMessage?.caption || content.documentMessage?.caption || content.buttonsResponseMessage?.selectedButtonId || content.listResponseMessage?.singleSelectReply?.selectedRowId || content.templateButtonReplyMessage?.selectedId || "");
}

// 🚨 اینجا فیلتر fromMe کاملاً حذف شد تا دستورات خودت هم اجرا بشن
async function processMessage(sock, message, sessionId) {
    try {
        if (!message?.message) return;
        const from = message.key?.remoteJid;
        if (!from) return;
        const body = getMessageText(message);
        if (!body) return;
        
        log(`📩 [${sessionId}] RECEIVED: "${body}" from ${from}`);

        if (body.trim() === "!ping" || body.trim() === ".ping") {
            await sock.sendMessage(from, { text: "🏓 Pong! (Direct Test)" }, { quoted: message });
            log(`✅ Replied to !ping directly.`);
        }

        if (typeof messageHandler === "function") {
            try {
                await messageHandler(sock, from, body, message);
            } catch (execError) {
                console.error("❌ ERROR INSIDE HANDLER:", execError.message);
            }
        } else {
            log("❌ Message handler is NOT LOADED.");
        }
    } catch (error) {
        console.error("❌ MSG ERROR:", error);
    }
}

function clearReconnectTimer(sessionId) { const timer = reconnectTimers.get(sessionId); if (timer) { clearTimeout(timer); reconnectTimers.delete(sessionId); } }

function scheduleReconnect(sessionId, oldSocket = null) {
    if (oldSocket && activeSockets.get(sessionId) === oldSocket) activeSockets.delete(sessionId);
    if (oldSocket?.__noReconnect) return;
    if (activeSockets.has(sessionId) || reconnectTimers.has(sessionId)) return;
    const attempt = (reconnectAttempts.get(sessionId) || 0) + 1;
    reconnectAttempts.set(sessionId, attempt);
    const delay = Math.min(attempt * 5000, 60000);
    log(`Reconnect attempt ${attempt} for ${sessionId} in ${Math.round(delay / 1000)} seconds`);
    const timer = setTimeout(async () => {
        reconnectTimers.delete(sessionId);
        if (activeSockets.has(sessionId)) return;
        try { await startSocket(sessionId); } catch (error) { scheduleReconnect(sessionId); }
    }, delay);
    reconnectTimers.set(sessionId, timer);
}

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
            browser: ["Ubuntu", "Chrome", "120.0.0"],
            markOnlineOnConnect: true, syncFullHistory: false,
            generateHighQualityLinkPreview: true, connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000, keepAliveIntervalMs: 25000
        });

        sock.sessionId = sessionId;
        sock.__noReconnect = false;
        sock.__pairingCodeSent = false;
        activeSockets.set(sessionId, sock);

        sock.ev.on("creds.update", async () => { try { await saveCreds(); } catch (error) { console.error("Save credentials error:", error); } });

        try {
            shadow(sock); welcome(sock); goodbye(sock);
            autoread(sock); anticall(sock); capsuleRunner(sock); spy(sock);
            log(`✅ Auto systems started for: ${sessionId}`);
        } catch (autoErr) { console.error(`❌ Auto systems error:`, autoErr.message); }
        
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== "notify" && type !== "append") return;
            for (const message of messages || []) { await processMessage(sock, message, sessionId); }
        });

        sock.ev.on("connection.update", async update => {
            const { connection, qr, lastDisconnect } = update;
            
            if (qr && !state.creds.registered && !sock.__pairingCodeSent) {
                const waiter = pairingWaiters.get(sessionId);
                if (waiter) {
                    try {
                        log(`WhatsApp signal received, generating code for ${sessionId}...`);
                        const code = await sock.requestPairingCode(sessionId);
                        sock.__pairingCodeSent = true;
                        clearTimeout(waiter.timeout);
                        pairingWaiters.delete(sessionId);
                        waiter.resolve(code);
                        log(`Pairing code generated: ${sessionId}. WAITING FOR USER...`);
                    } catch (error) {
                        clearTimeout(waiter.timeout);
                        pairingWaiters.delete(sessionId);
                        waiter.reject(error);
                    }
                }
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
                try { await notifyOwner(sock); } catch (notifyErr) {}
            }
            
            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                log(`WhatsApp connection closed: ${sessionId}`, statusCode || "");
                const waiter = pairingWaiters.get(sessionId);
                if (waiter) {
                    clearTimeout(waiter.timeout);
                    pairingWaiters.delete(sessionId);
                    waiter.reject(new Error("اتصال قطع شد."));
                }
                if (statusCode === DisconnectReason.loggedOut) {
                    activeSockets.delete(sessionId);
                    reconnectAttempts.delete(sessionId);
                    try { if (authCollection) await authCollection.deleteMany({ sessionId }); } catch (dbErr) {}
                    return;
                }
                if (state.creds.registered || sock.__pairingCodeSent) { scheduleReconnect(sessionId, sock); }
                else { if (activeSockets.get(sessionId) === sock) activeSockets.delete(sessionId); }
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

    try { if (authCollection) await authCollection.deleteMany({ sessionId: phoneNumber }); } catch (e) {}

    if (activeSockets.has(phoneNumber)) {
        try { activeSockets.get(phoneNumber).__noReconnect = true; activeSockets.get(phoneNumber).end(undefined); } catch(e) {}
        activeSockets.delete(phoneNumber);
    }
    if (pairingWaiters.has(phoneNumber)) return res.status(409).json({ success: false, message: "در حال اجرا است." });

    try {
        const codePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => { pairingWaiters.delete(phoneNumber); reject(new Error("زمان تمام شد.")); }, 60000);
            pairingWaiters.set(phoneNumber, { resolve, reject, timeout });
        });
        await startSocket(phoneNumber);
        const pairingCode = await codePromise;
        return res.json({ success: true, phoneNumber, code: pairingCode });
    } catch (error) {
        const waiter = pairingWaiters.get(phoneNumber);
        if (waiter) { clearTimeout(waiter.timeout); pairingWaiters.delete(phoneNumber); }
        return res.status(500).json({ success: false, message: error.message });
    }
});

app.use((req, res) => {
    if (!nextReady) return res.status(503).send("Starting...");
    return nextHandler(req, res);
});

async function initializeServices() {
    const nextTask = (async () => { try { await nextApp.prepare(); nextReady = true; nextStatus = "ready"; } catch (e) {} })();
    const handlerTask = (async () => { try { await loadMessageHandler(); } catch (e) {} })();
    const mongoTask = (async () => { try { await connectMongo(); await restoreSessions(); } catch (e) {} })();
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
    } catch (e) {}
}, 14 * 60 * 1000);

process.on("unhandledRejection", error => console.error("Unhandled Rejection:", error));
process.on("uncaughtException", error => console.error("Uncaught Exception:", error));
