export default async function uptime(sock, from){

const u = process.uptime();

const h = Math.floor(u/3600);
const m = Math.floor((u%3600)/60);
const s = Math.floor(u%60);

await sock.sendMessage(from,{
text:`
⏳ SYSTEM UPTIME

🕒 ${h}h ${m}m ${s}s
⚡ STATUS: STABLE
`
});

}