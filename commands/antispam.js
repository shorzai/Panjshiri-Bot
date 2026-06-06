const spamUsers = new Map();

export default async function antispam(sock, from, body, m){

try{

const user = m.key.participant || from;

// اگر پیام نبود
if(!body) return;

// شمارش پیام‌ها
if(!spamUsers.has(user)){
spamUsers.set(user, {
count: 1,
last: Date.now()
});
}else{

let data = spamUsers.get(user);

let now = Date.now();

// اگر کمتر از 3 ثانیه پیام داده
if(now - data.last < 3000){
data.count += 1;
}else{
data.count = 1;
}

data.last = now;
spamUsers.set(user, data);

// اگر اسپم شد
if(data.count >= 5){

await sock.sendMessage(from,{
text:`⚠️ @${user.split("@")[0]} اسپم نکن!`,
mentions:[user]
});

// ریست
spamUsers.set(user,{
count:0,
last:now
});

}

}

}catch(e){

console.log("ANTISPAM ERROR:", e);

}

}