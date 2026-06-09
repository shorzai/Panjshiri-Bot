export default async function say(sock, from, body, m, args){

const text = args.join(" ");

if(!text){
return sock.sendMessage(from,{
text:"📌 !say hello"
});
}

await sock.sendMessage(from,{
text
});

}