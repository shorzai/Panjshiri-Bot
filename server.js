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

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const PORT = Number(process.env.PORT) || 10000;

const server = express();
server.use(express.json({ limit: "1mb" }));

// ======================================
// MONGODB CONNECTION
// ======================================

let mongoClientPromise = null;
let collection = null;

async function getCollection() {
    if (collection) return collection;

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI در فایل ENV تنظیم نشده است.");
    }

    if (!mongoClientPromise) {
        mongoClientPromise = (async () => {
            const client = new MongoClient(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 15000,
                connectTimeoutMS: 15000,
                maxPoolSize: 10
            });

            await client.connect();
            return client;
        })().catch(error => {
            mongoClientPromise = null;
            throw error;
        });
    }

    const client = await mongoClientPromise;
    collection = client.db("raees_bot").collection("sessions");

    return collection;
}

// ======================================
// MONGODB AUTH STATE
// ======================================

async function useMongoAuthState(phoneNumber) {
    const db = await getCollection();

    const writeData = async (key, value) => {
        await db.updateOne(
            { _id: `${phoneNumber}_${key}` },
            {
                $set: {
                    data: JSON.stringify(value, BufferJSON.replacer),
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
    };

    const readData = async (key) => {
        const doc = await db.findOne({
            _id: `${phoneNumber}_${key}`
        });

        if (!doc || !doc.data) return null;

        return JSON.parse(doc.data, BufferJSON.reviver);
    };

    const removeData = async (key) => {
        await db.deleteOne({
            _id: `${phoneNumber}_${key}`
        });
    };

    const creds = (await readData("creds")) || initAuthCreds();

    const state = {
        creds,
        keys: {
            get: async (type, ids) => {
                const result = {};

                await Promise.all(ids.map(async id => {
                    let value = await readData(`${type}-${id}`);

                    if (
                        type === "app-state-sync-key" &&
                        value
                    ) {
                        value = proto.Message.AppStateSyncKeyData.fromObject(value);
                    }

                    result[id] = value;
                }));

                return result;
            },

            set: async (data) => {
                const operations = [];

                for (const category in data) {
                    for (const id in data[category]) {
                        const value = data[category][id];
                        const key = `${category}-${id}`;

                        operations.push(
                            value
                                ? writeData(key, value)
                                : removeData(key)
                        );
                    }
                }

                await Promise.all(operations);
            }
        }
    };

    const saveCreds = () => writeData("creds", state.creds);

    return { state, saveCreds };
}

// ======================================
// SOCKET MANAGEMENT
// ======================================

const activeSockets = new Map();
const reconnectTimers = new Map();

let baileysVersionPromise = null;

async function getBaileysVersion() {
    if (!baileysVersionPromise) {
        baileysVersionPromise = fetchLatestBaileysVersion()
            .then(result => result.version)
            .catch(error => {
                baileysVersionPromise = null;
                throw error;
            });
    }

    return baileysVersionPromise;
}

const logger = Pino({ level: "silent" });

async function startSocket(phoneNumber, onPairCode = null) {
    const existing = activeSockets.get(phoneNumber);

    if (existing) return existing;

    const { state, saveCreds } =
        await useMongoAuthState(phoneNumber);

    const version = await getBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger,
        browser: ["Ubuntu", "Chrome", "120.0.0"],
        printQRInTerminal: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        syncFullHistory: false
    });

    activeSockets.set(phoneNumber, sock);

    let saveQueue = Promise.resolve();

    sock.ev.on("creds.update", () => {
        saveQueue = saveQueue
            .then(() => saveCreds())
            .catch(error => {
                console.error(
                    "Mongo credential save error:",
                    error.message
                );
            });
    });

    let pairingRequested = false;
    let handlerAttached = false;

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (
            qr &&
            !pairingRequested &&
            !sock.authState.creds.registered
        ) {
            pairingRequested = true;

            try {
                const code = await sock.requestPairingCode(phoneNumber);

                if (!code) {
                    throw new Error("WhatsApp کد پیوند را تولید نکرد.");
                }

                console.log(
                    `Pairing code generated for ${phoneNumber}: ${code}`
                );

                if (typeof onPairCode === "function") {
                    onPairCode(code);
                }

            } catch (error) {
                console.error(
                    "Pairing code error:",
                    error.message
                );

                if (typeof onPairCode === "function") {
                    onPairCode(null, error);
                }
            }
        }

        if (connection === "open") {
            console.log(`WhatsApp connected: ${phoneNumber}`);

            const timer = reconnectTimers.get(phoneNumber);

            if (timer) {
                clearTimeout(timer);
                reconnectTimers.delete(phoneNumber);
            }

            if (!handlerAttached) {
                handlerAttached = true;

                try {
                    const { default: handler } =
                        await import("./handler.js");

                    sock.ev.on("messages.upsert", async ({ messages }) => {
                        for (const m of messages || []) {
                            if (!m?.message || !m?.key?.remoteJid) {
                                continue;
                            }

                            try {
                                const msg = m.message;
                                const body =
                                    msg.conversation ||
                                    msg.extendedTextMessage?.text ||
                                    msg.imageMessage?.caption ||
                                    msg.videoMessage?.caption ||
                                    msg.documentMessage?.caption ||
                                    msg.buttonsResponseMessage?.selectedButtonId ||
                                    msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
                                    "";

                                const args = body.trim().split(/\s+/).slice(1);

                                await handler(
                                    sock,
                                    m.key.remoteJid,
                                    body,
                                    m,
                                    args
                                );

                            } catch (error) {
                                console.error(
                                    "Message handler error:",
                                    error.message
                                );
                            }
                        }
                    });

                } catch (error) {
                    console.error(
                        "Handler loading error:",
                        error.message
                    );

                    handlerAttached = false;
                }
            }
        }

        if (connection === "close") {
            await saveQueue;

            if (activeSockets.get(phoneNumber) !== sock) {
                return;
            }

            const statusCode =
                lastDisconnect?.error?.output?.statusCode;

            console.log(
                `WhatsApp disconnected: ${phoneNumber}`,
                statusCode || "Unknown"
            );

            activeSockets.delete(phoneNumber);

            if (statusCode === DisconnectReason.loggedOut) {
                console.log(
                    `Session logged out: ${phoneNumber}`
                );
                return;
            }

            if (!reconnectTimers.has(phoneNumber)) {
                const timer = setTimeout(async () => {
                    reconnectTimers.delete(phoneNumber);

                    try {
                        console.log(
                            `Reconnecting ${phoneNumber}...`
                        );

                        await startSocket(phoneNumber);

                    } catch (error) {
                        console.error(
                            "Reconnect error:",
                            error.message
                        );
                    }
                }, 2500);

                reconnectTimers.set(phoneNumber, timer);
            }
        }
    });

    return sock;
}

