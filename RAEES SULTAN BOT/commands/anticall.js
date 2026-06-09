export default async function anticall(sock){

sock.ev.on("call", async(calls)=>{

try{

for(const call of calls){

const id = call.from;

await sock.sendMessage(id,{
text:"🚫 تماس ممنوع"
});

await sock.updateBlockStatus(
id,
"block"
);

}

}catch(e){

console.log(e);

}

});

}