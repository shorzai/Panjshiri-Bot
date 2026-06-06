const antiForeign = {};

export default async function antiforeign(
sock,
from,
body,
m,
args
){

try{

// ON
if(args[0] === "on"){

antiForeign[from] = true;

return sock.sendMessage(from,{
text:"✅ ANTI FOREIGN ON"
});

}

// OFF
if(args[0] === "off"){

antiForeign[from] = false;

return sock.sendMessage(from,{
text:"❌ ANTI FOREIGN OFF"
});

}

// فعال نیست
if(!antiForeign[from]) return;

// گرفتن فرستنده
const sender =
m.key.participant || from;

// فقط شماره افغانستان
if(!sender.startsWith("93")){

await sock.groupParticipantsUpdate(
from,
[sender],
"remove"
);

await sock.sendMessage(from,{
text:`🌍 @${sender.split("@")[0]} removed`,
mentions:[sender]
});

}

}catch(e){

console.log(e);

}

}