import express from "express";
import { createRequire } from "module";
import { createSession } from "./bot.js";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const require = createRequire(import.meta.url);
const next = require("next");

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(async () => {
    const server = express();
    server.use(express.json());

    // مسیر Health Check
    server.get("/health", (req, res) => res.send("OK"));

    // بقیه درخواست‌ها به Next.js (وب‌سایت)
    server.all("*", (req, res) => handle(req, res));

    const PORT = process.env.PORT || 3000;
    
    // 🚀 ۱. اول سرور وب را روشن می‌کنیم تا لینک چاپ شود
    server.listen(PORT, () => {
        console.log(`\n=========================================`);
        console.log(`🚀 وب سرور با موفقیت روشن شد!`);
        console.log(`🌐 لینک وب‌سایت: http://localhost:${PORT}`);
        console.log(`=========================================\n`);
    });

    // ۲. بعد از روشن شدن وب، می‌رویم سراغ دیتابیس و واتساپ
    try {
        if (process.env.MONGO_URI) {
            const client = new MongoClient(process.env.MONGO_URI);
            await client.connect();
            const collection = client.db("raees_bot").collection("sessions");

            const users = await collection.distinct("_id");
            const phoneNumbers = new Set();

            users.forEach(id => {
                if (id.endsWith("_creds")) {
                    phoneNumbers.add(id.replace("_creds", ""));
                }
            });

            console.log(`🔍 Found ${phoneNumbers.size} sessions in database.`);

            for (const phone of phoneNumbers) {
                console.log(`🔄 Restoring session from DB for: ${phone}`);
                await createSession(phone);
            }
        } else {
            console.log("⚠️ MONGO_URI is missing! Database will not work.");
        }
    } catch (err) {
        console.error("❌ Session restore error:", err.message);
    }
});