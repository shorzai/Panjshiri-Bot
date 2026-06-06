export default async function info(sock, from, body, m){

await sock.sendMessage(from,{
text:`
📊 USER INFO

ID: ${m.key.remoteJid}
TIME: ${new Date().toLocaleString()}
`
});

}