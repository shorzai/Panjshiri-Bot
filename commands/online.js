export default async function online(
sock,
from
){

await sock.sendPresenceUpdate(
"available",
from
);

await sock.sendMessage(from,{
text:"🟢 BOT ONLINE"
});

}