import express from "express";
import next from "next";
import dotenv from "dotenv";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const PORT = Number(process.env.PORT) || 10000;

const app = next({ dev });
const handle = app.getRequestHandler();

const server = express();

// وضعیت سلامت سرور
server.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        status: "online",
        name: "RAEES SULTAN BOT",
        database: "MongoDB"
    });
});

// شروع سرور
async function startServer() {
    try {
        console.log("Preparing Next.js...");

        await app.prepare();

        server.all("*", (req, res) => {
            return handle(req, res);
        });

        server.listen(PORT, "0.0.0.0", () => {
            console.log("================================");
            console.log("RAEES SULTAN BOT ONLINE");
            console.log("PORT:", PORT);
            console.log("NEXT.JS: READY");
            console.log("MONGODB API: READY");
            console.log("================================");
        });

    } catch (error) {
        console.error("SERVER ERROR:", error);
        process.exit(1);
    }
}

startServer();
