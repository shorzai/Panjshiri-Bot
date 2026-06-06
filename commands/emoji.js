export default async function emoji(sock, from, body, m, args){

const text = args.join(" ");

if(!text){
return sock.sendMessage(from,{
text:"📌 !emoji hi"
});
}

const result = text
.replace(/a/gi,"🅰️")
.replace(/b/gi,"🅱️")
.replace(/h/gi,"♓")
.replace(/i/gi,"ℹ️");

await sock.sendMessage(from,{
text: result
});

}