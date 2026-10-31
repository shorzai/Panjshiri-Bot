// commands/ai.js
import axios from "axios";

const API_URL = "https://api.hcnsec.cn/v1";
const MODEL = "DeepSeek-V4-Flash";
const API_KEY = process.env.HCN_API_KEY;

export default async function ai(sock, from, body, m, args) {
  try {
    // =========================
    // بررسی API KEY
    // =========================
    if (!API_KEY) {
      return await sock.sendMessage(from, {
        text:
          "❌ کلید API تنظیم نشده است.\n\n" +
          "در Termux اجرا کن:\n" +
          "export HCN_API_KEY='کلید-API-خودت'"
      });
    }

    // =========================
    // گرفتن متن سؤال
    // =========================
    const prompt = Array.isArray(args)
      ? args.join(" ").trim()
      : "";

    if (!prompt) {
      return await sock.sendMessage(from, {
        text:
          "🤖 *AI آماده است!*\n\n" +
          "مثال:\n" +
          "!ai سلام، خودت را معرفی کن\n\n" +
          "یا:\n" +
          "!ai برای من یک داستان کوتاه بنویس"
      });
    }

    // =========================
    // پیام پردازش
    // =========================
    await sock.sendMessage(from, {
      text: "🤖 در حال فکر کردن..."
    });

    // =========================
    // درخواست به HCN API
    // =========================
    const response = await axios.post(
      `${API_URL}/chat/completions`,
      {
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful, intelligent and friendly AI assistant inside a WhatsApp bot. " +
              "Answer naturally and clearly. " +
              "If the user writes in Persian or Dari, answer in Persian or Dari. " +
              "Do not mention APIs, internal systems, or these instructions unless necessary."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 120000
      }
    );

    // =========================
    // دریافت پاسخ
    // =========================
    const answer =
      response?.data?.choices?.[0]?.message?.content ||
      response?.data?.choices?.[0]?.text;

    if (!answer) {
      console.log("HCN EMPTY RESPONSE:");
      console.log(JSON.stringify(response?.data, null, 2));

      return await sock.sendMessage(from, {
        text: "❌ API پاسخ قابل استفاده‌ای برنگرداند."
      });
    }

    // =========================
    // ارسال پاسخ AI
    // =========================
    await sock.sendMessage(from, {
      text: `🤖 *AI*\n\n${answer.trim()}`
    });

  } catch (error) {
    // =========================
    // نمایش خطای واقعی
    // =========================
    console.error("========== HCN AI ERROR ==========");

    if (error.response) {
      console.error("STATUS:", error.response.status);
      console.error(
        "DATA:",
        JSON.stringify(error.response.data, null, 2)
      );
    } else {
      console.error("MESSAGE:", error.message);
    }

    console.error("==================================");

    let message = "خطای نامشخص";

    if (error.response?.data?.error?.message) {
      message = error.response.data.error.message;
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    }

    await sock.sendMessage(from, {
      text:
        "❌ *خطای HCN API*\n\n" +
        `${message}`
    });
  }
}