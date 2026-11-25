import axios from "axios";

export default async function currency(sock, from, body, m, args) {
    try {
        if (args.length < 3) {
            return await sock.sendMessage(from, { text: "💱 *Currency Converter*\n\nExample:\n!currency 100 USD AFN\n!currency 50 EUR USD" }, { quoted: m });
        }

        const amount = parseFloat(args[0]);
        const fromCur = args[1].toUpperCase();
        const toCur = args[2].toUpperCase();

        if (isNaN(amount)) throw new Error("Invalid amount.");

        await sock.sendMessage(from, { text: "💱 Converting..." }, { quoted: m });

        const res = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCur}`, { timeout: 15000 });
        const rate = res.data.rates[toCur];

        if (!rate) throw new Error("Currency not found.");

        const converted = (amount * rate).toFixed(2);
        const text = `💱 *Currency Exchange*\n\n💰 *Amount:* ${amount} ${fromCur}\n💵 *Converted:* ${converted} ${toCur}`;

        await sock.sendMessage(from, { text }, { quoted: m });

    } catch (error) {
        await sock.sendMessage(from, { text: "❌ Invalid currencies or API error." }, { quoted: m });
    }
}
