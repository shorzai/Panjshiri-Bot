export default async function calc(sock, from, body, m, args){

try{

const expr = args.join(" ");

if(!expr){
return sock.sendMessage(from,{
text:"📌 !calc 2+2"
});
}

const result = eval(expr);

await sock.sendMessage(from,{
text:`🧮 Result: ${result}`
});

}catch(e){

await sock.sendMessage(from,{
text:"❌ invalid math"
});

}

}