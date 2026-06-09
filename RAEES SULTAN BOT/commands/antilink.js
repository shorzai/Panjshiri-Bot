const antiLinks = {};

export default async function antilink(
sock,
from,
body,
m,
args
){

try{

// روشن
if(args[0] === "on"){

antiLinks[from] = true;

return sock.sendMessage(from,{
text:"✅ ANTI-LINK ON"
});

}

// خاموش
if(args[0] === "off"){

antiLinks[from] = false;

return sock.sendMessage(from,{
text:"❌ ANTI-LINK OFF"
});

}

// اگر روشن نبود
if(!antiLinks[from]) return;

// متن پیام
const text =
body.toLowerCase();

// چک لینک
if(
text.includes("chat.whatsapp.com") ||
text.includes("http://") ||
text.includes("https://")
){

// اطلاعات گروه
const meta =
await sock.groupMetadata(from);

// ادمین‌ها
const admins =
meta.participants
.filter(v=>v.admin)
.map(v=>v.id);

// فرستنده
const sender =
m.key.participant || from;

// اگر ادمین بود رد شو
if(admins.includes(sender)) return;

// حذف پیام
await sock.sendMessage(from,{
delete:m.key
});

// kick
await sock.groupParticipantsUpdate(
from,
[sender],
"remove"
);

// پیام
await sock.sendMessage(from,{
text:`🚫 @${sender.split("@")[0]} link detected`,
mentions:[sender]
});

}

}catch(e){

console.log(e);

}

}