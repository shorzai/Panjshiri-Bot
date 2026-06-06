export default async function getppall(
sock,
from
){

try{

const meta =
await sock.groupMetadata(from);

const members =
meta.participants.map(v=>v.id);

for(const user of members){

try{

const pp =
await sock.profilePictureUrl(
user,
"image"
);

await sock.sendMessage(from,{
image:{ url:pp },
caption:`👤 ${user}`
});

}catch{}

}

}catch(e){

console.log(e);

}

}