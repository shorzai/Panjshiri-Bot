import express from "express";
import next from "next";
import { createSession } from "./bot.js";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const PORT = process.env.PORT || 3000;

nextApp.prepare().then(async () => {
    const server = express();
    server.use(express.json());

    server.get("/health", (req, res) => res.send("OK"));
    server.all("*", (req, res) => handle(req, res));

    // 🚀 1. اول پورت رو باز می‌کنیم تا رندر ارور نده
    server.listen(PORT, () => {
        console.log(`🚀 Web server ready on port ${PORT}`);
    });

    // 🤖 2. بعد در پس‌زمینه به دیتابیس وصل میشیم و ربات‌ها رو بالا میاریم
    (async () => {
        try {
            if (process.env.MONGO_URI) {
                console.log("🔍 Connecting to MongoDB...");
                const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
                await client.connect();
                console.log("✅ Connected to MongoDB!");
                
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
            console.error("❌ Database/Session restore error:", err.message);
        }
    })();
});
