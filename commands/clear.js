export default async function clear(
sock,
from
){

try{

await sock.chatModify(
{
clear:true
},
from
);

await sock.sendMessage(from,{
text:"🧹 chat cleared"
});

}catch(e){

console.log(e);

}

}