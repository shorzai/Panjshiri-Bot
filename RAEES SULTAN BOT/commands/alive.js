export default async function alive(sock, from, args, m) {
  try {

    const start = Date.now();

    // 🟢 measure latency (ping)
    const sent = await sock.sendMessage(from, {
      text: "🔄 Checking system..."
    });

    const latency = Date.now() - start;

    // uptime
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const mnt = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);

    // memory usage
    const mem = process.memoryUsage();
    const memUsedMB = (mem.rss / 1024 / 1024).toFixed(2);

    const statusText = `
╔════〔 ☠️ BOT STATUS ☠️ 〕════╗

🟢 Status: ONLINE
⚡ Speed: ${latency} ms
⏱ Uptime: ${h}h ${mnt}m ${s}s
💾 RAM: ${memUsedMB} MB

👑 Owner: RAEES SULTAN
🔥 Mode: ACTIVE
📡 System: BAILEYS MD

╚════════════════════════════╝
`;

    await sock.sendMessage(from, {
      text: statusText
    });

    // reaction
    try {
      await sock.sendMessage(from, {
        react: {
          text: "☠️",
          key: m.key
        }
      });
    } catch {}

  } catch (e) {
    console.log("ALIVE ERROR:", e);

    await sock.sendMessage(from, {
      text: "❌ Status check failed"
    });
  }
}