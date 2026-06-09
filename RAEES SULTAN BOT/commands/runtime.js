export default async function runtime(sock, from){

const mem = process.memoryUsage();

await sock.sendMessage(from,{
text:`
⚡ RAM: ${(mem.heapUsed/1024/1024).toFixed(2)} MB
🕒 Runtime: ${Math.floor(process.uptime())} sec
`
});

}