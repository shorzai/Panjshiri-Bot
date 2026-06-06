export default async function alive(
sock,
from,
args,
m
){

await sock.sendMessage(from,{
text:`
╔════〔 ☠️ BOT STATUS ☠️ 〕════╗

🟢 Status: ONLINE
⚡ Speed: FAST
👑 Owner: RAEES SULTAN
🔥 Mode: ACTIVE

╚════════════════════════════╝
`
});

await sock.sendMessage(from,{
react:{
text:"☠️",
key:m.key
}
});

}