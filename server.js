import express from "express";
import next from "next";
import dotenv from "dotenv";
import makeWASocket, {
    fetchLatestBaileysVersion,
    initAuthCreds,
    BufferJSON,
    proto,
    DisconnectReason
} from "@whiskeysockets/baileys";
import Pino from "pino";
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "raees_sultan_bot";
const AUTH_COLLECTION = "whatsapp_auth";

const logger = Pino({ level: process.env.LOG_LEVEL || "silent" });
const app = express();

app.use(express.json({ limit: "2mb" }));

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

let mongoClient;
let authCollection;
let messageHandler;

const activeSockets = new Map();
const reconnectTimers = new Map();
const reconnectAttempts = new Map();
const pairingRequests = new Map();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function log(...args) {
    console.log("[RAEES SULTAN BOT]", ...args);
}

async function connectMongo() {
    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI در فایل .env تنظیم نشده است.");
    }

    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();

    const db = mongoClient.db(DB_NAME);
    authCollection = db.collection(AUTH_COLLECTION);

    await authCollection.createIndex(
        { sessionId: 1, keyId: 1 },
        { unique: true }
    );

    log("اتصال MongoDB برقرار شد.");
}

async function loadMessageHandler() {
    const handlerPath = path.resolve("./handler.js");

    if (!fs.existsSync(handlerPath)) {
        throw new Error("فایل handler.js در پوشه اصلی پروژه پیدا نشد.");
    }

    const imported = await import(handlerPath + "?v=" + Date.now());

    if (typeof imported.default !== "function") {
        throw new Error("handler.js باید یک تابع default export داشته باشد.");
    }

    messageHandler = imported.default;
    log("Handler با موفقیت بارگذاری شد.");
}

function serialize(value) {
    return JSON.stringify(value, BufferJSON.replacer);
}

function deserialize(value) {
    return JSON.parse(value, BufferJSON.reviver);
}

async function useMongoAuthState(sessionId) {
    const writeData = async (keyId, value) => {
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
    };

    const readData = async keyId => {
        const record = await authCollection.findOne({
            sessionId,
            keyId
        });

        if (!record) return null;

        try {
            return deserialize(record.value);
        } catch {
            return null;
        }
    };

    const credsRecord = await readData("creds");
    const creds = credsRecord || initAuthCreds();

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

function getMessageText(message) {
    if (!message) return "";

    const content =
        message.message?.ephemeralMessage?.message ||
        message.message?.viewOnceMessage?.message ||
        message.message?.viewOnceMessageV2?.message ||
        message.message?.documentWithCaptionMessage?.message ||
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
        content.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
        ""
    );
}

async function processMessage(sock, message) {
    try {
        if (!message || !message.message) return;
        if (message.key?.fromMe) return;

        const from = message.key?.remoteJid;
        if (!from) return;

        const body = getMessageText(message);
        if (!body) return;

        if (typeof messageHandler !== "function") {
            log("Handler هنوز آماده نیست.");
            return;
        }

        await messageHandler(sock, from, body, message);
    } catch (error) {
        console.error("خطا در پردازش پیام:", error);
    }
}

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

    const attempt = (reconnectAttempts.get(sessionId) || 0) + 1;
    reconnectAttempts.set(sessionId, attempt);

    const delay = Math.min(5000 * attempt, 60000);

    log(`اتصال قطع شد. تلاش مجدد تا ${Math.round(delay / 1000)} ثانیه دیگر...`);

    clearReconnectTimer(sessionId);

    const timer = setTimeout(() => {
        reconnectTimers.delete(sessionId);

        if (!activeSockets.has(sessionId)) {
            startSocket(sessionId).catch(error => {
                console.error("خطای اتصال مجدد:", error);
            });
        }
    }, delay);

    reconnectTimers.set(sessionId, timer);
}

