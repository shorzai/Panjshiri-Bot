import os from "os";

export default async function server(sock, from, body, m) {
    try {
        // محاسبه زمان روشن بودن سرور (Uptime)
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        // اطلاعات رم
        const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const usedMem = (totalMem - freeMem).toFixed(2);
        
        // اطلاعات پردازنده
        const cpus = os.cpus();
        const cpuModel = cpus[0].model;
        const cpuCores = cpus.length;

        const text = `
╭━━━〔 💻 SERVER MONITOR 〕━━━╮
┃
┃ 🖥️ *سیستم‌عامل:* ${os.platform()} (${os.arch()})
┃ ⚙️ *پردازنده:* ${cpuCores} Cores
┃ 🧠 *مدل CPU:* ${cpuModel.substring(0, 25)}...
┃
┃ 💾 *کل رم:* ${totalMem} GB
┃ 📉 *رم مصرفی:* ${usedMem} GB
┃ 📈 *رم آزاد:* ${freeMem} GB
┃
┃ ⏱️ *آپتایم سرور:* ${hours}h ${minutes}m ${seconds}s
┃ 🔋 *نسخه Node.js:* ${process.version}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
`;
        await sock.sendMessage(from, { text }, { quoted: m });

    } catch (error) {
        console.log("SERVER CMD ERROR:", error);
    }
}