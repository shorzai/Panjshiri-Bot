export default async function stats(
sock,
from
){

const uptime = process.uptime();

const hours =
Math.floor(uptime / 3600);

const minutes =
Math.floor((uptime % 3600) / 60);

const seconds =
Math.floor(uptime % 60);

await sock.sendMessage(from,{
text:`
╔════〔 📊 BOT STATS 📊 〕════╗

⏳ Runtime:
${hours}h ${minutes}m ${seconds}s

⚡ Engine:
Node.js v24

🤖 Status:
ONLINE

╚══════════════════════════╝
`
});

}