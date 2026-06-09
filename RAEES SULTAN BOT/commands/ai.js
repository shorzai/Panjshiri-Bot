import fetch from "node-fetch";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 🔍 check API is alive
async function checkAPI() {
  try {
    const res = await fetch("https://api.simsimi.vn/v2/simtalk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: "hi" })
    });

    return res.ok;
  } catch {
    return false;
  }
}

export default async function ai(sock, from, body, m, args) {
  try {
    const q = args.join(" ").trim();

    if (!q) {
      return sock.sendMessage(from, {
        text: "📌 مثال:\n!ai سلام"
      });
    }

    // 🤖 reaction start
    try {
      await sock.sendMessage(from, {
        react: { text: "🤖", key: m.key }
      });
    } catch {}

    // =========================
    // 🔍 API CHECK (NEW FEATURE)
    // =========================
    const isAlive = await checkAPI();

    if (!isAlive) {
      return sock.sendMessage(from, {
        text: "⚠️ AI API فعلاً خاموش یا در دسترس نیست\n⏳ لطفاً بعداً تلاش کنید"
      });
    }

    // =========================
    // TIMEOUT CONTROL
    // =========================
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    // small delay (human feel)
    await sleep(600);

    const response = await fetch(
      "https://api.simsimi.vn/v2/simtalk",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: q }),
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      return sock.sendMessage(from, {
        text: `❌ API Error: ${response.status}`
      });
    }

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return sock.sendMessage(from, {
        text: "❌ پاسخ API خراب است"
      });
    }

    // loading state
    if (data?.error?.toLowerCase?.().includes("loading")) {
      return sock.sendMessage(from, {
        text: "⏳ AI هنوز آماده نیست، چند لحظه بعد تلاش کن"
      });
    }

    let answer =
      data?.[0]?.generated_text ||
      data?.generated_text ||
      data?.answer ||
      null;

    if (!answer) {
      return sock.sendMessage(from, {
        text: "❌ پاسخی پیدا نشد"
      });
    }

    if (answer.length > 4000) {
      answer = answer.slice(0, 4000);
    }

    // ✨ typing effect
    await sock.sendPresenceUpdate("composing", from);

    await sleep(800);

    await sock.sendMessage(from, {
      text: `🤖 AI RESPONSE\n\n${answer}`
    });

    // done reaction
    try {
      await sock.sendMessage(from, {
        react: { text: "✅", key: m.key }
      });
    } catch {}

  } catch (e) {
    console.log("AI ERROR:", e);

    if (e.name === "AbortError") {
      return sock.sendMessage(from, {
        text: "⏰ زمان درخواست تمام شد"
      });
    }

    if (e.code === "ENOTFOUND" || e.code === "ECONNRESET") {
      return sock.sendMessage(from, {
        text: "🌐 مشکل اینترنت یا API"
      });
    }

    return sock.sendMessage(from, {
      text: "❌ خطا در اجرای AI"
    });
  }
}