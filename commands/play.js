const API_KEY = "freekey";

const SEARCH_API =
    "https://pro-apis.zone.id/api/search/yts"\;

// 🔁 دانلودر جایگزین (چون دانلودر pro-apis.zone.id کار نمی‌کرد)
const VKR_API_KEY = "vkrdownloader";
const VKR_DOWNLOAD_API = "https://vkrdownloader.xyz/server/"\;

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

// 🔁 درخواست به VKrDownloader (بدون هدر x-api-key چون کلید توی خود URL هست)
async function fetchVkrJSON(url, timeout = 60000) {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(timeout)
    });

    const text = await response.text();

    let data;

    try {
        data = JSON.parse(text);
    } catch {
        throw new Error("پاسخ دانلودر معتبر نیست.");
    }

    if (!response.ok) {
        throw new Error(
            data?.error || data?.message || `Downloader Error: ${response.status}`
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

// 🔁 گرفتن لیست فرمت‌ها از پاسخ VKrDownloader (چند ساختار محتمل را پوشش می‌دهد)
function getVkrFormats(data) {
    const candidates = [
        data?.formats,
        data?.data?.formats,
        data?.result?.formats,
        data?.medias,
        data?.data?.medias
    ];

    return candidates.find(Array.isArray) || [];
}

// 🔁 از بین فرمت‌ها، اول دنبال فرمت صوتی (mp3/m4a/aac/opus) می‌گردیم
function pickAudioFormat(formats) {
    return formats.find(f => {
        const ext = (f.ext || f.format_id || "").toString().toLowerCase();
        return (
            ext.includes("mp3") ||
            ext.includes("m4a") ||
            ext.includes("aac") ||
            ext.includes("opus") ||
            ext.includes("audio")
        );
    });
}

// 🔁 اگر فرمت صوتی نبود، پایین‌ترین کیفیت ویدیو را برمی‌داریم (برای کاهش حجم)
function pickSmallestVideoFormat(formats) {
    const videos = formats.filter(f => {
        const ext = (f.ext || "").toString().toLowerCase();
        return ext === "mp4" || ext === "webm";
    });

    if (!videos.length) return formats[0];

    return videos.sort((a, b) => {
        const qa = parseInt(a.format_id) || 9999;
        const qb = parseInt(b.format_id) || 9999;
        return qa - qb;
    })[0];
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

        // جست‌وجوی آهنگ (دست‌نخورده، چون سالم کار می‌کند)
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
                "در حال دانلود، لطفاً منتظر بمانید..."
        }, { quoted: m });

        // ------------------------------------
        // 🔁 درخواست دانلود از VKrDownloader
        // ------------------------------------

        const downloadURL = new URL(VKR_DOWNLOAD_API);

        downloadURL.searchParams.set("api_key", VKR_API_KEY);
        downloadURL.searchParams.set("vkr", videoUrl);

        const downloadData = await fetchVkrJSON(
            downloadURL.toString(),
            120000
        );

        const formats = getVkrFormats(downloadData);

        if (!formats.length) {
            throw new Error(
                "هیچ فرمت دانلودی در پاسخ دانلودر پیدا نشد."
            );
        }

        // اولویت با فرمت صوتی، در غیر این صورت پایین‌ترین کیفیت ویدیو
        const audioFormat = pickAudioFormat(formats);
        const chosenFormat = audioFormat || pickSmallestVideoFormat(formats);

        const fileURL = chosenFormat?.url;

        if (!fileURL) {
            throw new Error(
                "لینک فایل در پاسخ دانلودر پیدا نشد."
            );
        }

        // دریافت فایل
        const fileResponse = await fetch(fileURL, {
            signal: AbortSignal.timeout(120000)
        });

        if (!fileResponse.ok) {
            throw new Error(
                "دریافت فایل از دانلودر ناموفق بود."
            );
        }

        const contentType =
            fileResponse.headers.get("content-type") || "";

        if (
            contentType.includes("application/json") ||
            contentType.includes("text/html")
        ) {
            throw new Error(
                "لینک دانلود به‌جای فایل، پاسخ متنی برگرداند."
            );
        }

        const fileBuffer = Buffer.from(
            await fileResponse.arrayBuffer()
        );

        if (!fileBuffer.length) {
            throw new Error("فایل دریافتی خالی است.");
        }

        const maxSize = 90 * 1024 * 1024;

        if (fileBuffer.length > maxSize) {
            throw new Error(
                "حجم فایل بیشتر از حد مجاز ارسال در واتساپ است."
            );
        }

        const title =
            downloadData?.title ||
            downloadData?.data?.title ||
            songTitle ||
            "RAEES SULTAN MUSIC";

        const safeName = title
            .replace(/[\\/:*?"<>|]/g, "")
            .slice(0, 100) || "Music";

        // اگر فرمت صوتی پیدا شد، به‌صورت آهنگ ارسال می‌شود
        if (audioFormat) {
            await sock.sendMessage(from, {
                audio: fileBuffer,
                mimetype: "audio/mpeg",
                fileName: `${safeName}.mp3`,
                ptt: false
            }, { quoted: m });
        } else {
            // در غیر این صورت به‌صورت ویدیو (چون فرمت صوتی جدا در دسترس نبود)
            await sock.sendMessage(from, {
                video: fileBuffer,
                mimetype: "video/mp4",
                fileName: `${safeName}.mp4`,
                caption: `🎬 ${title}\n\n👑 RAEES SULTAN BOT`
            }, { quoted: m });
        }

        console.log(
            "PLAY SUCCESS:",
            title,
            fileBuffer.length
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
