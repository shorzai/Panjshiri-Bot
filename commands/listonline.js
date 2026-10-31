// commands/listonline.js

import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════
//  🗄️  STORAGE & CACHE
// ═══════════════════════════════════════════════

const DATA_DIR = './data/presence';
const LOG_FILE = path.join(DATA_DIR, 'online-history.json');
const CACHE_TTL = 15000;           // انقضای کش (ms)
const PRESENCE_TTL = 12000;         // انقضای presence (ms)
const MAX_HISTORY = 500;            // حداکثر رکورد تاریخچه

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// استور اصلی presence (in-memory)
const presenceStore = new Map();     // groupJid -> Map<userId, presenceData>
const subscribedGroups = new Set();  // گروه‌های سابسکرایب‌شده
const commandCache = new Map();      // کش نتیجه‌ی دستور برای هر گروه
const stats = new Map();             // آمار هر گروه

// بارگذاری تاریخچه از دیسک
let history = [];
try {
    if (fs.existsSync(LOG_FILE)) {
        history = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    }
} catch { history = []; }

let historyDirty = false;

// ذخیره‌ی تاریخچه با debounce
function saveHistory() {
    if (!historyDirty) return;
    try {
        if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
        fs.writeFileSync(LOG_FILE, JSON.stringify(history, null, 2));
        historyDirty = false;
    } catch (e) {
        console.log('HISTORY SAVE ERROR:', e.message);
    }
}
setInterval(saveHistory, 30000); // هر ۳۰ ثانیه

// ═══════════════════════════════════════════════
//  🎧  PRESENCE LISTENER
// ═══════════════════════════════════════════════

export function initPresenceListener(sock) {
    sock.ev.on('presence.update', ({ id, presences }) => {
        if (!id.endsWith('@g.us')) return;

        if (!presenceStore.has(id)) presenceStore.set(id, new Map());
        const groupMap = presenceStore.get(id);

        for (const [participant, data] of Object.entries(presences)) {
            const prev = groupMap.get(participant);
            const status = data.lastKnownPresence || 'available';

            groupMap.set(participant, {
                lastKnownPresence: status,
                lastSeen: data.lastSeen,
                timestamp: Date.now()
            });

            // لاگ تغییر وضعیت (فقط اگر تغییر کرده)
            if (!prev || prev.lastKnownPresence !== status) {
                history.push({
                    group: id,
                    user: participant,
                    status,
                    time: Date.now()
                });
                historyDirty = true;

                // آمار
                if (!stats.has(id)) stats.set(id, { totalSeen: new Set(), updates: 0 });
                const g = stats.get(id);
                g.totalSeen.add(participant);
                g.updates++;
            }
        }

        // 🔴 پاک‌سازی خودکار کش گروه
        commandCache.delete(id);
    });
}

// ═══════════════════════════════════════════════
//  🛠️  HELPERS
// ═══════════════════════════════════════════════

const STATUS_META = {
    available:  { emoji: '🟢', label: 'آنلاین',       order: 0, color: '🟩' },
    composing:  { emoji: '✍️', label: 'در حال تایپ',  order: 1, color: '🟦' },
    recording:  { emoji: '🎤', label: 'در حال ضبط',   order: 2, color: '🟥' },
    paused:     { emoji: '⏸️', label: 'مکث کرده',     order: 3, color: '🟨' },
    unavailable:{ emoji: '⚫', label: 'آفلاین',       order: 9, color: '⬛' }
};

function getStatusMeta(s) {
    return STATUS_META[s] || { emoji: '❓', label: 'نامشخص', order: 9, color: '⬜' };
}

function fmtDuration(ms) {
    if (!ms || ms < 0) return '—';
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${s % 60}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
}

function fmtTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

function shortId(jid) {
    return jid.split('@')[0].split(':')[0];
}

function buildProgressBar(current, total, size = 10) {
    if (total === 0) return '░'.repeat(size);
    const filled = Math.round((current / total) * size);
    return '█'.repeat(filled) + '░'.repeat(size - filled);
}

// ═══════════════════════════════════════════════
//  🚀  MAIN COMMAND
// ═══════════════════════════════════════════════

