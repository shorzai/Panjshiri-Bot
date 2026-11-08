import express from "express";
import next from "next";
import dotenv from "dotenv";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const PORT = process.env.PORT || 3000;

const server = express();
server.use(express.json());

server.get("/health", (req, res) => res.send("OK"));

// 🚀 1. باز کردن پورت به محض بالا آمدن سرور
server.listen(PORT, () => {
    console.log(`🚀 Web server listening on port ${PORT}`);
});

// 2. اجرای Next.js و ربات در پس‌زمینه
nextApp.prepare().then(async () => {
    console.log("✅ Next.js prepared successfully");
    
    server.all("*", (req, res) => handle(req, res));

    try {
        const { createSession } = await import("./bot.js");
        console.log("✅ Bot module loaded");
        
        if (process.env.MONGO_URI) {
            console.log("🔍 Connecting to MongoDB...");
            const { MongoClient } = await import("mongodb");
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
            console.log("⚠️ MONGO_URI is missing!");
        }
    } catch (err) {
        console.error("❌ Bot/Database startup error:", err.message);
    }
}).catch((err) => {
    console.error("❌ Next.js prepare error:", err.message);
});
