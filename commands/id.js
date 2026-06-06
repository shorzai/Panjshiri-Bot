export default async function id(sock, from, body, m){

await sock.sendMessage(from,{
text:`
🆔 USER INFO

ID: ${m.key.remoteJid}
TIME: ${new Date().toLocaleString()}
STATUS: ACTIVE
`
});

}