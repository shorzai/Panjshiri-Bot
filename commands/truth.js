const truths = [
    "آخرین بار کی به کسی دروغ گفتی؟",
    "بزرگترین ترست چیه؟",
    "تو زندگیت پشیمون ترین کاری که کردی چیه؟",
    "آخرین بار کی گریه کردی؟",
    "کسی رو توی این گروه دوست داری؟"
];

export default async function truth(sock, from, body, m) {
    const random = truths[Math.floor(Math.random() * truths.length)];
    await sock.sendMessage(from, { text: `🎯 *حقیقت:*\n\n${random}` }, { quoted: m });
}
