export default async function desc(
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
text:"📌 !desc text"
});

}

await sock.groupUpdateDescription(
from,
text
);

await sock.sendMessage(from,{
text:"📝 توضیحات گروه تغییر کرد"
});

}catch(e){

console.log(e);

}

}