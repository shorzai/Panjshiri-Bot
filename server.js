import express from "express";
import next from "next";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import fs from "fs";
import Pino from "pino";
import { MongoClient } from "mongodb";

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
const DB_NAME = process.env.MONGODB_DB || "raees_sultan_bot";
const MONGODB_URI = process.env.MONGODB_URI;

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
let nextReady = false;
let mongoReady = false;
let initializationError = null;

const activeSockets = new Map();
const reconnectTimers = new Map();
const reconnectAttempts = new Map();
const pairingWaiters = new Map();

function log(...args) {
    console.log("[RAEES SULTAN BOT]", ...args);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// -----------------------------
// MONGODB
// -----------------------------

async function connectMongo() {
    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI در Environment تنظیم نشده است.");
    }

    mongoClient = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000
    });

    await mongoClient.connect();

    const db = mongoClient.db(DB_NAME);
    authCollection = db.collection("whatsapp_auth");

    await authCollection.createIndex(
        { sessionId: 1, keyId: 1 },
        { unique: true }
    );

    mongoReady = true;
    log("MongoDB connected successfully.");
}

// -----------------------------
// LOAD HANDLER
// -----------------------------

async function loadMessageHandler() {
    const handlerPath = path.resolve("./handler.js");

    if (!fs.existsSync(handlerPath)) {
        throw new Error("فایل handler.js پیدا نشد.");
    }

    const imported = await import(
        `${handlerPath}?update=${Date.now()}`
    );

    if (typeof imported.default !== "function") {
        throw new Error(
            "handler.js باید export default function داشته باشد."
        );
    }

    messageHandler = imported.default;
    log("Message handler loaded.");
}

// -----------------------------
// MONGODB AUTH STATE
// -----------------------------

function serialize(value) {
    return JSON.stringify(value, BufferJSON.replacer);
}

function deserialize(value) {
    return JSON.parse(value, BufferJSON.reviver);
}

