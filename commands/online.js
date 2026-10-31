import os from "os";

export default async function online(sock, from) {

try{


const start = Date.now();


// آنلاین شدن ربات
await sock.sendPresenceUpdate(
"available",
from
);


// زمان
const now = new Date();

const time =
now.toLocaleTimeString(
"fa-IR"
);

const date =
now.toLocaleDateString(
"fa-IR"
);


// اطلاعات ربات
const botName =
sock.user?.name ||
"RAEES SULTAN BOT";


const number =
sock.user?.id
?
sock.user.id.split(":")[0]
:
"Unknown";



// Uptime
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


// RAM
const ram =
Math.round(
process.memoryUsage().rss /
1024 /
1024
);


// CPU
const cpu =
os.cpus()[0]?.model ||
"Unknown";


// Ping
const ping =
Date.now() - start;



const text =
`
╭━━━〔 🟢 BOT ONLINE 〕━━━╮

🤖 NAME:
${botName}

📱 NUMBER:
${number}

━━━━━━━━━━━━━━

⚡ STATUS:
ONLINE & RUNNING

📡 PING:
${ping} ms

⏱ UPTIME:
${hours}h ${minutes}m ${seconds}s

💾 RAM:
${ram} MB

━━━━━━━━━━━━━━

📅 DATE:
${date}

⏰ TIME:
${time}

🖥 CPU:
${cpu}

━━━━━━━━━━━━━━

🔥 POWERED BY
👑 RAEES SULTAN BOT

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
"ONLINE ERROR:",
e
);


await sock.sendMessage(from,{

text:
"⚠️ خطا در گرفتن وضعیت ربات"

});


}


}