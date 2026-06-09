export default async function ghosttag(
sock,
from
){

try{

const meta =
await sock.groupMetadata(from);

const users =
meta.participants.map(v=>v.id);

await sock.sendMessage(from,{
text:"👻",
mentions:users
});

}catch(e){

console.log(e);

}

}