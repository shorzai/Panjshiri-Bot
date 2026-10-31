import axios from "axios";

// ================================
// PGR — INCEPTION LABS
// Model: mercury-2
// Command: !pgr
// ================================

// 🔴 کلید API خودت را اینجا قرار بده
const API_KEY = "sk_fabd3d8e7747888b9d2a7874196053dc";

const API_URL = "https://api.inceptionlabs.ai/v1/chat/completions";

export default async function pgr(sock, from, body, m, args) {
  try {
    // ----------------------------
    // بررسی کلید API
    // ----------------------------
    if (!API_KEY || API_KEY === "YOUR_INCEPTION_API_KEY") {
      return await sock.sendMessage(from, {
        text: "❌ کلید Inception API داخل pgr.js تنظیم نشده است."
      });
    }

    // ----------------------------
    // گرفتن متن بعد از !pgr
    // ----------------------------
    const prompt = args?.join(" ").trim();

    if (!prompt) {
      return await sock.sendMessage(from, {
        text: "🤖 استفاده:\n!pgr سلام\n\nمثال:\n!pgr خودت را معرفی کن"
      });
    }

    // ----------------------------
    // درخواست به Inception Labs
    // ----------------------------
    const response = await axios.post(
      API_URL,
      {
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "mercury-2"
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 120000
      }
    );

    // ----------------------------
    // دریافت پاسخ
    // ----------------------------
    const answer =
      response.data?.choices?.[0]?.message?.content ||
      response.data?.choices?.[0]?.text;

    if (!answer) {
      console.log("INCEPTION RESPONSE:", response.data);

      return await sock.sendMessage(from, {
        text: "❌ پاسخ معتبری از Mercury-2 دریافت نشد."
      });
    }

    // ----------------------------
    // ارسال پاسخ به واتساپ
    // ----------------------------
    return await sock.sendMessage(from, {
      text: `🤖 PGR\n\n${answer}`
    });

  } catch (error) {
    console.error(
      "❌ PGR / INCEPTION ERROR:",
      error.response?.data || error.message
    );

    const apiError =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;

    return await sock.sendMessage(from, {
      text: `❌ خطا در اتصال به Inception Labs:\n\n${apiError}`
    });
  }
}