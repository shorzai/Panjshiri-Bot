export default async function ping(
sock,
from,
args,
m
){

const start = Date.now();

const end = Date.now();

await sock.sendMessage(from,{
text:`
🏓 PONG

⚡ Speed:
${end - start} ms
`
});

await sock.sendMessage(from,{
react:{
text:"🏓",
key:m.key
}
});

}