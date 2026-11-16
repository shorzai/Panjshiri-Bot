// commands/hubx.js
// اتصال به API فروشگاه HubX

const BASE_URL = "https://open-greeting-glow-production.up.railway.app/api/public/reseller/v1"\;
const API_KEY = process.env.HUBX_API_KEY;

async function fetchAPI(endpoint, options = {}) {
    if (!API_KEY) throw new Error("کلید API فروشگاه (HUBX_API_KEY) در تنظیمات ست نشده است.");
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            ...options.headers
        }
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `خطای API: ${res.status}`);
    return data;
}

export default async function hubx(sock, from, body, m, args) {
    const command = args[0]?.toLowerCase();
    
    try {
        // =======================
        // 1. لیست محصولات (!hubx store)
        // =======================
        if (command === "store" || command === "products") {
            await sock.sendMessage(from, { text: "⏳ در حال دریافت لیست محصولات..." }, { quoted: m });
            
            const data = await fetchAPI("/products");
            const products = data.data || data.products || data;

            if (!products || products.length === 0) {
                return await sock.sendMessage(from, { text: "❌ هیچ محصولی در فروشگاه موجود نیست." }, { quoted: m });
            }

            let text = `╭━━━〔 🛒 فروشگاه HubX 〕━━━╮\n┃\n`;
            products.slice(0, 15).forEach((p, i) => {
                text += `┃ 🔹 *${i + 1}. ${p.name || p.title}*\n`;
                text += `┃ 💰 قیمت: ${p.price} USDT\n`;
                text += `┃ 📦 موجودی: ${p.stock || p.stock_quantity || 'نامشخص'}\n`;
                text += `┃ 🆔 آیدی: \`${p.id || p.slug}\`\n┃\n`;
            });
            text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n💡 برای خرید دستور زیر را بزنید:\n!hubx buy [آیدی] [تعداد]`;
            
            return await sock.sendMessage(from, { text }, { quoted: m });
        }

        // =======================
        // 2. موجودی کیف پول (!hubx balance)
        // =======================
        if (command === "balance") {
            const data = await fetchAPI("/balance");
            const balance = data.balance || data.data?.balance || data;
            
            return await sock.sendMessage(from, { 
                text: `💳 *موجودی کیف پول شما:*\n\n💵 ${balance} USDT` 
            }, { quoted: m });
        }

        // =======================
        // 3. تاریخچه سفارشات (!hubx orders)
        // =======================
        if (command === "orders") {
            await sock.sendMessage(from, { text: "⏳ در حال دریافت سفارشات..." }, { quoted: m });
            const data = await fetchAPI("/orders");
            const orders = data.data || data.orders || data;

            if (!orders || orders.length === 0) {
                return await sock.sendMessage(from, { text: "❌ شما هیچ سفارشی ندارید." }, { quoted: m });
            }

            let text = `╭━━━〔 📦 سفارشات اخیر شما 〕━━━╮\n┃\n`;
            orders.slice(0, 10).forEach((o, i) => {
                text += `┃ 🔸 *سفارش ${i + 1}*\n`;
                text += `┃ 🆔 کد سفارش: \`${o.id || o.order_id}\`\n`;
                text += `┃ 📦 محصول: ${o.product_name || o.product_id}\n`;
                text += `┃ 📊 وضعیت: ${o.status}\n`;
                text += `┃ 💰 مبلغ: ${o.total_price || o.amount} USDT\n┃\n`;
            });
            text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
            return await sock.sendMessage(from, { text }, { quoted: m });
        }

        // =======================
        // 4. خرید محصول (!hubx buy)
        // =======================
        if (command === "buy" || command === "order") {
            const productId = args[1];
            const quantity = parseInt(args[2]) || 1;

            if (!productId) {
                return await sock.sendMessage(from, { 
                    text: "⚠️ لطفاً آیدی محصول را وارد کنید.\n\nمثال:\n!hubx buy 12 1" 
                }, { quoted: m });
            }

            await sock.sendMessage(from, { text: "⏳ در حال ثبت سفارش شما..." }, { quoted: m });

            const externalOrderId = `${from.split('@')[0]}-${Date.now()}`;

            const data = await fetchAPI("/orders", {
                method: "POST",
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity,
                    external_order_id: externalOrderId
                })
            });

            const order = data.data || data.order || data;
            
            let successText = `✅ *سفارش شما با موفقیت ثبت شد!*\n\n`;
            successText += `🆔 کد سفارش: \`${order.id || order.order_id || 'نامشخص'}\`\n`;
            successText += `📦 محصول: ${order.product_name || productId}\n`;
            successText += `📊 تعداد: ${quantity}\n`;
            successText += `💰 مبلغ کسر شده: ${order.total_price || order.amount || 'نامشخص'} USDT\n\n`;
            
            if (order.items || order.delivery || order.deliveries) {
                successText += `🎁 *اطلاعات تحویل:*\n${JSON.stringify(order.items || order.delivery || order.deliveries, null, 2)}`;
            } else {
                successText += `برای دریافت اطلاعات تحویل، دستور !hubx orders را بزنید.`;
            }

            return await sock.sendMessage(from, { text: successText }, { quoted: m });
        }

        // =======================
        // راهنما (Help)
        // =======================
        return await sock.sendMessage(from, {
            text: `╭━━━〔 🛍️ راهنمای فروشگاه HubX 〕━━━╮\n┃\n` +
                  `┃ 🛒 !hubx store - مشاهده محصولات\n` +
                  `┃ 💳 !hubx balance - مشاهده موجودی\n` +
                  `┃ 📦 !hubx orders - سفارشات اخیر\n` +
                  `┃ 🛍️ !hubx buy [آیدی] [تعداد] - خرید\n` +
                  `┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: m });

    } catch (error) {
        console.error("HUBX API ERROR:", error);
        await sock.sendMessage(from, { text: `❌ *خطا در ارتباط با فروشگاه:*\n${error.message}` }, { quoted: m });
    }
}
