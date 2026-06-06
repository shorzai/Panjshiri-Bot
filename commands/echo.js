export default async function echo(sock, from, body, m, args){

const text = args.join(" ");

if(!text){
return sock.sendMessage(from,{
text:"📌 !echo hi"
});
}

await sock.sendMessage(from,{
text:`🔁 ${text}`
});

}