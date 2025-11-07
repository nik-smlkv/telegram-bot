// index.js
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const showSchedule = require('./bot/commands/schedule');
const startCommand = require('./bot/commands/start');
const { setupPayment, startPaymentFlow, cancelFlowIfAny } = require('./bot/commands/payment');
const { setupMenu } = require('./bot/commands/menu');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// /start
startCommand(bot);

// меню и кнопки
setupMenu(bot, { showSchedule, startPaymentFlow, cancelFlowIfAny });

// Оплата
setupPayment(bot);

console.log("✅ Бот запущен");
