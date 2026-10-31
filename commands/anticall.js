// commands/anticall.js

import { getDB, saveDB } from "../lib/db.js";

export default async function anticall(sock, from, body){

const db = getDB();

db.settings ??= {};
db.settings.global ??= {};

const cmd = body.trim().toLowerCase();


if(cmd === "!anticall on"){

db.settings.global.anticall = true;
saveDB(db);

return sock.sendMessage(from,{
text:"✅ AntiCall گروه فعال شد"
});

}


if(cmd === "!anticall off"){

db.settings.global.anticall = false;
saveDB(db);

return sock.sendMessage(from,{
text:"❌ AntiCall گروه خاموش شد"
});

}


if(cmd === "!anticall"){

return sock.sendMessage(from,{
text:
`
📞 AntiCall Group

وضعیت:
${
db.settings.global.anticall
?
"🟢 فعال"
:
"🔴 خاموش"
}

دستورات:
!anticall on
!anticall off
`
});

}

}