const antiArab = {};

export default async function antiarab(
sock,
from,
body,
m,
args
){

try{

// ON
if(args[0] === "on"){

antiArab[from] = true;

return sock.sendMessage(from,{
text:"✅ ANTI ARAB ON"
});

}

// OFF
if(args[0] === "off"){

antiArab[from] = false;

return sock.sendMessage(from,{
text:"❌ ANTI ARAB OFF"
});

}

if(!antiArab[from]) return;

const sender =
m.key.participant || from;

// کشورها
const bad = [
"966", // saudi
"971", // uae
"20",  // egypt
"212"  // morocco
];

for(const code of bad){

if(sender.startsWith(code)){

await sock.groupParticipantsUpdate(
from,
[sender],
"remove"
);

await sock.sendMessage(from,{
text:`🚫 arab number removed`,
mentions:[sender]
});

}

}

}catch(e){

console.log(e);

}

}