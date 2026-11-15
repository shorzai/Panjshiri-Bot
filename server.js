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

// =====================================
// CONFIGURATION
// =====================================

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";

const DB_NAME =
    process.env.MONGODB_DB ||
    process.env.MONGO_DB ||
    "raees_sultan_bot";

// پشتیبانی از نام‌های مختلف متغیر MongoDB
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

// =====================================
// GLOBAL STATE
// =====================================

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

// =====================================
// LOGGER
// =====================================

function log(...args) {
    console.log("[RAEES SULTAN BOT]", ...args);
}

// =====================================
// MONGODB CONNECTION
// =====================================

async function connectMongo() {
    if (!MONGODB_URI) {
        mongoStatus = "missing_uri";

        throw new Error(
            "MongoDB URI پیدا نشد. متغیرهای MONGODB_URI / MONGO_URI / MONGODB_URL / MONGO_URL / DATABASE_URL را بررسی کنید."
        );
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

// =====================================
// LOAD MESSAGE HANDLER
// =====================================

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
            "handler.js باید یک تابع default export داشته باشد."
        );
    }

    messageHandler = imported.default;

    handlerReady = true;
    handlerStatus = "ready";

    log("Message handler loaded successfully.");
}

// =====================================
// AUTH DATA SERIALIZATION
// =====================================

function serialize(value) {
    return JSON.stringify(value, BufferJSON.replacer);
}

function deserialize(value) {
    return JSON.parse(value, BufferJSON.reviver);
}

// =====================================
// MONGODB AUTH STATE
// =====================================

async function useMongoAuthState(sessionId) {
    if (!authCollection || !mongoReady) {
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
            console.error("Auth data read error:", error);
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

// =====================================
// MESSAGE TEXT EXTRACTION
// =====================================

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

// =====================================
// PROCESS WHATSAPP MESSAGE
// =====================================

async function processMessage(sock, message) {
    try {
        if (!message?.message) return;

        if (message.key?.fromMe) return;

        const from = message.key?.remoteJid;

        if (!from) return;

        const body = getMessageText(message);

        if (!body) return;

        if (typeof messageHandler !== "function") {
            log("Message handler is not ready.");
            return;
        }

        await messageHandler(
            sock,
            from,
            body,
            message
        );

    } catch (error) {
        console.error("Message processing error:", error);
    }
}

// =====================================
// RECONNECT MANAGEMENT
// =====================================

function clearReconnectTimer(sessionId) {
    const timer = reconnectTimers.get(sessionId);

    if (timer) {
        clearTimeout(timer);
        reconnectTimers.delete(sessionId);
    }
}

function scheduleReconnect(sessionId, oldSocket = null) {
    if (
        oldSocket &&
        activeSockets.get(sessionId) === oldSocket
    ) {
        activeSockets.delete(sessionId);
    }

    if (oldSocket?.__noReconnect) return;

    if (activeSockets.has(sessionId)) return;

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
            scheduleReconnect(sessionId);
        }
    }, delay);

    reconnectTimers.set(sessionId, timer);
}

// =====================================
// START WHATSAPP SOCKET
// =====================================

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
        sock.__pairingTimer = null;

        activeSockets.set(sessionId, sock);

        // Save credentials
        sock.ev.on("creds.update", async () => {
            try {
                await saveCreds();
            } catch (error) {
                console.error("Save credentials error:", error);
            }
        });

        // Incoming messages
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== "notify" && type !== "append") return;

            for (const message of messages || []) {
                await processMessage(sock, message);
            }
        });

        // Connection events
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

                log(`WhatsApp connected: ${sessionId}`);
            }

            if (connection === "close") {
                const statusCode =
                    lastDisconnect?.error?.output?.statusCode;

                log(
                    `WhatsApp connection closed: ${sessionId}`,
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
                        new Error(
                            "اتصال واتساپ قطع شد. دوباره تلاش کنید."
                        )
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
                    if (activeSockets.get(sessionId) === sock) {
                        activeSockets.delete(sessionId);
                    }
                }
            }
        });

        // Pairing code
        if (!state.creds.registered) {
            sock.__pairingTimer = setTimeout(async () => {
                const waiter = pairingWaiters.get(sessionId);

                if (!waiter) return;

                if (activeSockets.get(sessionId) !== sock) return;

                try {
                    const code =
                        await sock.requestPairingCode(sessionId);

                    sock.__pairingCodeSent = true;

                    clearTimeout(waiter.timeout);
                    pairingWaiters.delete(sessionId);

                    waiter.resolve(code);

                    log(`Pairing code generated: ${sessionId}`);

                } catch (error) {
                    clearTimeout(waiter.timeout);
                    pairingWaiters.delete(sessionId);

                    waiter.reject(error);
                }
            }, 5000);
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

// =====================================
// HEALTH CHECK
// =====================================

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "online",
        name: "RAEES SULTAN BOT",
        owner: "Shirzai Panjshiri",
        port: PORT,

        mongo: mongoStatus,
        next: nextStatus,
        handler: handlerStatus,

        mongoReady,
        nextReady,
        handlerReady,

        initializationError,

        connectedSessions: activeSockets.size,
        uptime: Math.floor(process.uptime())
    });
});

