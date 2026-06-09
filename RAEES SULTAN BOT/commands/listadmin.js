export default async function listadmin(
sock,
from
){

try{

const meta =
await sock.groupMetadata(from);

const admins =
meta.participants
.filter(v=>v.admin);

let text = "👑 ADMINS\n\n";

for(const a of admins){

text += `• @${a.id.split("@")[0]}\n`;

}

await sock.sendMessage(from,{
text,
mentions:admins.map(v=>v.id)
});

}catch(e){

console.log(e);

}

}