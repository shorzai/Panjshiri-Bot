const dares = [
    "برو به یکی از مخاطبینت پیام بده و بگو 'من عاشقتم'!",
    "یه عکس سلفی با شکلک خنده‌دار بفرست.",
    "۱۰ بار پشت سر هم بگو 'من یک رباتم'.",
    "اسم ۳ نفر از اعضای گروه رو با حروف الفبا بگو.",
    "یه ویس بخون و توش بخون."
];

export default async function dare(sock, from, body, m) {
    const random = dares[Math.floor(Math.random() * dares.length)];
    await sock.sendMessage(from, { text: `🔥 *جرئت:*\n\n${random}` }, { quoted: m });
}
