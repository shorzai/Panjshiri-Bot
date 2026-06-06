export default async function gcinfo(
sock,
from
){

try{

const meta =
await sock.groupMetadata(from);

const text = `
👑 GROUP INFO

📛 Name:
${meta.subject}

👥 Members:
${meta.participants.length}

🆔 ID:
${meta.id}

📝 Desc:
${meta.desc || "no desc"}
`;

await sock.sendMessage(from,{
text
});

}catch(e){

console.log(e);

}

}