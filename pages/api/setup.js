import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

export default async function handler(req, res) {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db("raees_sultan_bot");
        const users = db.collection("users");

        const hash = await bcrypt.hash("panjshiri1234", 10);
        
        await users.updateOne(
            { username: "shirzaipgr" },
            { $set: { username: "shirzaipgr", password: hash, role: "owner" } },
            { upsert: true }
        );

        await client.close();
        return res.json({ success: true, message: "Owner account created! You can now login." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
