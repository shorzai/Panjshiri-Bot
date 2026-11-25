import axios from "axios";

// ========================================
// PROFESSIONAL LOGO MAKER 2 (Logo Lava API)
// ========================================

const API_BASE = "https://api.logolava.com/v2/logo.png"\;

const VALID_TONES = [
    "modern", "minimal", "tech", "corporate", "trustworthy", 
    "friendly", "playful", "bold", "elegant", "luxury", 
    "organic", "natural", "retro", "vintage", "edgy", 
    "energetic", "calm", "creative", "handmade", "futuristic"
];

export default async function logomaker2(sock, from, body, m, args) {
    try {
        const input = args.join(" ").trim();

        // 1. Show Help Menu
        if (!input || input.toLowerCase() === "help") {
            const helpText = `
🎨 *PROFESSIONAL LOGO MAKER 2*

Method:
!logo2 [Brand Name]
!logo2 [Brand Name] [Tone]

Examples:
!logo2 MyBrand
!logo2 MyBrand tech
!logo2 MyBrand luxury

🎯 *Available Tones:*
modern, minimal, tech, corporate, trustworthy, friendly, playful, bold, elegant, luxury, organic, natural, retro, vintage, edgy, energetic, calm, creative, handmade, futuristic

👑 *RAEES SULTAN BOT*
`;
            return await sock.sendMessage(from, { text: helpText }, { quoted: m });
        }

        // 2. Parse Brand Name and Tone
        let brandName = input;
        let tone = "";

        const words = input.split(" ");
        const lastWord = words[words.length - 1].toLowerCase();

        if (VALID_TONES.includes(lastWord) && words.length > 1) {
            tone = lastWord;
            brandName = words.slice(0, -1).join(" ");
        }

        // 3. Build API URL
        const url = new URL(API_BASE);
        url.searchParams.set("text", brandName.substring(0, 60));
        if (tone) url.searchParams.set("tone", tone);
        // Random seed for a fresh design every time
        url.searchParams.set("seed", Math.floor(Math.random() * 1000000));

        await sock.sendMessage(from, { text: "🎨 Generating your professional logo..." }, { quoted: m });

        // 4. Fetch Image
        const response = await axios.get(url.toString(), {
            responseType: "arraybuffer",
            timeout: 30000
        });

        const imageBuffer = Buffer.from(response.data, "binary");

        // 5. Send Image
        const caption = `✅ *Logo Generated Successfully!*\n\n` +
                        `📝 *Name:* ${brandName}\n` +
                        `🎨 *Tone:* ${tone || "auto"}\n\n` +
                        `👑 *RAEES SULTAN BOT*`;

        await sock.sendMessage(from, { 
            image: imageBuffer, 
            caption 
        }, { quoted: m });

    } catch (error) {
        console.error("LOGO2 ERROR:", error.message);
        await sock.sendMessage(from, { 
            text: "❌ Error generating logo. Please try again with a shorter name." 
        }, { quoted: m });
    }
}
