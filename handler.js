import fs from "fs";

const commands = new Map();

// ===================
// LOAD COMMAND FILES
// ===================

const files = fs.readdirSync("./commands")
.filter(file => file.endsWith(".js"));

for (const file of files) {

  const cmd = await import(`./commands/${file}`);

  const name = file.replace(".js", "").toLowerCase();

  commands.set(name, cmd.default);

}

// ===================
// HANDLER (SAFE VERSION)
// ===================

export default async function handler(sock, from, body, m) {

try {

  if (!body) return;

  if (!body.startsWith("!")) return;

  const args = body.slice(1).trim().split(/ +/);

  const command = args.shift().toLowerCase();

  // ===================
  // 1. FILE COMMANDS (FIRST PRIORITY)
  // ===================

  const cmd = commands.get(command);

  if (cmd) {

    if (typeof cmd === "function") {
      await cmd(sock, from, body, m, args);
      return;
    }

    if (typeof cmd.execute === "function") {
      await cmd.execute(sock, from, m, args, body);
      return;
    }

  }

  // ===================
  // 2. SWITCH SYSTEM (OLD SYSTEM - KEEP IT SAME)
  // ===================

  switch (command) {

    case "ping":
    case "owner":
    case "menu": {

      if (command === "ping") {
        await sock.sendMessage(from, { text: "pong 🏓" });
      }

      if (command === "owner") {
        await sock.sendMessage(from, { text: "👑 PANJSHIRI OWNER" });
      }

      if (command === "menu") {
        await sock.sendMessage(from, {
          text: "📋 MENU BOT\n\n!ping\n!owner\n!menu"
        });
      }

      break;
    }

    // 👉 اینجا می‌تونی case های قبلی خودت را بدون تغییر اضافه کنی

  }

} catch (e) {

  console.log("HANDLER ERROR:", e);

  await sock.sendMessage(from, {
    text: "❌ command error"
  });

}

}