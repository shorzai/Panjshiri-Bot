import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";

export default async function sticker(sock, from, body, m) {

  let input = null;
  let output = null;

  try {

    const context =
      m.message?.extendedTextMessage?.contextInfo;

    const quotedMessage =
      context?.quotedMessage;

    if (!quotedMessage) {
      return await sock.sendMessage(from, {
        text: "📌 یک عکس یا ویدیو را ریپلای کن و بنویس !sticker"
      });
    }

    let type = null;

    if (quotedMessage.imageMessage) {
      type = "image";
    } 
    else if (quotedMessage.videoMessage) {
      type = "video";
    } 
    else {
      return await sock.sendMessage(from, {
        text: "❌ فقط عکس یا ویدیو پشتیبانی می‌شود"
      });
    }

    const quotedKey = {
      remoteJid: from,
      id: context.stanzaId,
      participant: context.participant
    };

    const quoted = {
      key: quotedKey,
      message: quotedMessage
    };

    console.log("📥 Downloading media...");

    const buffer =
      await sock.downloadMediaMessage(
        quoted,
        "buffer",
        {}
      );

    if (!buffer) {
      throw new Error("Media download returned empty buffer");
    }

    const id = Date.now();

    input = `./temp_${id}`;
    output = `./sticker_${id}.webp`;

    fs.writeFileSync(input, buffer);

    console.log("🛠️ Creating sticker...");

    if (type === "image") {

      await sharp(input)
        .resize(512, 512, {
          fit: "contain",
          background: {
            r: 0,
            g: 0,
            b: 0,
            alpha: 0
          }
        })
        .webp({
          quality: 85
        })
        .toFile(output);

    } else {

      await new Promise((resolve, reject) => {

        ffmpeg(input)
          .inputOptions([
            "-analyzeduration 10M",
            "-probesize 10M"
          ])
          .outputOptions([
            "-vcodec libwebp",
            "-vf scale=512:512:force_original_aspect_ratio=decrease",
            "-loop 0",
            "-preset default",
            "-an",
            "-t 8"
          ])
          .format("webp")
          .on("start", command => {
            console.log("FFmpeg:", command);
          })
          .on("end", resolve)
          .on("error", reject)
          .save(output);

      });

    }

    if (!fs.existsSync(output)) {
      throw new Error("Sticker file was not created");
    }

    await sock.sendMessage(from, {
      sticker: {
        url: output
      }
    });

    console.log("✅ Sticker sent");

  } catch (e) {

    console.log(
      "❌ STICKER ERROR:",
      e
    );

    await sock.sendMessage(from, {
      text:
        `❌ ساخت استیکر ناموفق بود\n\n` +
        `⚠️ ${e.message || "Unknown error"}`
    });

  } finally {

    try {
      if (input && fs.existsSync(input)) {
        fs.unlinkSync(input);
      }
    } catch {}

    try {
      if (output && fs.existsSync(output)) {
        fs.unlinkSync(output);
      }
    } catch {}

  }

}