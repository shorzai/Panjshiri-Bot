export default async function goodbye(
sock
){

sock.ev.on(
"group-participants.update",
async(data)=>{

try{

if(data.action !== "remove") return;

const user = data.participants[0];

await sock.sendMessage(data.id,{
text:`
💀 Goodbye

@${user.split("@")[0]}
`,
mentions:[user]
});

}catch(e){

console.log(e);

}

});

}