export default async function tagall(sock, from, body, m, args){

try{


if(!from.endsWith("@g.us")){

return sock.sendMessage(from,{
text:"❌ این دستور فقط در گروه کار می‌کند"
});

}



const metadata =
await sock.groupMetadata(from);



const participants =
metadata.participants;



let mentions = [];

let text =
`
╭━━━〔 📢 TAG ALL 〕━━━╮

📌 گروه:
${metadata.subject}

👥 تعداد اعضا:
${participants.length}

━━━━━━━━━━━━

`;



for(const p of participants){


const jid = p.id;


mentions.push(jid);


text +=
`👤 @${jid.split("@")[0]}\n`;


}



text +=
`
━━━━━━━━━━━━

🤖 SULTAN BUG BOT
🟢 SYSTEM ONLINE
`;



await sock.sendMessage(from,{

text,

mentions

});



}catch(e){

console.log(
"TAGALL ERROR:",
e
);


await sock.sendMessage(from,{
text:"❌ خطا در TagAll"
});


}


}