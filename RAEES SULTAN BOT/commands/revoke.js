export default async function revoke(
sock,
from
){

try{

const code =
await sock.groupRevokeInvite(from);

await sock.sendMessage(from,{
text:"♻️ new link created"
});

}catch(e){

console.log(e);

}

}