export default async function listonline(sock, from, args = []) {
    const startTime = Date.now();

    try {
        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, {
                text: '❌ این دستور فقط در گروه کار می‌کند'
            });
        }

        // ─── پارس آرگومان‌ها ───
        const flags = {
            detailed: args.includes('-d') || args.includes('--detailed'),
            all: args.includes('-a') || args.includes('--all'),
            stats: args.includes('-s') || args.includes('--stats'),
            history: args.includes('-h') || args.includes('--history'),
            silent: args.includes('--silent')
        };

        // ─── کش ───
        const cached = commandCache.get(from);
        if (cached && (Date.now() - cached.time) < CACHE_TTL && !flags.stats && !flags.history) {
            return sock.sendMessage(from, {
                text: cached.text + '\n\n💾 (از کش)',
                mentions: cached.mentions
            });
        }

        // ─── سابسکرایب ───
        if (!subscribedGroups.has(from)) {
            try {
                await sock.presenceSubscribe(from);
                subscribedGroups.add(from);
                // چک دوره‌ای برای رفرش presence
                setInterval(() => {
                    if (subscribedGroups.has(from)) {
                        sock.presenceSubscribe(from).catch(() => {});
                    }
                }, 60000);
            } catch (e) {
                console.log('SUBSCRIBE ERROR:', e.message);
            }
        }

        const meta = await sock.groupMetadata(from);
        const members = meta.participants.map(p => p.id);
        const memberSet = new Set(members);

        // ─── دریافت presence ───
        const groupPresence = presenceStore.get(from) || new Map();
        const now = Date.now();

        const onlineUsers = [];
        const offlineUsers = [];
        const typingUsers = [];
        const recordingUsers = [];

        for (const [userId, data] of groupPresence.entries()) {
            if (!memberSet.has(userId)) continue;

            const expired = (now - data.timestamp) > PRESENCE_TTL;
            const status = expired ? 'unavailable' : (data.lastKnownPresence || 'available');

            const userObj = {
                id: userId,
                name: meta.participants.find(p => p.id === userId)?.notify || shortId(userId),
                status,
                lastSeen: data.lastSeen,
                duration: now - data.timestamp,
                isAdmin: meta.participants.find(p => p.id === userId)?.admin || null
            };

            if (status === 'composing') typingUsers.push(userObj);
            else if (status === 'recording') recordingUsers.push(userObj);
            else if (status === 'available') onlineUsers.push(userObj);
            else offlineUsers.push(userObj);
        }

        // مرتب‌سازی
        const sorter = (a, b) => (getStatusMeta(a.status).order - getStatusMeta(b.status).order);
        onlineUsers.sort(sorter);
        typingUsers.sort(sorter);
        recordingUsers.sort(sorter);

        const activeList = [...recordingUsers, ...typingUsers, ...onlineUsers];

        // ─── آمار گروه ───
        const groupStats = stats.get(from) || { totalSeen: new Set(), updates: 0 };
        const groupHistory = history.filter(h => h.group === from).slice(-5).reverse();

        // ─── ساخت خروجی ───
        let text = '';

        // ═══ حالت آمار ═══
        if (flags.stats) {
            const onlinePercent = members.length ? ((activeList.length / members.length) * 100).toFixed(1) : 0;
            text = `
╭━━━〔 📊 GROUP STATS 〕━━━╮
┃
┃ 📌 گروه: ${meta.subject}
┃ 👥 کل اعضا: ${members.length}
┃ 👑 ادمین‌ها: ${meta.participants.filter(p => p.admin).length}
┃
┃ 🟢 آنلاین: ${onlineUsers.length}
┃ ✍️ در حال تایپ: ${typingUsers.length}
┃ 🎤 در حال ضبط: ${recordingUsers.length}
┃ ⚫ آفلاین: ${offlineUsers.length}
┃
┃ 📈 نرخ فعالیت:
┃ ${buildProgressBar(activeList.length, members.length, 15)}
┃ ${onlinePercent}%
┃
┃ 🔥 کاربران دیده‌شده: ${groupStats.totalSeen.size}
┃ 🔄 کل آپدیت‌ها: ${groupStats.updates}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

🤖 RAEES SULTAN BOT
`;
            return sock.sendMessage(from, { text });
        }

        // ═══ حالت تاریخچه ═══
        if (flags.history) {
            text = `
╭━━━〔 📜 RECENT HISTORY 〕━━━╮
┃
┃ 📌 گروه: ${meta.subject}
┃
`;
            if (groupHistory.length === 0) {
                text += '┃ ❌ تاریخچه‌ای موجود نیست\n';
            } else {
                for (const h of groupHistory) {
                    const st = getStatusMeta(h.status);
                    const name = meta.participants.find(p => p.id === h.user)?.notify || shortId(h.user);
                    text += `┃ ${st.emoji} ${name}\n`;
                    text += `┃    ${st.label} • ${fmtTime(h.time)}\n┃\n`;
                }
            }
            text += '╰━━━━━━━━━━━━━━━━━━━━━━╯';
            return sock.sendMessage(from, { text });
        }

        // ═══ حالت عادی ═══
        text = `
╭━━━〔 🟢 LIVE PRESENCE 〕━━━╮
┃
┃ 📌 ${meta.subject}
┃ 👥 اعضا: ${members.length} | 🟢 فعال: ${activeList.length}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯
`;

        if (activeList.length === 0) {
            text += `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃  ❌ هیچ کاربر فعالی یافت نشد
┃
┃  💡 راهنما:
┃  • presence بعد از ۱۰ ثانیه منقضی می‌شود
┃  • کاربران باید در گروه فعال باشند
┃  • چند لحظه بعد دوباره امتحان کن
╰━━━━━━━━━━━━━━━━━━━━━━╯
`;
        } else {
            // بخش ضبط‌کننده‌ها
            if (recordingUsers.length > 0) {
                text += `\n🎤 در حال ضبط صدا (${recordingUsers.length}):\n`;
                recordingUsers.forEach((u, i) => {
                    text += `  ${i + 1}. 🎤 ${u.name}\n`;
                });
            }

            // بخش تایپ‌کننده‌ها
            if (typingUsers.length > 0) {
                text += `\n✍️ در حال تایپ (${typingUsers.length}):\n`;
                typingUsers.forEach((u, i) => {
                    text += `  ${i + 1}. ✍️ ${u.name}\n`;
                });
            }

            // بخش آنلاین‌ها
            if (onlineUsers.length > 0) {
                text += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                const displayList = flags.all ? onlineUsers : onlineUsers.slice(0, 15);

                for (let i = 0; i < displayList.length; i++) {
                    const u = displayList[i];
                    const st = getStatusMeta(u.status);
                    const adminBadge = u.isAdmin === 'superadmin' ? '👑' :
                                       u.isAdmin === 'admin' ? '⭐' : '';

                    text += `┃ ${i + 1}️⃣ ${st.emoji} ${u.name} ${adminBadge}\n`;

                    if (flags.detailed) {
                        text += `┃    📱 @${shortId(u.id)}\n`;
                        text += `┃    📡 ${st.label}\n`;
                        text += `┃    ⏱️ از ${fmtDuration(u.duration)} پیش\n`;
                        text += `┃\n`;
                    }
                }

                if (!flags.all && onlineUsers.length > 15) {
                    text += `\n➕ و ${onlineUsers.length - 15} کاربر دیگر\n`;
                    text += `💡 برای دیدن همه: .listonline -a\n`;
                }
            }

            // پیشرفت آنلاین
            text += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
            text += `📊 ${buildProgressBar(activeList.length, members.length, 12)}\n`;
            text += `   ${activeList.length} از ${members.length} عضو فعال\n`;
        }

        // فوتر
        const elapsed = Date.now() - startTime;
        text += `
━━━━━━━━━━━━━━━━━━━━━━
🤖 RAEES SULTAN BOT
⚡ Live Presence • ${elapsed}ms
`;

        // ─── ارسال ───
        const mentions = flags.detailed ? activeList.map(u => u.id) : [];

        await sock.sendMessage(from, { text, mentions });

        // کش کردن
        commandCache.set(from, { text, mentions, time: Date.now() });

    } catch (e) {
        console.log('LISTONLINE ERROR:', e);
        await sock.sendMessage(from, {
            text: `❌ خطا در گرفتن کاربران آنلاین\n\n🔧 ${e.message?.slice(0, 100)}`
        });
    }
}