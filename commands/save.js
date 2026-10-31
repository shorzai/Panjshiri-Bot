export default async function save(
sock,
from,
body,
m
){

try{


const quoted =
m.message?.extendedTextMessage
?.contextInfo;



if(!quoted?.quotedMessage){

return sock.sendMessage(from,{
text:
"📌 لطفاً روی یک پیام Reply کن"
});

}



const sender =
quoted.participant ||
from;



const senderName =
sender.split("@")[0];



const time =
new Date()
.toLocaleString("fa-IR");



let type =
"💬 Text";



if(quoted.quotedMessage.imageMessage)
type="🖼 Image";


else if(quoted.quotedMessage.videoMessage)
type="🎬 Video";


else if(quoted.quotedMessage.audioMessage)
type="🎵 Audio";


else if(quoted.quotedMessage.documentMessage)
type="📁 Document";



const info =
`
╭━━〔 💾 SAVED MESSAGE 〕━━╮

📌 TYPE:
${type}

👤 FROM:
@${senderName}

📍 SOURCE:
${from.endsWith("@g.us")
?"GROUP"
:"PRIVATE"}

⏰ TIME:
${time}

╰━━━━━━━━━━━━━━━━╯
`;



await sock.sendMessage(
sock.user.id,
{
text:info,
mentions:[sender]
}
);



await sock.sendMessage(
sock.user.id,
{
forward:{
key:{
remoteJid:from,
id:quoted.stanzaId,
participant:sender
},
message:quoted.quotedMessage
}
}
);



await sock.sendMessage(from,{
text:
"💾 پیام ذخیره شد در PV ربات ✅"
});



}catch(e){

console.log(
"SAVE ERROR:",
e
);


await sock.sendMessage(from,{
text:
"❌ خطا در ذخیره پیام"
});

}


}