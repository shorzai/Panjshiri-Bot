export default async function fact(sock, from){

const facts = [
"🐧 پنگوئن‌ها زانو دارن ولی دیده نمی‌شه",
"🌍 زمین در حال چرخشه حتی وقتی تو خواب هستی",
"⚡ برق سریع‌تر از فکر آدمه"
];

const r = facts[Math.floor(Math.random()*facts.length)];

await sock.sendMessage(from,{ text:r });

}