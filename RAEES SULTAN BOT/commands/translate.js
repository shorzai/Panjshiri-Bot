export default async function translate(sock, from, body, m, args){

const text = args.join(" ");

if(!text){
return sock.sendMessage(from,{
text:"📌 !translate hello"
});
}

await sock.sendMessage(from,{
text:`🌍 Translate (demo): ${text}`
});

}