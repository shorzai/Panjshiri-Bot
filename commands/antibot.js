export default async function antibot(sock){

sock.ev.on(
"group-participants.update",
async(data)=>{

try{

if(data.action !== "add") return;

const user = data.participants[0];

if(user.includes("bot")){

await sock.groupParticipantsUpdate(
data.id,
[user],
"remove"
);

await sock.sendMessage(data.id,{
text:"🤖 bot detected & removed"
});

}

}catch(e){

console.log(e);

}

});

}