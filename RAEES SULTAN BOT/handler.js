import fs from "fs/promises";

// ===================
// COMMAND CACHE
// ===================
const commands = new Map();

// ===================
// SAFE LOADER
// ===================
const files = await fs.readdir("./commands");

for (const file of files) {
  if (!file.endsWith(".js")) continue;

  try {
    const mod = await import(`./commands/${file}`);
    const name = file.replace(".js", "").toLowerCase();

    if (mod?.default) {
      commands.set(name, mod.default);
    }

  } catch (e) {
    console.log(`❌ Failed loading ${file}:`, e.message);
  }
}

// ===================
// HANDLER
// ===================
export default async function handler(sock, from, body, m) {

  try {

    if (!body) return;

    if (!body.startsWith("!")) return;

    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ===================
    // 1. FILE COMMANDS
    // ===================
    const cmd = commands.get(command);

    if (cmd) {
      await cmd(sock, from, body, m, args);
      return;
    }

    // ===================
    // 2. SMART FALLBACK (🔥 IMPORTANT)
    // ===================
    if (commands.has("smart")) {
      const smart = commands.get("smart");

      await smart(sock, from, body, m, args);
      return;
    }

    // ===================
    // 3. SWITCH SYSTEM
    // ===================
    switch (command) {

      case "ping": {
        await sock.sendMessage(from, { text: "pong 🏓" });
        break;
      }

      case "owner": {
        await sock.sendMessage(from, { text: "👑 PANJSHIRI OWNER" });
        break;
      }

      case "menu": {
        await sock.sendMessage(from, {
          text: "📋 MENU BOT\n\n!ping\n!owner\n!menu"
        });
        break;
      }

    }

  } catch (e) {

    console.log("HANDLER ERROR:", e);

    await sock.sendMessage(from, {
      text: "❌ command error"
    });

  }
}