// ======================================
// PAIRING API
// ======================================

const pendingPairings = new Map();

server.post("/api/pairing", async (req, res) => {
    const phoneNumber = String(
        req.body?.phoneNumber || ""
    ).replace(/\D/g, "");

    if (!/^\d{10,15}$/.test(phoneNumber)) {
        return res.status(400).json({
            success: false,
            error: "شماره باید با کود کشور و بدون + وارد شود."
        });
    }

    if (pendingPairings.has(phoneNumber)) {
        return res.status(409).json({
            success: false,
            error: "درخواست تولید کد برای این شماره در حال اجرا است."
        });
    }

    pendingPairings.set(phoneNumber, true);

    let responseSent = false;
    let timeout;

    try {
        const { state } = await useMongoAuthState(phoneNumber);

        if (state.creds.registered) {
            return res.status(409).json({
                success: false,
                error: "این شماره قبلاً پیوند شده است."
            });
        }

        if (activeSockets.has(phoneNumber)) {
            return res.status(409).json({
                success: false,
                error: "برای این شماره یک اتصال فعال وجود دارد. ابتدا وضعیت اتصال قبلی را بررسی کنید."
            });
        }

        const codePromise = new Promise((resolve, reject) => {
            timeout = setTimeout(() => {
                reject(
                    new Error("زمان انتظار برای دریافت کد تمام شد. دوباره تلاش کنید.")
                );
            }, 60000);

            startSocket(phoneNumber, (code, error) => {
                if (responseSent) return;

                if (error) {
                    reject(error);
                    return;
                }

                if (code) {
                    resolve(code);
                }
            }).catch(reject);
        });

        const code = await codePromise;

        clearTimeout(timeout);

        responseSent = true;

        return res.json({
            success: true,
            code,
            phoneNumber,
            message: "کد پیوند با موفقیت تولید شد. آن را در واتساپ وارد کنید."
        });

    } catch (error) {
        if (timeout) clearTimeout(timeout);

        console.error(
            "Pairing API error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: error.message || "خطا در تولید کد پیوند."
        });

    } finally {
        pendingPairings.delete(phoneNumber);
    }
});

// ======================================
// SESSION STATUS
// ======================================

server.get("/api/session/:phoneNumber", async (req, res) => {
    try {
        const phoneNumber = String(
            req.params.phoneNumber || ""
        ).replace(/\D/g, "");

        if (!/^\d{10,15}$/.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                error: "شماره نامعتبر است."
            });
        }

        const { state } = await useMongoAuthState(phoneNumber);
        const sock = activeSockets.get(phoneNumber);

        return res.json({
            success: true,
            registered: state.creds.registered,
            connected: sock?.user ? true : false
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ======================================
// HEALTH CHECK
// ======================================

server.get("/health", async (req, res) => {
    try {
        const db = await getCollection();
        await db.database.command({ ping: 1 });

        return res.json({
            success: true,
            server: "running",
            mongodb: "connected",
            activeSessions: activeSockets.size
        });

    } catch (error) {
        return res.status(503).json({
            success: false,
            server: "running",
            mongodb: "disconnected",
            error: error.message
        });
    }
});

// ======================================
// RESTORE SAVED MONGODB SESSIONS
// ======================================

async function restoreSavedSessions() {
    try {
        const db = await getCollection();

        const savedSessions = await db.find({
            _id: {
                $regex: /^[0-9]{10,15}_creds$/
            }
        }).toArray();

        console.log(
            `Found ${savedSessions.length} saved session records.`
        );

        for (const doc of savedSessions) {
            try {
                const creds = JSON.parse(
                    doc.data,
                    BufferJSON.reviver
                );

                if (!creds?.registered) continue;

                const phoneNumber = doc._id.replace(/_creds$/, "");

                await startSocket(phoneNumber);

                console.log(
                    `Restoring session: ${phoneNumber}`
                );

            } catch (error) {
                console.error(
                    "Session restore error:",
                    error.message
                );
            }
        }

    } catch (error) {
        console.error(
            "Session restoration error:",
            error.message
        );
    }
}

// ======================================
// START SERVER
// ======================================

async function startServer() {
    await nextApp.prepare();

    server.all("*", (req, res) => {
        return handle(req, res);
    });

    server.listen(PORT, "0.0.0.0", async () => {
        console.log(`Server listening on port ${PORT}`);

        try {
            await restoreSavedSessions();
        } catch (error) {
            console.error(
                "Startup session error:",
                error.message
            );
        }
    });
}

startServer().catch(error => {
    console.error("Server startup failed:", error);
    process.exit(1);
});
