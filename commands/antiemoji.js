const antiEmoji = {};

export default async function antiemoji(
sock,
from,
body,
m,
args
){

try{

// ON
if(args[0] === "on"){

antiEmoji[from] = true;

return sock.sendMessage(from,{
text:"✅ ANTI EMOJI ON"
});

}

// OFF
if(args[0] === "off"){

antiEmoji[from] = false;

return sock.sendMessage(from,{
text:"❌ ANTI EMOJI OFF"
});

}

if(!antiEmoji[from]) return;

const emojis =
body.match(/[\p{Emoji}]/gu);

if(
emojis &&
emojis.length >= 10
){

const sender =
m.key.participant || from;

await sock.sendMessage(from,{
delete:m.key
});

await sock.groupParticipantsUpdate(
from,
[sender],
"remove"
);

}

}catch(e){

console.log(e);

}

}