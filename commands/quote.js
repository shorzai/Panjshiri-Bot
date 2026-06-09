export default async function quote(sock, from){

const quotes = [
"🔥 موفقیت از قدم‌های کوچک شروع می‌شود",
"⚡ هیچ‌وقت تسلیم نشو",
"👑 تو می‌تونی بهتر از دیروزت باشی"
];

const q = quotes[Math.floor(Math.random()*quotes.length)];

await sock.sendMessage(from,{ text:q });

}