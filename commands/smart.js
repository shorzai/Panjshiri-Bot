export default async function smart(sock, from, body, m, args) {
  try {

    const text = (body || "").toLowerCase().trim();

    if (!text) return;

    // 🟢 reaction start
    try {
      await sock.sendMessage(from, {
        react: { text: "🧠", key: m.key }
      });
    } catch {}

    // =========================
    // 1. GREETING DETECTION
    // =========================
    const greetings = ["hi", "hello", "سلام", "salam", "hey"];

    if (greetings.some(g => text.includes(g))) {
      return sock.sendMessage(from, {
        text: "👋 سلام! من Smart Assistant هستم\nچطور کمکت کنم؟"
      });
    }

    // =========================
    // 2. BOT INFO REQUEST
    // =========================
    if (text.includes("who are you") || text.includes("ربات") || text.includes("کی هستی")) {
      return sock.sendMessage(from, {
        text: `
🤖 Smart Assistant

• Bot Type: AI Hybrid
• Mode: Auto Response
• Status: ACTIVE 🟢
        `
      });
    }

    // =========================
    // 3. HELP REQUEST
    // =========================
    if (text.includes("help") || text.includes("menu")) {
      return sock.sendMessage(from, {
        text: `
📌 SMART MENU

🤖 AI Chat
👥 Group Tools
📊 System Info
🎮 Fun Commands

Type anything... I will understand 🧠
        `
      });
    }

    // =========================
    // 4. UNKNOWN → AI MODE
    // =========================
    try {
      const res = await fetch("https://api.simsimi.vn/v2/simtalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: text })
      });

      if (res.ok) {
        const data = await res.json();

        const answer =
          data?.[0]?.generated_text ||
          data?.generated_text ||
          data?.answer;

        if (answer) {
          return sock.sendMessage(from, {
            text: `🤖 ${answer}`
          });
        }
      }
    } catch {}

    // =========================
    // 5. FALLBACK RESPONSE
    // =========================
    return sock.sendMessage(from, {
      text: "❓ متوجه نشدم\nلطفاً واضح‌تر بگو یا از AI استفاده کن"
    });

  } catch (e) {
    console.log("SMART ERROR:", e);

    return sock.sendMessage(from, {
      text: "❌ Smart Assistant error"
    });
  }
}