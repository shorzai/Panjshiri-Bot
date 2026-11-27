import { Ytdl, Quality } from "@distube/ytdl-core";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";

const API_KEY = "freekey";
const SEARCH_API = "https://pro-apis.zone.id/api/search/yts";

const MAX_SIZE = 25 * 1024 * 1024;
const DOWNLOAD_TIMEOUT = 180000;

// یک نمونه برای استفاده مجدد در تمام درخواست‌ها
const yt = new Ytdl({
    lang: "en",
    timeoutMs: 30000
});

async function fetchJSON(url, timeout = 60000) {
    const response = await fetch(url, {
        headers: { "x-api-key": API_KEY },
        signal: AbortSignal.timeout(timeout)
    });

    const text = await response.text();

    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error("پاسخ API معتبر نیست.");
    }

    if (!response.ok) {
        throw new Error(
            data.error || `API Error: ${response.status}`
        );
    }

    return data;
}

function isYouTubeLink(text) {
    try {
        const url = new URL(text);
        const host = url.hostname.toLowerCase();

        return (
            host === "youtube.com" ||
            host.endsWith(".youtube.com") ||
            host === "youtu.be" ||
            host.endsWith(".youtu.be")
        );
    } catch {
        return false;
    }
}

function getResults(data) {
    const candidates = [
        data?.data?.results,
        data?.data?.videos,
        data?.results,
        data?.videos,
        data?.data
    ];

    return candidates.find(Array.isArray) || [];
}

function getVideoUrl(song) {
    return (
        song?.url ||
        song?.videoUrl ||
        song?.video_url ||
        song?.link ||
        song?.video ||
        ""
    );
}

async function downloadMP3(videoUrl) {
    if (!ffmpegPath) {
        throw new Error("FFmpeg در سیستم پیدا نشد.");
    }

    const info = await yt.getInfo(videoUrl);

    const title =
        info.videoDetails?.title || "RAEES SULTAN MUSIC";

    const audioStream = yt.download(info, {
        quality: Quality.HighestAudio,
        filter: {
            hasAudio: true,
            hasVideo: false
        }
    });

    const ffmpeg = spawn(ffmpegPath, [
        "-hide_banner",
        "-loglevel", "error",
        "-i", "pipe:0",
        "-vn",
        "-codec:a", "libmp3lame",
        "-b:a", "128k",
        "-f", "mp3",
        "pipe:1"
    ], {
        stdio: ["pipe", "pipe", "pipe"]
    });

    return await new Promise((resolve, reject) => {
        const chunks = [];
        let totalSize = 0;
        let stderr = "";
        let settled = false;

        const timer = setTimeout(() => {
            ffmpeg.kill("SIGKILL");
            finish(new Error("زمان دانلود تمام شد."));
        }, DOWNLOAD_TIMEOUT);

        function finish(error, buffer) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);

            if (error) {
                audioStream.destroy();
                ffmpeg.kill("SIGKILL");
                reject(error);
            } else {
                resolve({ buffer, title });
            }
        }

        ffmpeg.stdout.on("data", chunk => {
            totalSize += chunk.length;

            if (totalSize > MAX_SIZE) {
                finish(
                    new Error("حجم آهنگ بیشتر از ۲۵ مگابایت است.")
                );
                return;
            }

            chunks.push(chunk);
        });

        ffmpeg.stderr.on("data", chunk => {
            stderr += chunk.toString();
            if (stderr.length > 4000) {
                stderr = stderr.slice(-4000);
            }
        });

        ffmpeg.on("error", error => {
            finish(new Error("اجرای FFmpeg ناموفق بود: " + error.message));
        });

        audioStream.on("error", error => {
            finish(new Error("دانلود از یوتیوب ناموفق بود: " + error.message));
        });

        ffmpeg.stdin.on("error", error => {
            if (!settled) {
                finish(new Error("خطا در انتقال صدای یوتیوب: " + error.message));
            }
        });

        ffmpeg.on("close", code => {
            if (settled) return;

            if (code !== 0) {
                finish(
                    new Error(
                        "تبدیل MP3 ناموفق بود: " +
                        (stderr || `FFmpeg exit code ${code}`)
                    )
                );
                return;
            }

            const buffer = Buffer.concat(chunks);

            if (!buffer.length) {
                finish(new Error("فایل MP3 خالی است."));
                return;
            }

            finish(null, buffer);
        });

        audioStream.pipe(ffmpeg.stdin);
    });
}

