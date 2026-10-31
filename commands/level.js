import fs from "fs";

const file = "./data/level.json";

let db = {};

// safe load
if (fs.existsSync(file)) {
  try {
    db = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    db = {};
  }
}

// sleep helper
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default async function level(sock, from, body, m) {
  try {
    const user = m.key.participant || from;

    // initialize user
    if (!db[user]) {
      db[user] = { xp: 0, level: 1 };
    }

    const beforeLevel = db[user].level;

    // XP system (same logic, فقط تمیزتر)
    db[user].xp += 10;

    let leveledUp = false;

    if (db[user].xp >= 100) {
      db[user].level += 1;
      db[user].xp = 0;
      leveledUp = true;
    }

    // save safely
    fs.writeFileSync(file, JSON.stringify(db, null, 2));

    // typing effect (human feel)
    await sock.sendPresenceUpdate("composing", from);
    await sleep(800);

    let msg = `
🧠 LEVEL SYSTEM

👤 User: ${user.split("@")[0]}
📊 Level: ${db[user].level}
⚡ XP: ${db[user].xp}/100
`;

    if (leveledUp) {
      msg += `
🎉 LEVEL UP!
⬆️ ${beforeLevel} → ${db[user].level}
🔥 You are getting stronger!
`;
    }

    await sock.sendMessage(from, {
      text: msg
    });

  } catch (e) {
    console.log("Level Error:", e);

    await sock.sendMessage(from, {
      text: "⚠️ خطا در سیستم لول"
    });
  }
}