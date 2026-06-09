export default async function broadcast(
sock,
from,
body,
m,
args
){

try{

const text = args.join(" ");

if(!text){

return sock.sendMessage(from,{
text:"📌 !broadcast hello"
});

}

const groups =
await sock.groupFetchAllParticipating();

for(let id in groups){

await sock.sendMessage(id,{
text:`📢 BROADCAST\n\n${text}`
});

}

await sock.sendMessage(from,{
text:"✅ broadcast sent"
});

}catch(e){

console.log(e);

}

}