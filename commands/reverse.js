export default async function reverse(sock, from, body, m, args){

const text = args.join(" ");

if(!text){
return sock.sendMessage(from,{
text:"📌 !reverse hello"
});
}

const rev = text.split("").reverse().join("");

await sock.sendMessage(from,{
text:`🔁 ${rev}`
});

}