export default async function runtime(
sock,
from
){

try{


const mem =
process.memoryUsage();


const uptime =
process.uptime();



const days =
Math.floor(
uptime / 86400
);


const hours =
Math.floor(
(uptime % 86400) / 3600
);


const minutes =
Math.floor(
(uptime % 3600) / 60
);


const seconds =
Math.floor(
uptime % 60
);



const heap =
(mem.heapUsed / 1024 / 1024)
.toFixed(2);


const total =
(mem.heapTotal / 1024 / 1024)
.toFixed(2);



const rss =
(mem.rss / 1024 / 1024)
.toFixed(2);



const bot =
sock.user?.name ||
"RAEES SULTAN BOT";



const text =
`
╭━━━〔 ⚡ RUNTIME SYSTEM 〕━━━╮

🤖 BOT:
${bot}

🟢 STATUS:
ONLINE

━━━━━━━━━━━━━━

⏱ RUNNING TIME:

📅 ${days} Days
🕒 ${hours} Hours
⏰ ${minutes} Minutes
⌛ ${seconds} Seconds


💾 MEMORY:

🧠 Heap Used:
${heap} MB

📦 Heap Total:
${total} MB

🚀 Process RAM:
${rss} MB


━━━━━━━━━━━━━━

🔥 SYSTEM:
RAEES SULTAN BOT

╰━━━━━━━━━━━━━━╯
`;



await sock.sendMessage(from,{
text
});


}catch(e){


console.log(
"RUNTIME ERROR:",
e
);


await sock.sendMessage(from,{
text:"❌ Runtime error"
});


}


}