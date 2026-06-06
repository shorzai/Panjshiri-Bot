export default async function detect(sock, from, body, m){

const text = body.toLowerCase();

let type = "normal";

if(text.includes("hello")) type = "greeting";
if(text.includes("love")) type = "love";
if(text.includes("bot")) type = "system";

await sock.sendMessage(from,{
text:`🤖 Detected Type: ${type}`
});

}