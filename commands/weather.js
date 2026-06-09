export default async function weather(sock, from, body, m, args){

const city = args.join(" ");

if(!city){
return sock.sendMessage(from,{
text:"📌 !weather Kabul"
});
}

await sock.sendMessage(from,{
text:`🌦️ Weather for: ${city}\n⛅ demo mode (API not set)`
});

}