async function useMongoAuthState(sessionId) {
    if (!authCollection) {
        throw new Error("MongoDB هنوز آماده نیست.");
    }

    async function readData(keyId) {
        const record = await authCollection.findOne({
            sessionId,
            keyId
        });

        if (!record) return null;

        try {
            return deserialize(record.value);
        } catch (error) {
            console.error("Auth data error:", error);
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

                await Promise.all(
                    ids.map(async id => {
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

                        result[id] = value;
                    })
                );

                return result;
            },

            set: async data => {
                const operations = [];

                for (const category of Object.keys(data)) {
                    for (const id of Object.keys(data[category] || {})) {
                        const value = data[category][id];
                        const keyId = `${category}-${id}`;

                        if (value) {
                            operations.push(
                                writeData(keyId, value)
                            );
                        } else {
                            operations.push(
                                authCollection.deleteOne({
                                    sessionId,
                                    keyId
                                })
                            );
                        }
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

// -----------------------------
// MESSAGE TEXT
// -----------------------------

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

// -----------------------------
// MESSAGE HANDLER
// -----------------------------

async function processMessage(sock, message) {
    try {
        if (!message?.message) return;
        if (message.key?.fromMe) return;

        const from = message.key?.remoteJid;
        if (!from) return;

        const body = getMessageText(message);
        if (!body) return;

        if (typeof messageHandler !== "function") {
            log("Handler is not ready.");
            return;
        }

        await messageHandler(sock, from, body, message);

    } catch (error) {
        console.error("Message processing error:", error);
    }
}

// -----------------------------
// RECONNECT
// -----------------------------

function clearReconnectTimer(sessionId) {
    const timer = reconnectTimers.get(sessionId);

    if (timer) {
        clearTimeout(timer);
        reconnectTimers.delete(sessionId);
    }
}

function scheduleReconnect(sessionId, oldSocket) {
    if (activeSockets.get(sessionId) !== oldSocket) return;

    activeSockets.delete(sessionId);

    if (oldSocket.__noReconnect) return;

    if (reconnectTimers.has(sessionId)) return;

    const attempt =
        (reconnectAttempts.get(sessionId) || 0) + 1;

    reconnectAttempts.set(sessionId, attempt);

    const delay = Math.min(attempt * 5000, 60000);

    log(
        `Reconnect attempt ${attempt} in ${Math.round(delay / 1000)} seconds`
    );

    const timer = setTimeout(async () => {
        reconnectTimers.delete(sessionId);

        if (activeSockets.has(sessionId)) return;

        try {
            await startSocket(sessionId);
        } catch (error) {
            console.error("Reconnect error:", error);
            scheduleReconnect(sessionId, oldSocket);
        }
    }, delay);

    reconnectTimers.set(sessionId, timer);
}

// -----------------------------
// START WHATSAPP SOCKET
// -----------------------------

async function startSocket(sessionId) {
    if (activeSockets.has(sessionId)) {
        return activeSockets.get(sessionId);
    }

    clearReconnectTimer(sessionId);

    const { state, saveCreds } =
        await useMongoAuthState(sessionId);

    const { version } =
        await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        auth: state,

        printQRInTerminal: false,

        browser: [
            "RAEES SULTAN BOT",
            "Chrome",
            "1.0.0"
        ],

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
            await processMessage(sock, message);
        }
    });

    // Pairing code request
    if (!state.creds.registered) {
        const timer = setTimeout(async () => {
            const waiter = pairingWaiters.get(sessionId);

            if (!waiter) return;
            if (activeSockets.get(sessionId) !== sock) return;

            try {
                const code = await sock.requestPairingCode(sessionId);

                sock.__pairingCodeSent = true;

                clearTimeout(waiter.timeout);
                pairingWaiters.delete(sessionId);

                waiter.resolve(code);

                log(`Pairing code generated for ${sessionId}`);

            } catch (error) {
                clearTimeout(waiter.timeout);
                pairingWaiters.delete(sessionId);

                waiter.reject(error);
            }
        }, 4000);

        sock.__pairingTimer = timer;
    }

    sock.ev.on("connection.update", async update => {
        const { connection, lastDisconnect } = update;

        if (connection === "connecting") {
            log(`Connecting: ${sessionId}`);
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

            log(`WhatsApp connected: ${sessionId}`);
        }

        if (connection === "close") {
            const statusCode =
                lastDisconnect?.error?.output?.statusCode;

            log(
                `Connection closed: ${sessionId}`,
                statusCode || ""
            );

            if (sock.__pairingTimer) {
                clearTimeout(sock.__pairingTimer);
            }

            const waiter = pairingWaiters.get(sessionId);

            if (waiter) {
                clearTimeout(waiter.timeout);
                pairingWaiters.delete(sessionId);

                waiter.reject(
                    new Error("اتصال واتساپ قطع شد. دوباره تلاش کنید.")
                );
            }

            if (statusCode === DisconnectReason.loggedOut) {
                activeSockets.delete(sessionId);
                reconnectAttempts.delete(sessionId);

                log("WhatsApp logged out. Pairing required again.");
                return;
            }

            if (
                state.creds.registered ||
                sock.__pairingCodeSent
            ) {
                scheduleReconnect(sessionId, sock);
            } else {
                activeSockets.delete(sessionId);
            }
        }
    });

    return sock;
}

// -----------------------------
// HEALTH
// -----------------------------

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "online",
        name: "RAEES SULTAN BOT",
        owner: "Shirzai Panjshiri",
        port: PORT,
        mongo: mongoReady ? "connected" : "connecting",
        next: nextReady ? "ready" : "starting",
        connectedSessions: activeSockets.size,
        uptime: Math.floor(process.uptime())
    });
});

app.get("/api/status", (req, res) => {
    const sessions = [];

    for (const [sessionId, sock] of activeSockets.entries()) {
        sessions.push({
            sessionId,
            connected: Boolean(sock.user),
            number: sock.user?.id || null
        });
    }

    res.json({
        success: true,
        sessions
    });
});

// -----------------------------
// PAIRING API
// -----------------------------

