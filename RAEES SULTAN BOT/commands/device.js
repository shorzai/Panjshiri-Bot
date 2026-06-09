export default async function device(sock, from){

const os = process.platform;
const node = process.version;

await sock.sendMessage(from,{
text:`
🖥 Platform: ${os}
⚡ Node: ${node}
`
});

}