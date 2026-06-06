export default async function count(sock, from, body, m, args){

const num = parseInt(args[0]);

if(!num){
return sock.sendMessage(from,{
text:"📌 !count 10"
});
}

let text = "";

for(let i=1;i<=num;i++){
text += i + " ";
}

await sock.sendMessage(from,{ text });

}