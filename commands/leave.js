export default async function leave(
sock,
from
){

try{

await sock.sendMessage(from,{
text:"👋 خداحافظ"
});

await sock.groupLeave(from);

}catch(e){

console.log(e);

}

}