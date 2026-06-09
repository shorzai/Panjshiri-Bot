export default async function addall(
sock,
from,
body,
m
){

try{

// گرفتن اطلاعات گروه
const meta =
await sock.groupMetadata(from);

// لیست اعضا
const users =
meta.participants.map(v => v.id);

// اضافه کردن همه
await sock.groupParticipantsUpdate(
from,
users,
"add"
);

await sock.sendMessage(from,{
text:`✔️ ${users.length} عضو اضافه شد`
});

}catch(e){

console.log(e);

await sock.sendMessage(from,{
text:"❌ خطا در addall"
});

}

}