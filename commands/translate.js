export default async function translate(
sock,
from,
body,
m,
args
){

try{


let text =
args.join(" ");



const quoted =
m.message?.extendedTextMessage
?.contextInfo
?.quotedMessage;



if(!text && quoted){

text =
quoted.conversation ||
quoted.extendedTextMessage?.text ||
"";

}



if(!text){

return sock.sendMessage(from,{
text:
`
🌍 TRANSLATE SYSTEM

استفاده:

!translate متن

مثال:
!translate hello

یا روی پیام Reply کن.
`
});

}



const start =
Date.now();



await sock.sendMessage(from,{
react:{
text:"🌍",
key:m.key
}
});



// فعلاً دمو - آماده اتصال API
const result =
`🔤 ${text}`;



const time =
Date.now()-start;



await sock.sendMessage(from,{
text:
`
╭━━━〔 🌍 TRANSLATOR 〕━━━╮

📝 ORIGINAL:

${text}

━━━━━━━━━━━━

🌐 RESULT:

${result}

⚡ SPEED:
${time}ms

🤖 POWERED BY:
RAEES SULTAN BOT

╰━━━━━━━━━━━━━━╯
`
});



}catch(e){

console.log(
"TRANSLATE ERROR:",
e
);


await sock.sendMessage(from,{
text:
"❌ خطا در سیستم ترجمه"
});

}


}