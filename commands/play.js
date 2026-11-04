
const API_KEY = "freekey";

const SEARCH_API =
    "https://pro-apis.zone.id/api/search/yts";

const DOWNLOAD_API =
    "https://pro-apis.zone.id/api/download/youtube";

async function fetchJSON(url, timeout = 60000) {
    const response = await fetch(url, {
        headers: {
            "x-api-key": API_KEY
        },
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

function getDownloadUrl(data) {
    const d = data?.data || {};

    return (
        d.downloadUrl ||
        d.download_url ||
        d.download ||
        d.url ||
        d.link ||
        data.downloadUrl ||
        data.download_url ||
        data.url ||
        data.link ||
        ""
    );
}

export default async function play(
    sock,
    from,
    body,
    m,
    args
) {
    try {
        // دریافت تمام متن بعد از دستور
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

        // جست‌وجوی آهنگ
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

            // انتخاب اولین نتیجه دارای لینک یوتیوب
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
            "آهنگ درخواستی";

        await sock.sendMessage(from, {
            text:
                "⬇️ *آهنگ پیدا شد!*\n\n" +
                `🎵 ${songTitle}\n\n` +
                "🎧 فرمت: MP3\n" +
                "🎚 کیفیت: 128kbps\n\n" +
                "در حال دانلود، لطفاً منتظر بمانید..."
        }, { quoted: m });

        // درخواست دانلود
        const downloadURL = new URL(DOWNLOAD_API);

        downloadURL.searchParams.set("key", API_KEY);
        downloadURL.searchParams.set("url", videoUrl);
        downloadURL.searchParams.set("type", "mp3");
        downloadURL.searchParams.set("quality", "128");

        const downloadData = await fetchJSON(
            downloadURL.toString(),
            120000
        );

        if (downloadData.success === false) {
            throw new Error(
                downloadData.error ||
                "دانلود آهنگ ناموفق بود."
            );
        }

        const fileURL = getDownloadUrl(downloadData);

        if (!fileURL) {
            throw new Error(
                "لینک فایل MP3 در پاسخ دانلودر پیدا نشد."
            );
        }

        // دریافت فایل صوتی
        const audioResponse = await fetch(fileURL, {
            signal: AbortSignal.timeout(120000)
        });

        if (!audioResponse.ok) {
            throw new Error(
                "دریافت فایل صوتی ناموفق بود."
            );
        }

        const contentType =
            audioResponse.headers.get("content-type") || "";

        if (
            contentType.includes("application/json") ||
            contentType.includes("text/html")
        ) {
            throw new Error(
                "لینک دانلود به‌جای فایل صوتی، پاسخ متنی برگرداند."
            );
        }

        const audioBuffer = Buffer.from(
            await audioResponse.arrayBuffer()
        );

        if (!audioBuffer.length) {
            throw new Error("فایل صوتی خالی است.");
        }

        const maxSize = 25 * 1024 * 1024;

        if (audioBuffer.length > maxSize) {
            throw new Error(
                "حجم آهنگ بیشتر از 25 مگابایت است."
            );
        }

        const title =
            downloadData.data?.title ||
            songTitle ||
            "RAEES SULTAN MUSIC";

        const safeName = title
            .replace(/[\\/:*?"<>|]/g, "")
            .slice(0, 100) || "Music";

        // ارسال آهنگ به واتساپ
        await sock.sendMessage(from, {
            audio: audioBuffer,
            mimetype: "audio/mpeg",
            fileName: `${safeName}.mp3`,
            ptt: false
        }, { quoted: m });

        console.log(
            "PLAY SUCCESS:",
            title,
            audioBuffer.length
        );

    } catch (error) {
        console.log("PLAY ERROR:", error);

        await sock.sendMessage(from, {
            text:
                "❌ *دانلود آهنگ ناموفق بود.*\n\n" +
                `📌 دلیل: ${error.message}`
        }, { quoted: m });
    }
}
