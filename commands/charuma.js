import * as ch from "cheerio";

// =======================
// PROCESS NAME
// =======================
function processName(input){

return input
.trim()
.toLowerCase()
.replace(/[^a-z0-9\s]/g,"")
.replace(/\s+/g,"_");

}

// =======================
// FETCH PAGE
// =======================
async function fetchPage(slug){

const urls = [

`https://umamusumedb.com/characters/${slug}_2025/`,
`https://umamusumedb.com/characters/${slug}/`

];

for(const u of urls){

try{

const res = await fetch(u);

if(res.ok){

const html = await res.text();

return {
ok:true,
html,
url:u
};

}

}catch{}

}

return { ok:false };

}

// =======================
// GET DATA
// =======================
async function getData(inputName){

const slug = processName(inputName);

const page = await fetchPage(slug);

if(!page.ok){

return {
status:false,
error:"Character not found"
};

}

const html = page.html;

const $ = ch.load(html);

let json = null;

$('script[type="application/ld+json"]').each((_,el)=>{

try{

const obj = JSON.parse(
$(el).contents().text().trim()
);

if(obj["@type"] === "VideoGameCharacter"){

json = obj;

}

}catch{}

});

let name = null;
let jpName = null;
let description = null;

let stats = {};

if(json){

name = json.name || null;
jpName = json.alternateName || null;
description = json.description || null;

if(Array.isArray(json.characterAttribute)){

json.characterAttribute.forEach(a=>{

stats[a.name] = a.value;

});

}

}

const image =
$("meta[property='og:image']")
.attr("content") || null;

return {

status:true,
name,
jpName,
description,
image,
stats,
url:page.url

};

}

// =======================
// MAIN COMMAND
// =======================
export default async function charuma(
sock,
from,
body,
m,
args
){

try{

const text = args.join(" ");

if(!text){

return await sock.sendMessage(from,{
text:"📌 مثال:\n!charuma silence suzuka"
});

}

// react
await sock.sendMessage(from,{
react:{
text:"⏳",
key:m.key
}
});

const data = await getData(text);

if(!data.status){

return await sock.sendMessage(from,{
text:"❌ Character not found"
});

}

const txt = `
✨ CHAR UMA MUSUME ✨

👤 Name:
${data.name}

🇯🇵 JP Name:
${data.jpName}

📄 Description:
${data.description}

📊 Stats:
${Object.entries(data.stats)
.map(([k,v])=>`• ${k}: ${v}`)
.join("\n")}

🔗 ${data.url}
`;

await sock.sendMessage(from,{

image:{ url:data.image },
caption:txt

});

// done react
await sock.sendMessage(from,{
react:{
text:"✅",
key:m.key
}
});

}catch(e){

console.log(e);

await sock.sendMessage(from,{
text:"❌ command error"
});

}

}