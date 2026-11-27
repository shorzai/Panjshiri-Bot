import { download } from "untube";
import fs from "fs";
import path from "path";

export default async function ytdl(sock, from, body, m, args) {
    try {
        const url = args[0];
        const format = args[1]?.toLowerCase() || "mp3"; // Default to MP3

        if (!url || (!url.includes("youtube.com") && !url.includes("youtu.be"))) {
            return await sock.sendMessage(from, { 
                text: "🎵 *YouTube Downloader*\n\nUsage:\n!ytdl [URL] [mp3/mp4]\n\nExample:\n!ytdl https://youtu.be/ALZHF5UqnU4 mp3" 
            }, { quoted: m });
        }

        await sock.sendMessage(from, { text: `⏳ Downloading as ${format.toUpperCase()}... This may take a moment.` }, { quoted: m });

        // Define temporary output path
        const tempFileName = `./temp_${Date.now()}.${format}`;
        
        try {
            // Use the untube package to download
            await download(url, tempFileName, {
                format: format === "mp3" ? "audioonly" : "video",
                quality: "highestaudio" // or highestvideo
            });

            if (!fs.existsSync(tempFileName)) {
                throw new Error("Download failed - file not created.");
            }

            const fileBuffer = fs.readFileSync(tempFileName);
            const mimetype = format === "mp3" ? "audio/mpeg" : "video/mp4";

            // Send the file
            if (format === "mp3") {
                await sock.sendMessage(from, {
                    audio: fileBuffer,
                    mimetype: mimetype,
                    fileName: `audio_${Date.now()}.mp3`,
                    ptt: false
                }, { quoted: m });
            } else {
                await sock.sendMessage(from, {
                    video: fileBuffer,
                    mimetype: mimetype,
                    fileName: `video_${Date.now()}.mp4`,
                    caption: `✅ Video Downloaded\n👑 RAEES SULTAN BOT`
                }, { quoted: m });
            }

            // Clean up
            fs.unlinkSync(tempFileName);

        } catch (downloadError) {
            console.error("DOWNLOAD ERROR:", downloadError.message);
            if (fs.existsSync(tempFileName)) fs.unlinkSync(tempFileName); // Clean up on fail
            await sock.sendMessage(from, { text: `❌ Download failed: ${downloadError.message}` }, { quoted: m });
        }

    } catch (error) {
        console.error("YTDL COMMAND ERROR:", error);
        await sock.sendMessage(from, { text: "❌ An unexpected error occurred." }, { quoted: m });
    }
}
