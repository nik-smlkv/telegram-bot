require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { setupMenu } = require('./bot/menu');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log('Бот запущен...');

// Подключаем команды
require('./bot/commands/start')(bot);
require('./bot/commands/shedule')(bot);
const { setupPayment } = require('./bot/commands/payment');
setupPayment(bot);
// Меню
setupMenu(bot);

