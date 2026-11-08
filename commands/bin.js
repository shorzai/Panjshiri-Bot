export default async function bin(sock, from, body, m, args) {
    try {
        const input = args.join(" ");
        if (!input) {
            return await sock.sendMessage(from, { text: "⚠️ متن یا کد باینری را وارد کنید.\nمثال:\n!bin سلام\n!bin 01110011" }, { quoted: m });
        }

        let result = "";

        // چک میکنه اگر فقط 0 و 1 بود، باینری رو به متن تبدیل کنه
        if (/^[01\s]+$/.test(input)) {
            const cleanBin = input.replace(/\s/g, '');
            const chunks = cleanBin.match(/.{1,8}/g) || [];
            result = chunks.map(char => String.fromCharCode(parseInt(char, 2))).join('');
            result = `📝 *متن استخراج‌شده:*\n${result}`;
        } else {
            // اگر متن بود، به باینری تبدیل کنه
            result = input.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
            result = `💻 *کد باینری:*\n${result}`;
        }

        const text = `
╭━━━〔 🔐 Binary Converter 〕━━━╮
┃
┃ ${result}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯
`;
        await sock.sendMessage(from, { text }, { quoted: m });

    } catch (error) {
        console.log("BIN ERROR:", error);
        await sock.sendMessage(from, { text: "❌ خطا در تبدیل." }, { quoted: m });
    }
}