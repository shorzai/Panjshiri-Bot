export default async function getgroups(
sock,
from
){

try{

const groups =
await sock.groupFetchAllParticipating();

let text = "👥 GROUP LIST\n\n";

for(let id in groups){

text += `• ${groups[id].subject}\n`;

}

await sock.sendMessage(from,{
text
});

}catch(e){

console.log(e);

}

}