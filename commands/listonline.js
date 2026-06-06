export default async function listonline(
sock,
from
){

try{

const online =
Object.keys(
sock.presence[from] || {}
);

let text = "🟢 ONLINE USERS\n\n";

for(const u of online){

text += `• @${u.split("@")[0]}\n`;

}

await sock.sendMessage(from,{
text,
mentions:online
});

}catch(e){

console.log(e);

}

}