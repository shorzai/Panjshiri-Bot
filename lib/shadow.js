import fs from "fs";

const path = "./data/shadow.json";


function load() {

    try {

        if (!fs.existsSync("./data")) {
            fs.mkdirSync("./data");
        }

        if (!fs.existsSync(path)) {

            fs.writeFileSync(
                path,
                JSON.stringify({
                    enabled: true,
                    users: {}
                }, null, 2)
            );

        }

        return JSON.parse(
            fs.readFileSync(path, "utf8")
        );

    } catch (e) {

        console.log("SHADOW LOAD ERROR:", e);

        return {
            enabled: true,
            users: {}
        };

    }

}


function save(data) {

    try {

        fs.writeFileSync(
            path,
            JSON.stringify(data, null, 2)
        );

    } catch (e) {

        console.log("SHADOW SAVE ERROR:", e);

    }

}


function getRank(level) {

    if (level >= 100)
        return "👑 LEGEND";

    if (level >= 50)
        return "💎 ELITE";

    if (level >= 20)
        return "🥇 PRO";

    if (level >= 5)
        return "🥈 ACTIVE";

    return "🥉 NEWBIE";

}


export default async function shadow(sock) {

    sock.ev.on(
        "messages.upsert",
        async ({ messages }) => {

            try {

                const m = messages?.[0];

                if (!m?.message)
                    return;


                const chat =
                    m.key.remoteJid;


                // فقط گروه
                if (!chat?.endsWith("@g.us"))
                    return;


                const user =
                    m.key.participant;


                if (!user)
                    return;


                const db = load();


                // Shadow خاموش
                if (!db.enabled)
                    return;


                if (!db.users[user]) {

                    db.users[user] = {

                        messages: 0,

                        today: 0,

                        xp: 0,

                        weeklyXP: 0,

                        level: 1,

                        rank: "🥉 NEWBIE",

                        warnings: 0,

                        lastMessage: 0,

                        lastDate: "",

                        createdAt:
                            new Date().toISOString()

                    };

                }


                const data =
                    db.users[user];


                const now =
                    Date.now();


                const today =
                    new Date()
                        .toISOString()
                        .slice(0, 10);


                /*
                 * تشخیص فاصله پیام‌ها
                 * قبل از تغییر lastMessage
                 */
                const gap =
                    now - (data.lastMessage || 0);


                /*
                 * آمار روزانه
                 */
                if (data.lastDate !== today) {

                    data.today = 0;

                    data.lastDate = today;

                }


                data.messages += 1;

                data.today += 1;


                /*
                 * XP فقط اگر کاربر
                 * خیلی سریع پیام نفرستاده باشد
                 */
                if (gap >= 5000 || !data.lastMessage) {

                    data.xp += 5;

                    data.weeklyXP =
                        (data.weeklyXP || 0) + 5;

                }


                /*
                 * سطح قبلی
                 */
                const oldLevel =
                    data.level || 1;


                /*
                 * Level جدید
                 */
                data.level =
                    Math.floor(
                        data.xp / 100
                    ) + 1;


                /*
                 * Rank جدید
                 */
                data.rank =
                    getRank(data.level);


                /*
                 * ذخیره آخرین فعالیت
                 */
                data.lastMessage =
                    now;


                /*
                 * تشخیص رفتار خیلی سریع
                 *
                 * فقط ثبت Warning
                 * بدون Kick خودکار
                 */
                if (
                    gap > 0 &&
                    gap < 1000
                ) {

                    data.warnings =
                        (data.warnings || 0) + 1;

                }


                /*
                 * LEVEL UP
                 */
                if (data.level > oldLevel) {

                    try {

                        await sock.sendMessage(
                            chat,
                            {
                                text:
`
╭━━〔 🎉 LEVEL UP 〕━━╮

👤 USER:
@${user.split("@")[0]}

⭐ NEW LEVEL:
${data.level}

🏆 RANK:
${data.rank}

💬 MESSAGES:
${data.messages}

⭐ TOTAL XP:
${data.xp}

📅 WEEKLY XP:
${data.weeklyXP || 0}

🔥 Keep Active!

╰━━━━━━━━━━━━━━━━╯
`,
                                mentions: [user]
                            }
                        );

                    } catch (e) {

                        console.log(
                            "SHADOW LEVELUP ERROR:",
                            e
                        );

                    }

                }


                /*
                 * ذخیره Level فعلی
                 * برای جلوگیری از پیام تکراری
                 */
                data.oldLevel =
                    data.level;


                save(db);


            } catch (e) {

                console.log(
                    "SHADOW ERROR:",
                    e
                );

            }

        }
    );

}