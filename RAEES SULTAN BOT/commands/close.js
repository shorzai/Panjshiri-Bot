export default async function close(
sock,
from
){

try{

await sock.groupSettingUpdate(
from,
"announcement"
);

await sock.sendMessage(from,{
text:"🔒 گروه بسته شد"
});

}catch(e){

console.log(e);

await sock.sendMessage(from,{
text:"❌ close failed"
});

}

}