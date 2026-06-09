import fetch from "node-fetch";

export default async function ai(sock, from, body, m, args){

const q = args.join(" ");

if(!q){
return sock.sendMessage(from,{
text:"📌 !ai hello"
});
}

try{

const res = await fetch(
"https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({ inputs:q })
}
);

const data = await res.json();

const ans =
data?.generated_text || "❌ no answer";

await sock.sendMessage(from,{
text:"🤖 "+ans
});

}catch(e){

await sock.sendMessage(from,{
text:"❌ AI error"
});

}

}