export default async function group(sock, from, args, m){

const cmd = args[0];
const mention = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

if(cmd === "!tagall"){

const metadata = await sock.groupMetadata(from);
const users = metadata.participants.map(p => p.id);

let text = "📢 GROUP TAG:\n\n";

users.forEach(u=>{
text += `@${u.split("@")[0]}\n`;
});

await sock.sendMessage(from,{
text,
mentions: users
});

await sock.sendMessage(from,{
react:{ text:"📢", key:m.key }
});

}

if(cmd === "!hidetag"){

const metadata = await sock.groupMetadata(from);
const users = metadata.participants.map(p => p.id);

await sock.sendMessage(from,{
text: args.slice(1).join(" "),
mentions: users
});

}

}