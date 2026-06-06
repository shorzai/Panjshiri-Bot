import fs from "fs";

export default async function savecontact(
sock,
from
){

const meta = await sock.groupMetadata(from);

const nums = meta.participants
.map(v => v.id);

fs.writeFileSync(
"./contacts.json",
JSON.stringify(nums,null,2)
);

await sock.sendMessage(from,{
text:`✅ Saved ${nums.length} contacts`
});

}