// lib/anticall.js

import { getDB } from "./db.js";

export default function anticall(sock){

sock.ev.on("call", async(calls)=>{

try{

const db = getDB();


if(!db.settings?.global?.anticall)
return;



for(const call of calls){


const id = call.from;


// فقط گروه

if(!id.endsWith("@g.us"))
continue;



try{

await sock.rejectCall(
call.id,
id
);

}catch{}



await sock.sendMessage(id,{
text:
`
🚫 AntiCall

تماس در گروه ممنوع است.
`
});


}


}catch(e){

console.log(
"ANTI CALL ERROR:",
e
);

}

});

}