app.post("/api/pairing", async (req, res) => {
    let phoneNumber = String(
        req.body?.phoneNumber || ""
    ).replace(/\D/g, "");

    if (!phoneNumber || phoneNumber.length < 10) {
        return res.status(400).json({
            success: false,
            message: "شماره واتساپ را همراه کود کشور وارد کنید."
        });
    }

    if (!mongoReady) {
        return res.status(503).json({
            success: false,
            message: "MongoDB هنوز آماده نیست."
        });
    }

    if (activeSockets.has(phoneNumber)) {
        return res.status(409).json({
            success: false,
            message: "برای این شماره اتصال فعال وجود دارد."
        });
    }

    if (pairingWaiters.has(phoneNumber)) {
        return res.status(409).json({
            success: false,
            message: "درخواست کد برای این شماره در حال اجرا است."
        });
    }

    try {
        const codePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                pairingWaiters.delete(phoneNumber);

                const sock = activeSockets.get(phoneNumber);

                if (sock) {
                    sock.__noReconnect = true;

                    if (sock.__pairingTimer) {
                        clearTimeout(sock.__pairingTimer);
                    }

                    activeSockets.delete(phoneNumber);

                    try {
                        sock.end(undefined);
                    } catch {}
                }

                reject(
                    new Error("زمان دریافت کد تمام شد. دوباره تلاش کنید.")
                );
            }, 45000);

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
            pairingCode,
            message: "کد جفت‌سازی آماده است."
        });

    } catch (error) {
        console.error("Pairing error:", error);

        const waiter = pairingWaiters.get(phoneNumber);

        if (waiter) {
            clearTimeout(waiter.timeout);
            pairingWaiters.delete(phoneNumber);
        }

        return res.status(500).json({
            success: false,
            message: error.message || "خطا در دریافت کد جفت‌سازی"
        });
    }
});

// -----------------------------
// RECONNECT API
// -----------------------------

app.post("/api/reconnect", async (req, res) => {
    try {
        const phoneNumber = String(
            req.body?.phoneNumber || ""
        ).replace(/\D/g, "");

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "شماره را وارد کنید."
            });
        }

        if (!mongoReady) {
            return res.status(503).json({
                success: false,
                message: "MongoDB هنوز آماده نیست."
            });
        }

        if (activeSockets.has(phoneNumber)) {
            return res.json({
                success: true,
                message: "اتصال از قبل فعال است."
            });
        }

        await startSocket(phoneNumber);

        return res.json({
            success: true,
            message: "درخواست اتصال ارسال شد."
        });

    } catch (error) {
        console.error("Reconnect API error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// -----------------------------
// NEXT.JS FALLBACK
// -----------------------------

app.use((req, res) => {
    if (!nextReady) {
        return res.status(503).send(
            "RAEES SULTAN BOT is starting..."
        );
    }

    return nextHandler(req, res);
});

// -----------------------------
// START SERVER FIRST
// -----------------------------

server.listen(PORT, HOST, () => {
    log(`Server listening on ${HOST}:${PORT}`);
    log("Owner: Shirzai Panjshiri");

    initializeServices();
});

// -----------------------------
// INITIALIZE SERVICES
// -----------------------------

async function initializeServices() {
    try {
        log("Initializing services...");

        await connectMongo();
        await loadMessageHandler();

        await nextApp.prepare();

        nextReady = true;

        log("All services initialized successfully.");
        log(`Website ready on port ${PORT}`);

    } catch (error) {
        initializationError = error;

        console.error(
            "Initialization error:",
            error
        );

        log("Server remains online, but some services are unavailable.");
    }
}

// -----------------------------
// PROCESS ERRORS
// -----------------------------

process.on("unhandledRejection", error => {
    console.error("Unhandled Rejection:", error);
});

process.on("uncaughtException", error => {
    console.error("Uncaught Exception:", error);
});

// -----------------------------
// SHUTDOWN
// -----------------------------

async function shutdown() {
    log("Shutting down...");

    for (const timer of reconnectTimers.values()) {
        clearTimeout(timer);
    }

    reconnectTimers.clear();

    for (const sock of activeSockets.values()) {
        try {
            sock.__noReconnect = true;
            sock.end(undefined);
        } catch {}
    }

    activeSockets.clear();

    try {
        await mongoClient?.close();
    } catch {}

    server.close(() => {
        process.exit(0);
    });

    setTimeout(() => process.exit(0), 5000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
