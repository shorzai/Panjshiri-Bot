import fs from "fs";
import smart from "./commands/smart.js";
import crashCmd, { stopCrash } from "./commands/crash.js";
import { checkAntilink } from "./commands/antilink.js";
import { checkBadWord } from "./commands/badword.js";
import { checkAntiReply } from "./commands/antireply.js";
import { checkWatch } from "./commands/watch.js";
import { handleRPGInput } from "./lib/rpg_engine.js";
import { trackSocial } from "./commands/social.js";

const commands = new Map();

const showderFile = "./data/showder.json";
let lastMessages = new Map();

const badWords = [
    "حرامی ",
    "کص مادر",
    "badword"
];

function canLearn(text) {
    const t = text.toLowerCase();

    if (t.includes("http") || t.includes("www.")) {
        return false;
    }

    if (t.length < 3) {
        return false;
    }

    if (t.length > 500) {
        return false;
    }

    for (const word of badWords) {
        if (t.includes(word)) {
            return false;
        }
    }

    return true;
}

// =======================
// SHOWDER MEMORY
// =======================

function loadShowder() {
    if (!fs.existsSync(showderFile)) {
        fs.mkdirSync("./data", { recursive: true });

        fs.writeFileSync(
            showderFile,
            JSON.stringify({
                private: {},
                group: {}
            }, null, 2)
        );
    }

    return JSON.parse(
        fs.readFileSync(showderFile, "utf8")
    );
}

function saveShowder(data) {
    fs.writeFileSync(
        showderFile,
        JSON.stringify(data, null, 2)
    );
}

// پاکسازی متن

function cleanText(text) {
    return text
        .toLowerCase()
        .replace(/[؟?!.,،]/g, "")
        .trim();
}

// =======================
// LOAD COMMANDS SAFE
// =======================

const files = fs.readdirSync("./commands")
    .filter(file => file.endsWith(".js"));

for (const file of files) {
    try {
        const cmd = await import(`./commands/${file}`);

        if (cmd.default) {
            commands.set(
                file.replace(".js", "").toLowerCase(),
                cmd.default
            );
        }

    } catch (e) {
        console.log(
            "LOAD ERROR:",
            file,
            e.message
        );
    }
}

// =======================
// HANDLER
// =======================

export default async function handler(
    sock,
    from,
    body,
    m
) {
    try {

        if (!body) return;

        body = body.trim();

        // ================================
        // 🕸️ شبکه اجتماعی — اول ثبت کن
        // ================================

        try {
            trackSocial(from, m);
        } catch (e) {
            console.log("SOCIAL TRACK ERROR:", e.message);
        }

        // ================================
        // 🛡️ محافظت‌ها (به ترتیب)
        // ================================

        // آنتی لینک
        try {
            if (await checkAntilink(sock, from, body, m)) return;
        } catch (e) {
            console.log("ANTILINK HANDLER ERROR:", e.message);
        }

        // کلمات ممنوعه
        try {
            if (await checkBadWord(sock, from, body, m)) return;
        } catch (e) {
            console.log("BADWORD HANDLER ERROR:", e.message);
        }

        // ضد ریپلای
        try {
            if (await checkAntiReply(sock, from, body, m)) return;
        } catch (e) {
            console.log("ANTIREPLY HANDLER ERROR:", e.message);
        }

        // 🚨 ردیاب کلمات
        try {
            await checkWatch(sock, from, body, m);
        } catch (e) {
            console.log("WATCH HANDLER ERROR:", e.message);
        }

        // =======================
        // 🎲 RPG GAME
        // =======================

        try {
            const isRPG = await handleRPGInput(
                sock,
                from,
                body,
                m
            );

            if (isRPG) return;

        } catch (e) {
            console.log("RPG ERROR:", e.message);
        }

        // =======================
        // SHOWDER AUTO LEARN
        // =======================

        if (
            !body.startsWith("!") &&
            !m.key.fromMe
        ) {

            const memory = loadShowder();

            const type = from.includes("@g.us")
                ? "group"
                : "private";

            if (!memory[type]) {
                memory[type] = {};
            }

            const text = cleanText(body);

            // =======================
            // SHOWDER ANSWER SCORE
            // =======================

            if (
                memory._status !== false &&
                memory[type][text]
            ) {

                let answers = memory[type][text];

                if (!Array.isArray(answers)) {
                    answers = [
                        {
                            text: answers,
                            score: 1
                        }
                    ];

                    memory[type][text] = answers;
                }

                answers.sort(
                    (a, b) => b.score - a.score
                );

                let answer = answers[0];

                answer.score++;

                saveShowder(memory);

                await sock.sendMessage(
                    from,
                    {
                        text: answer.text
                    },
                    {
                        quoted: m
                    }
                );

                return;
            }

            // =======================
            // LEARN
            // =======================

            if (
                memory._status !== false &&
                canLearn(body)
            ) {

                const old = lastMessages.get(from);

                if (old && old !== text) {

                    if (!memory[type][old]) {

                        memory[type][old] = [
                            {
                                text: body,
                                score: 1
                            }
                        ];

                    } else {

                        let exists = memory[type][old].find(
                            x => x.text === body
                        );

                        if (!exists) {
                            memory[type][old].push({
                                text: body,
                                score: 1
                            });
                        }
                    }

                    saveShowder(memory);
                }

                lastMessages.set(
                    from,
                    text
                );
            }

            // =======================
            // SMART
            // =======================

            try {
                await smart(
                    sock,
                    from,
                    body,
                    m
                );

            } catch (e) {
                console.log(
                    "SMART ERROR:",
                    e.message
                );
            }

            return;
        }

        // =======================
        // COMMAND PARSE
        // =======================

        let commandText = body.trim();

        // پشتیبانی از !play و !playآهنگ
        if (/^!play/i.test(commandText)) {
            const query = commandText.slice(5).trim();

            commandText = query
                ? `!play ${query}`
                : "!play";
        }

        const match = commandText.match(
            /^!(\S+)(?:\s+(.*))?$/s
        );

        if (!match) return;

        const command = match[1].toLowerCase();

        const args = match[2]
            ? match[2].trim().split(/\s+/)
            : [];

        const cmd = commands.get(command);

        if (cmd) {

            try {
                await cmd(
                    sock,
                    from,
                    commandText,
                    m,
                    args
                );

            } catch (e) {
                console.log(
                    "COMMAND ERROR:",
                    command,
                    e
                );
            }

            return;
        }

        // =======================
        // SPECIAL COMMANDS
        // =======================

        switch (command) {

            case "pgr": {
                const subCmd = args[0];

                if (subCmd === "crash") {
                    await crashCmd(
                        sock,
                        from,
                        body,
                        m,
                        args
                    );

                } else if (subCmd === "stop") {
                    await stopCrash(
                        sock,
                        from,
                        body,
                        m,
                        args
                    );

                } else {
                    await sock.sendMessage(
                        from,
                        {
                            text: "دستور نامعتبر. مثال: !pgr crash <شماره> یا !pgr stop"
                        },
                        {
                            quoted: m
                        }
                    );
                }

                break;
            }

            case "ping":
                await sock.sendMessage(
                    from,
                    {
                        text: "pong 🏓"
                    }
                );
                break;

            case "owner":
                await sock.sendMessage(
                    from,
                    {
                        text: "👑 OWNER: SULTAN SHIRZAI"
                    }
                );
                break;
        }

    } catch (e) {
        console.log(
            "HANDLER ERROR:",
            e
        );
    }
}