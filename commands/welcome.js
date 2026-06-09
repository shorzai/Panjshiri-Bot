export default async function welcome(
sock
){

sock.ev.on(
"group-participants.update",
async(data)=>{

try{

if(data.action !== "add") return;

const user = data.participants[0];

await sock.sendMessage(data.id,{
text:`
👋 Welcome

@${user.split("@")[0]}

🔥 Enjoy group
`,
mentions:[user]
});

}catch(e){

console.log(e);

}

});

}