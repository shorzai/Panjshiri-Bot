const antiBad = {};

const bads = [
"بچی خر",
"ننیته گایم",
"کص خوارت",
"کوص مادر",
"کیرم ده کونت"
];

const warns = {};

export default async function antibad(
sock,
from,
body,
m,
args
){

try{

// on
if(args[0] === "on"){

antiBad[from] = true;

return sock.sendMessage(from,{
text:"✅ ANTI BADWORD ON"
});

}

// off
if(args[0] === "off"){

antiBad[from] = false;

return sock.sendMessage(from,{
text:"❌ ANTI BADWORD OFF"
});

}

if(!antiBad[from]) return;

const text = body.toLowerCase();

const bad = bads.find(v=>text.includes(v));

if(!bad) return;

const sender =
m.key.participant || from;

// delete
await sock.sendMessage(from,{
delete:m.key
});

// warns
if(!warns[sender]){
warns[sender] = 0;
}

warns[sender]++;

if(warns[sender] >= 3){

await sock.groupParticipantsUpdate(
from,
[sender],
"remove"
);

await sock.sendMessage(from,{
text:`🚫 @${sender.split("@")[0]} kicked`,
mentions:[sender]
});

warns[sender] = 0;

}else{

await sock.sendMessage(from,{
text:`⚠️ warning ${warns[sender]}/3`,
mentions:[sender]
});

}

}catch(e){

console.log(e);

}

}