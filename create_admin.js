import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL;

async function run() {
    if (!uri) {
        console.log("❌ Error: MongoDB URI not found in .env file!");
        return;
    }

    try {
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db("raees_sultan_bot");
        const users = db.collection("users");

        const hash = await bcrypt.hash("panjshiri1234", 10);

        await users.updateOne(
            { username: "shirzaipgr" },
            {
                $set: {
                    username: "shirzaipgr",
                    password: hash,
                    role: "owner",
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );

        console.log("✅ SUCCESS! Owner account (shirzaipgr) is ready in MongoDB.");
        await client.close();
    } catch (error) {
        console.error("❌ Database Error:", error.message);
    }
}

run();