// =====================================
// SESSION STATUS
// =====================================

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

// =====================================
// PAIRING API
// =====================================

app.post("/api/pairing", async (req, res) => {
    const phoneNumber = String(
        req.body?.phoneNumber || ""
    ).replace(/\D/g, "");

    if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
        return res.status(400).json({
            success: false,
            message: "شماره واتساپ را همراه کود کشور وارد کنید."
        });
    }

    if (!mongoReady) {
        return res.status(503).json({
            success: false,
            message: "MongoDB آماده نیست.",
            mongo: mongoStatus
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
                    new Error(
                        "زمان دریافت کد تمام شد. دوباره تلاش کنید."
                    )
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

// =====================================
// RECONNECT API
// =====================================

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

// =====================================
// NEXT.JS FALLBACK
// =====================================

app.use((req, res) => {
    if (!nextReady) {
        return res.status(503).send(
            "RAEES SULTAN BOT website is starting. Please try again shortly."
        );
    }

    return nextHandler(req, res);
});

// =====================================
// INITIALIZE SERVICES
// =====================================

async function initializeServices() {
    log("Initializing services...");

    // Next.js starts independently from MongoDB
    const nextTask = (async () => {
        try {
            await nextApp.prepare();

            nextReady = true;
            nextStatus = "ready";

            log("Next.js is ready.");

        } catch (error) {
            nextReady = false;
            nextStatus = "error";

            console.error("Next.js initialization error:", error);
        }
    })();

    // Load handler independently
    const handlerTask = (async () => {
        try {
            await loadMessageHandler();

        } catch (error) {
            handlerReady = false;
            handlerStatus = "error";

            console.error("Handler initialization error:", error);
        }
    })();

    // MongoDB starts independently
    const mongoTask = (async () => {
        try {
            await connectMongo();

        } catch (error) {
            mongoReady = false;

            if (mongoStatus !== "missing_uri") {
                mongoStatus = "error";
            }

            initializationError = error.message;

            console.error("MongoDB initialization error:", error);
        }
    })();

    await Promise.allSettled([
        nextTask,
        handlerTask,
        mongoTask
    ]);

    log("Initialization tasks completed.");

    log(
        `Status: MongoDB=${mongoStatus}, Next=${nextStatus}, Handler=${handlerStatus}`
    );
}

// =====================================
// START SERVER FIRST
// =====================================

server.listen(PORT, HOST, () => {
    log(`Server listening on ${HOST}:${PORT}`);
    log("Owner: Shirzai Panjshiri");

    initializeServices().catch(error => {
        console.error("Initialization failure:", error);
    });
});

// =====================================
// PROCESS ERRORS
// =====================================

process.on("unhandledRejection", error => {
    console.error("Unhandled Rejection:", error);
});

process.on("uncaughtException", error => {
    console.error("Uncaught Exception:", error);
});

// =====================================
// SHUTDOWN
// =====================================

async function shutdown() {
    log("Shutting down...");

    for (const timer of reconnectTimers.values()) {
        clearTimeout(timer);
    }

    reconnectTimers.clear();

    for (const waiter of pairingWaiters.values()) {
        clearTimeout(waiter.timeout);
        waiter.reject(new Error("Server is shutting down."));
    }

    pairingWaiters.clear();

    for (const sock of activeSockets.values()) {
        try {
            sock.__noReconnect = true;
            sock.end(undefined);
        } catch {}
    }

    activeSockets.clear();

    try {
        await mongoClient?.close();
    } catch (error) {
        console.error("MongoDB shutdown error:", error);
    }

    server.close(() => {
        process.exit(0);
    });

    setTimeout(() => process.exit(0), 5000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
