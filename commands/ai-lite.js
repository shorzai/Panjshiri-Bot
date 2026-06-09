import fetch from "node-fetch";

// ⏱ delay helper
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 🔁 simple retry system
async function requestAI(q, retry = 2) {
  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: q }),
        timeout: 30000
      }
    );

    if (!res.ok) throw new Error("HTTP " + res.status);

    return await res.json();

  } catch (e) {
    if (retry > 0) {
      await sleep(1000);
      return requestAI(q, retry - 1);
    }
    throw e;
  }
}

export default async function ai(sock, from, body, m, args) {

  try {

    const q = args.join(" ").trim();

    if (!q) {
      return sock.sendMessage(from, {
        text: "📌 مثال:\n!ai hello"
      });
    }

    // 🤖 reaction start
    try {
      await sock.sendMessage(from, {
        react: { text: "🤖", key: m.key }
      });
    } catch {}

    // ⏳ typing effect
    await sock.sendPresenceUpdate("composing", from);

    // 🧠 call AI
    let data = await requestAI(q);

    // =========================
    // SAFE PARSING (IMPORTANT)
    // =========================
    let ans =
      data?.generated_text ||
      data?.[0]?.generated_text ||
      data?.answer ||
      data;

    if (!ans) {
      return sock.sendMessage(from, {
        text: "❌ no answer from AI"
      });
    }

    // limit message size
    if (typeof ans === "string" && ans.length > 3500) {
      ans = ans.slice(0, 3500);
    }

    await sleep(600);

    await sock.sendMessage(from, {
      text: `🤖 AI RESPONSE\n\n${ans}`
    });

    // ✅ done reaction
    try {
      await sock.sendMessage(from, {
        react: { text: "✅", key: m.key }
      });
    } catch {}

  } catch (e) {

    console.log("AI ERROR:", e);

    // specific error handling
    if (e.message?.includes("HTTP")) {
      return sock.sendMessage(from, {
        text: "⚠️ AI API مشکل دارد (سرور HuggingFace)"
      });
    }

    return sock.sendMessage(from, {
      text: "❌ AI failed (network or timeout)"
    });

  }
}