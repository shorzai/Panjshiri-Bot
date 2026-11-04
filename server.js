import express from "express";
import next from "next";
import { createSession } from "./bot.js";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// خواندن فایل .env (برای زمانی که روی ترموکس یا لوکال اجرا می‌کنی)
dotenv.config(); 

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(async () => {
    const server = express();
    server.use(express.json());

    // 👈 بازیابی خودکار همه کاربرانی که در دیتابیس سشن دارند
    try {
        if (process.env.MONGO_URI) {
            const client = new MongoClient(process.env.MONGO_URI);
            await client.connect();
            const collection = client.db("raees_bot").collection("sessions");
            
            // پیدا کردن تمام شماره‌هایی که در دیتابیس سشن دارن
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

    // مسیر Health Check برای UptimeRobot
    server.get("/health", (req, res) => res.send("OK"));

    // بقیه درخواست‌ها به Next.js پاس داده میشن
    server.all("*", (req, res) => handle(req, res));

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`🚀 Web server ready on port ${PORT}`);
    });
});