export default async function play(
    sock,
    from,
    body,
    m,
    args
) {
    try {
        const query = Array.isArray(args)
            ? args.join(" ").trim()
            : "";

        if (!query) {
            return await sock.sendMessage(from, {
                text:
                    "🎵 *RAEES SULTAN MUSIC DOWNLOADER*\n\n" +
                    "روش استفاده:\n\n" +
                    "1️⃣ !play نام آهنگ\n" +
                    "2️⃣ !play نام خواننده\n" +
                    "3️⃣ !play لینک یوتیوب\n\n" +
                    "مثال:\n" +
                    "!play آهنگ ایرانی"
            }, { quoted: m });
        }

        await sock.sendMessage(from, {
            text:
                "🔎 *در حال جست‌وجوی آهنگ...*\n\n" +
                `🎵 عبارت: ${query}`
        }, { quoted: m });

        let videoUrl = query;
        let song = {};

        // جست‌وجوی قبلی حفظ شده است
        if (!isYouTubeLink(query)) {
            const searchURL = new URL(SEARCH_API);

            searchURL.searchParams.set("key", API_KEY);
            searchURL.searchParams.set("q", query);
            searchURL.searchParams.set("limit", "10");

            const searchData = await fetchJSON(
                searchURL.toString()
            );

            if (searchData.success === false) {
                throw new Error(
                    searchData.error ||
                    "جست‌وجوی آهنگ ناموفق بود."
                );
            }

            const results = getResults(searchData);

            if (!results.length) {
                throw new Error(
                    "هیچ آهنگی با این عبارت پیدا نشد."
                );
            }

            song = results.find(item =>
                isYouTubeLink(getVideoUrl(item))
            ) || {};

            videoUrl = getVideoUrl(song);

            if (!videoUrl) {
                throw new Error(
                    "لینک یوتیوب در نتایج پیدا نشد."
                );
            }
        }

        const songTitle =
            song.title ||
            song.name ||
            "آهنگ درخواستی";

        await sock.sendMessage(from, {
            text:
                "⬇️ *آهنگ پیدا شد!*\n\n" +
                `🎵 ${songTitle}\n\n` +
                "🎧 فرمت: MP3\n" +
                "🎚 کیفیت: 128kbps\n\n" +
                "در حال دانلود از یوتیوب، لطفاً منتظر بمانید..."
        }, { quoted: m });

        // دانلود مستقیم از یوتیوب و تبدیل به MP3
        const result = await downloadMP3(videoUrl);

        const safeName = result.title
            .replace(/[\\/:*?"<>|]/g, "")
            .slice(0, 100) || "Music";

        await sock.sendMessage(from, {
            audio: result.buffer,
            mimetype: "audio/mpeg",
            fileName: `${safeName}.mp3`,
            ptt: false
        }, { quoted: m });

        console.log(
            "PLAY SUCCESS:",
            result.title,
            result.buffer.length
        );

    } catch (error) {
        console.error("PLAY ERROR:", error);

        try {
            await sock.sendMessage(from, {
                text:
                    "❌ *دانلود آهنگ ناموفق بود.*\n\n" +
                    `📌 دلیل: ${error.message}`
            }, { quoted: m });
        } catch (sendError) {
            console.error("PLAY ERROR MESSAGE:", sendError);
        }
    }
}
