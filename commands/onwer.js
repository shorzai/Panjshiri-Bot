export default async function owner(
sock,
from
){

try{


const ownerNumber = "93794384087";

const text =
`
╭━━━〔 👑 OWNER INFO 👑 〕━━━╮

👑 NAME:
𝐑𝐀𝐄𝐄𝐒 𝐒𝐇𝐈𝐑𝐙𝐀𝐈 𝐏𝐀𝐍𝐉𝐒𝐇𝐈𝐑𝐈

📱 NUMBER:
+${ownerNumber}

🤖 BOT:
RAEES SULTAN BOT

⚙️ SYSTEM:
WHATSAPP BAILEYS

🟢 STATUS:
ACTIVE

╰━━━━━━━━━━━━━━━━╯
`;



await sock.sendMessage(from,{

text,

buttons:[

{
buttonId:
`owner_${ownerNumber}`,
buttonText:{
displayText:"👑 Contact Owner"
},
type:1
}

],

headerType:1,


contextInfo:{

externalAdReply:{

title:
"👑 RAEES SULTAN OWNER",

body:
"+93794384087",

sourceUrl:
`https://wa.me/${ownerNumber}`,

mediaType:1

}

}

});


}catch(e){

console.log(
"OWNER ERROR:",
e
);

}

}