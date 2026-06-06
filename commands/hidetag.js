export default async function hidetag(
sock,
from,
body,
m,
args
){

try{

const meta =
await sock.groupMetadata(from);

const members =
meta.participants.map(v=>v.id);

const text =
args.join(" ") || "👀";

await sock.sendMessage(from,{
text,
mentions:members
});

}catch(e){

console.log(e);

}

}