async function startSocket(sessionId, pairingCallback = null) {
    if (activeSockets.has(sessionId)) {
        if (pairingCallback) {
            pairingCallback(
                new Error("برای این شماره یک اتصال فعال وجود دارد.")
            );
        }
        return activeSockets.get(sessionId);
    }

    clearReconnectTimer(sessionId);

    const { state, saveCreds } = await useMongoAuthState(sessionId);

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        auth: state,
        printQRInTerminal: false,
        browser: ["RAEES SULTAN BOT", "Chrome", "1.0.0"],
        markOnlineOnConnect: true,
        syncFullHistory: false,
        generateHighQualityLinkPreview: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000
    });

    sock.sessionId = sessionId;
    activeSockets.set(sessionId, sock);

    let pairingCodeSent = false;
    let pairingFinished = false;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify" && type !== "append") return;

        for (const message of messages || []) {
            await processMessage(sock, message);
        }
    });

    if (!state.creds.registered && pairingCallback) {
        const pairingTimer = setTimeout(async () => {
            try {
                if (activeSockets.get(sessionId) !== sock) return;

                const code = await sock.requestPairingCode(sessionId);

                pairingCodeSent = true;
                pairingFinished = true;

                pairingCallback(null, code);
            } catch (error) {
                pairingCallback(error);
            }
        }, 3000);

        pairingRequests.set(sessionId, pairingTimer);
    }

    sock.ev.on("connection.update", async update => {
        const { connection, lastDisconnect } = update;

        if (connection === "connecting") {
            log(`در حال اتصال: ${sessionId}`);
        }

        if (connection === "open") {
            reconnectAttempts.delete(sessionId);
            pairingFinished = true;

            const timer = pairingRequests.get(sessionId);
            if (timer) {
                clearTimeout(timer);
                pairingRequests.delete(sessionId);
            }

            log(`ربات متصل شد: ${sessionId}`);

            const pending = pairingRequests.get(`${sessionId}:callback`);
            if (pending) {
                pending(null, "CONNECTED");
                pairingRequests.delete(`${sessionId}:callback`);
            }
        }

        if (connection === "close") {
            const statusCode =
                lastDisconnect?.error?.output?.statusCode;

            log(`اتصال بسته شد: ${sessionId}`, statusCode || "");

            const timer = pairingRequests.get(sessionId);
            if (timer) {
                clearTimeout(timer);
                pairingRequests.delete(sessionId);
            }

            if (!pairingCodeSent && pairingCallback) {
                pairingCallback(
                    new Error("اتصال پیش از دریافت کد جفت‌سازی قطع شد.")
                );
                pairingCallback = null;
            }

            if (statusCode === DisconnectReason.loggedOut) {
                activeSockets.delete(sessionId);
                reconnectAttempts.delete(sessionId);
                log("حساب از واتساپ خارج شده است؛ جفت‌سازی دوباره لازم است.");
                return;
            }

            if (state.creds.registered || pairingFinished) {
                scheduleReconnect(sessionId, sock);
            } else {
                activeSockets.delete(sessionId);
            }
        }
    });

    return sock;
}

app.get("/health", (req, res) => {
    res.json({
        status: "online",
        name: "RAEES SULTAN BOT",
        owner: "Shirzai Panjshiri",
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

app.post("/api/pairing", async (req, res) => {
    try {
        let phoneNumber = String(req.body?.phoneNumber || "")
            .replace(/\D/g, "");

        if (!phoneNumber || phoneNumber.length < 10) {
            return res.status(400).json({
                success: false,
                message: "شماره واتساپ را با کود کشور وارد کنید."
            });
        }

        if (activeSockets.has(phoneNumber)) {
            return res.status(409).json({
                success: false,
                message: "برای این شماره اتصال فعال وجود دارد."
            });
        }

        let finished = false;

        const result = await new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                if (finished) return;
                finished = true;
                reject(new Error("زمان دریافت کد تمام شد. دوباره تلاش کنید."));
            }, 45000);

            const callback = (error, code) => {
                if (finished) return;

                finished = true;
                clearTimeout(timeout);

                if (error) reject(error);
                else resolve(code);
            };

            try {
                await startSocket(phoneNumber, callback);
            } catch (error) {
                callback(error);
            }
        });

        return res.json({
            success: true,
            phoneNumber,
            pairingCode: result,
            message: "کد جفت‌سازی آماده است."
        });
    } catch (error) {
        console.error("Pairing error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "خطا در دریافت کد جفت‌سازی"
        });
    }
});

app.post("/api/reconnect", async (req, res) => {
    try {
        const phoneNumber = String(req.body?.phoneNumber || "")
            .replace(/\D/g, "");

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "شماره را وارد کنید."
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
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.use((req, res) => {
    return nextHandler(req, res);
});

async function startServer() {
    try {
        log("در حال آماده‌سازی RAEES SULTAN BOT...");

        await loadMessageHandler();
        await connectMongo();
        await nextApp.prepare();

        app.listen(PORT, HOST, () => {
            log(`سرور فعال است: http://${HOST}:${PORT}`);
            log("صاحب ربات: Shirzai Panjshiri");
        });
    } catch (error) {
        console.error("خطای راه‌اندازی سرور:", error);
        process.exit(1);
    }
}

process.on("unhandledRejection", error => {
    console.error("Unhandled Rejection:", error);
});

process.on("uncaughtException", error => {
    console.error("Uncaught Exception:", error);
});

process.on("SIGINT", async () => {
    log("در حال خاموش کردن سرور...");

    for (const sock of activeSockets.values()) {
        try {
            sock.end(undefined);
        } catch {}
    }

    try {
        await mongoClient?.close();
    } catch {}

    process.exit(0);
});

startServer();
