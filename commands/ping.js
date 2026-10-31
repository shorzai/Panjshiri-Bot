import os from "os";

export default async function ping(
sock,
from,
args,
m
){

try{


const start = Date.now();


// واکنش سریع
await sock.sendMessage(from,{
react:{
text:"🏓",
key:m.key
}
});



const uptime =
process.uptime();


const hours =
Math.floor(uptime / 3600);


const minutes =
Math.floor(
(uptime % 3600) / 60
);


const seconds =
Math.floor(
uptime % 60
);



const memory =
Math.round(
process.memoryUsage().rss /
1024 /
1024
);



const cpu =
os.cpus()[0]?.model ||
"Unknown";



const speed =
Date.now() - start;



const bot =
sock.user?.name ||
"RAEES SULTAN BOT";



const text =
`
╭━━━〔 🏓 PING SYSTEM 〕━━━╮

🏓 PONG!

⚡ RESPONSE:
${speed} ms

🟢 STATUS:
ONLINE

🤖 BOT:
${bot}

⏱ UPTIME:
${hours}h ${minutes}m ${seconds}s

💾 RAM:
${memory} MB

🖥 CPU:
${cpu}

━━━━━━━━━━━━━━

🔥 RAEES SULTAN BOT
╰━━━━━━━━━━━━━━╯
`;



await sock.sendMessage(from,{
text,

contextInfo:{

forwardingScore:999,

isForwarded:true

}

});



}catch(e){


console.log(
"PING ERROR:",
e
);


await sock.sendMessage(from,{
text:"❌ Ping error"
});


}


}