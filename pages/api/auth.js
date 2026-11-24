import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "RAEES_SUPER_SECRET_KEY";
const DB_NAME = "raees_sultan_bot";

let cachedClient = null;

async function getDB() {
    if (!cachedClient) {
        cachedClient = new MongoClient(MONGODB_URI);
        await cachedClient.connect();
    }
    return cachedClient.db(DB_NAME);
}

export default async function handler(req, res) {
    const db = await getDB();
    const usersCollection = db.collection("users");

    // ==========================================
    // 1. LOGIN (POST)
    // ==========================================
    if (req.method === "POST" && req.body.action === "login") {
        const { username, password } = req.body;
        try {
            const user = await usersCollection.findOne({ username });
            if (!user) return res.status(401).json({ success: false, message: "Username or password is incorrect." });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ success: false, message: "Username or password is incorrect." });

            const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
            return res.json({ success: true, token, role: user.role, username: user.username });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // ==========================================
    // 2. ADMIN ACTIONS (Check Auth First)
    // ==========================================
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid token" });
    }

    // Only Owner can do these
    if (decoded.role !== "owner") {
        return res.status(403).json({ success: false, message: "Only the owner can perform this action." });
    }

    // Create User
    if (req.method === "POST" && req.body.action === "create") {
        const { newUsername, newPassword } = req.body;
        try {
            const existing = await usersCollection.findOne({ username: newUsername });
            if (existing) return res.status(400).json({ success: false, message: "Username already exists." });

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await usersCollection.insertOne({
                username: newUsername,
                password: hashedPassword,
                role: "user",
                createdAt: new Date()
            });
            return res.json({ success: true, message: "User created successfully." });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // Get All Users
    if (req.method === "GET") {
        try {
            const users = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
            return res.json({ success: true, users });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // Delete User
    if (req.method === "DELETE") {
        const { username } = req.body;
        try {
            if (username === "shirzaipgr") return res.status(400).json({ success: false, message: "Cannot delete owner." });
            await usersCollection.deleteOne({ username });
            return res.json({ success: true, message: "User deleted." });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
}
