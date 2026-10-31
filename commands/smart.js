import fetch from "node-fetch";

const memory = new Map();
const smartStatus = {};

export default async function smart(
sock,
from,
body,
m,
args
){

try{

// =====================
// SMART ON
// =====================

if(args?.[0] === "on"){

smartStatus[from] = true;

return sock.sendMessage(from,{
text:"✅ SMART MODE ON"
});

}


// =====================
// SMART OFF
// =====================

if(args?.[0] === "off"){

smartStatus[from] = false;

return sock.sendMessage(from,{
text:"❌ SMART MODE OFF"
});

}


// =====================
// اگر خاموش بود
// =====================

if(!smartStatus[from]) return;


const text =
(body || "").toLowerCase().trim();

if(!text) return;


// =====================
// REACTION
// =====================

try{

await sock.sendMessage(from,{
react:{
text:"🧠",
key:m.key
}
});

}catch{}


// =====================
// GREETING
// =====================

const greetings = [
"سلام",
"hi",
"hello",
"hey",
"salam",
"صبح بخیر",
"شب بخیر"
];

if(greetings.some(x=>text.includes(x))){

return sock.sendMessage(from,{
text:
"👋 سلام دوست عزیز\n🤖 Smart Assistant آماده خدمت است."
});

}


// =====================
// HOW ARE YOU
// =====================

if(
text.includes("خوبی") ||
text.includes("حالت")
){

return sock.sendMessage(from,{
text:
"😊 من خوبم و آنلاین هستم.\nتو چطوری؟"
});

}


// =====================
// THANKS
// =====================

if(
text.includes("تشکر") ||
text.includes("ممنون")
){

return sock.sendMessage(from,{
text:
"❤️ خواهش می‌کنم، همیشه در خدمتم."
});

}


// =====================
// BOT INFO
// =====================

if(
text.includes("کی هستی") ||
text.includes("ربات")
){

return sock.sendMessage(from,{
text:`
🤖 SULTAN SMART ASSISTANT

🧠 سیستم:
Hybrid AI

🟢 Status:
Online

⚡ Ready To Help
`
});

}


// =====================
// TIME
// =====================

if(text.includes("ساعت")){

const time =
new Date().toLocaleTimeString();

return sock.sendMessage(from,{
text:`⏰ ساعت فعلی:
${time}`
});

}


// =====================
// MEMORY
// =====================

memory.set(from,text);


// =====================
// AI
// =====================

try{

const res =
await fetch(
"https://api.simsimi.vn/v2/simtalk",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
inputs:text
})

});

if(res.ok){

const data =
await res.json();

const answer =
data?.message ||
data?.answer ||
data?.response;

if(answer){

return sock.sendMessage(from,{
text:`🤖 ${answer}`
});

}

}

}catch(e){

console.log("SIMSIMI:",e);

}


// =====================
// FALLBACK
// =====================

return sock.sendMessage(from,{
text:
"🤔 هنوز جواب این را یاد نگرفته‌ام، اما دارم بهتر می‌شوم."
});


}catch(e){

console.log(
"SMART ERROR:",
e
);

await sock.sendMessage(from,{
text:"❌ Smart Assistant Error"
});

}

}