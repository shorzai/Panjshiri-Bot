import ytdlp from "youtube-dl-exec";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import os from "os";

const API_KEY = "freekey";
const SEARCH_API = "https://pro-apis.zone.id/api/search/yts";

const USE_COOKIES = false;
const COOKIES_FILE = path.join(process.cwd(), "cookies.txt");

const MAX_SIZE = 25 * 1024 * 1024;

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
        song.url ||
        song.videoUrl ||
        song.video_url ||
        song.link ||
        song.video ||
        ""
    );
}

async function downloadMP3(videoUrl, timeout = 120000) {
    const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "ytdlp-")
    );

    const options = {
        extractAudio: true,
        audioFormat: "mp3",
        audioQuality: "128K",
        noPlaylist: true,
        forceIpv4: true,
        socketTimeout: 30,
        retries: 3,
        noProgress: true,
        output: path.join(tmpDir, "audio.%(ext)s"),
        ffmpegLocation: ffmpegPath,
        dumpSingleJson: false,
        printJson: false
    };

    if (USE_COOKIES && fs.existsSync(COOKIES_FILE)) {
        options.cookies = COOKIES_FILE;
    }

    try {
        await ytdlp.exec(videoUrl, options);

        const file = fs.readdirSync(tmpDir)
            .find(f => f.startsWith("audio."));

        if (!file) {
            throw new Error("yt-dlp فایل خروجی تولید نکرد.");
        }

        const buffer = fs.readFileSync(
            path.join(tmpDir, file)
        );

        return { buffer, tmpDir };
    } catch (err) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        throw err;
    }
}

async function getVideoTitle(videoUrl) {
    try {
        const info = await ytdlp.exec(videoUrl, {
            dumpSingleJson: true,
            noPlaylist: true,
            skipDownload: true
        });

        return info?.title || "";
    } catch {
        return "";
    }
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
                    "3️⃣ !play بخشی از متن آهنگ\n" +
                    "4️⃣ !play لینک یوتیوب\n\n" +
                    "مثال:\n" +
                    "!play آهنگ ایرانی تو که از اولشم یکی دیگه توی قلبت بود"
            }, { quoted: m });
        }

        await sock.sendMessage(from, {
            text: "🔎 *در حال جست‌وجوی آهنگ...*\n\n" +
                  `🎵 عبارت: ${query}`
        }, { quoted: m });

        let videoUrl = query;
        let song = {};

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
                    "لینک یوتیوب در نتایج سرچ پیدا نشد."
                );
            }
        }

        const songTitle =
            song.title ||
            song.name ||
            await getVideoTitle(videoUrl) ||
            "آهنگ درخواستی";

        await sock.sendMessage(from, {
            text:
                "⬇️ *آهنگ پیدا شد!*\n\n" +
                `🎵 ${songTitle}\n\n` +
                "🎧 فرمت: MP3\n" +
                "🎚 کیفیت: 128kbps\n\n" +
                "در حال دانلود، لطفاً منتظر بمانید..."
        }, { quoted: m });

        const { buffer: audioBuffer, tmpDir } =
            await downloadMP3(videoUrl);

        try {
            if (!audioBuffer.length) {
                throw new Error("فایل صوتی خالی است.");
            }

            if (audioBuffer.length > MAX_SIZE) {
                throw new Error(
                    "حجم آهنگ بیشتر از 25 مگابایت است."
                );
            }

            const safeName = songTitle
                .replace(/[\\/:*?"<>|]/g, "")
                .slice(0, 100) || "Music";

            await sock.sendMessage(from, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                fileName: `${safeName}.mp3`,
                ptt: false
            }, { quoted: m });

            console.log(
                "PLAY SUCCESS:",
                songTitle,
                audioBuffer.length
            );
        } finally {
            fs.rmSync(tmpDir, {
                recursive: true,
                force: true
            });
        }

    } catch (error) {
        console.log("PLAY ERROR:", error);

        await sock.sendMessage(from, {
            text:
                "❌ *دانلود آهنگ ناموفق بود.*\n\n" +
                `📌 دلیل: ${error.message}`
        }, { quoted: m });
    }
}
