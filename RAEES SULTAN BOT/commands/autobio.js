export default async function autobio(sock){

setInterval(async()=>{

try{

const time =
new Date().toLocaleTimeString();

await sock.updateProfileStatus(
`🔥 BOT ONLINE | ${time}`
);

}catch{}

},60000);

}