import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "Mozilla/5.0" }
});

// ==========================
// منابع خبری
// ==========================
const SOURCES = {
  afg: {
    name: "🇦🇫 افغانستان",
    feeds: [
      "https://tolonews.com/rss",
      "https://www.ariananews.af/feed/",
      "https://www.pajhwok.com/feed/"
    ]
  },
  iran: {
    name: "🇮🇷 ایران",
    feeds: [
      "https://feeds.bbci.co.uk/persian/rss.xml",
      "https://rss.dw.com/rdf/rss-fa-all"
    ]
  },
  world: {
    name: "🌍 جهان",
    feeds: [
      "https://feeds.bbci.co.uk/persian/rss.xml"
    ]
  }
};

// ==========================
// گرفتن اخبار از یه منبع
// ==========================
async function fetchFeed(url, limit = 5) {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items || []).slice(0, limit).map(item => ({
      title: item.title || "بدون عنوان",
      link: item.link || "",
      date: item.pubDate || item.isoDate || "",
      summary: (item.contentSnippet || item.content || "").slice(0, 100)
    }));
  } catch (e) {
    console.log(`FEED ERROR [${url}]:`, e.message);
    return [];
  }
}

// ==========================
// گرفتن از چند منبع
// ==========================
async function getNews(category = "afg", limit = 5) {
  const src = SOURCES[category] || SOURCES.afg;
  const results = [];

  for (const feedUrl of src.feeds) {
    const items = await fetchFeed(feedUrl, limit);
    results.push(...items);
    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
}

// ==========================
// فرمت تاریخ
// ==========================
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fa-IR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

// ==========================
// دستور اصلی
// ==========================
export default async function news(sock, from, body, m, args) {
  const sub = (args[0] || "").toLowerCase();

  // لیست منابع
  if (!sub || sub === "help" || sub === "list") {
    return sock.sendMessage(from, {
      text:
`📰 *دستور اخبار*

استفاده:
.news afg — اخبار افغانستان
.news iran — اخبار ایران
.news world — اخبار جهان

📌 مثال:
.news afg
.news iran`
    }, { quoted: m });
  }

  if (!SOURCES[sub]) {
    return sock.sendMessage(from, {
      text: `❌ منبع *${sub}* موجود نیست.\n\nمنابع موجود:\n${Object.entries(SOURCES).map(([k, v]) => `• ${v.name} → \`.news ${k}\``).join("\n")}`
    }, { quoted: m });
  }

  const loading = await sock.sendMessage(from, {
    text: `📰 در حال دریافت اخبار از ${SOURCES[sub].name}...`
  }, { quoted: m });

  try {
    const items = await getNews(sub, 5);

    if (!items.length) {
      return sock.sendMessage(from, {
        text: "❌ خبری پیدا نشد. ممکنه منبع موقتاً در دسترس نباشه.",
        edit: loading.key
      });
    }

    let text = `📰 *${SOURCES[sub].name}* — آخرین اخبار\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    items.forEach((item, i) => {
      text += `*${i + 1}. ${item.title}*\n`;
      if (item.date) text += `🕐 ${formatDate(item.date)}\n`;
      if (item.summary) text += `📝 ${item.summary.trim()}...\n`;
      if (item.link) text += `🔗 ${item.link}\n`;
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⏰ ${new Date().toLocaleString("fa-IR")}`;

    await sock.sendMessage(from, { text, edit: loading.key });

  } catch (e) {
    console.log("NEWS ERROR:", e.message);
    await sock.sendMessage(from, {
      text: `❌ خطا در دریافت اخبار: ${e.message}`,
      edit: loading.key
    });
  }
}