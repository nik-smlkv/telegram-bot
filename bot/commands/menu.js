// menu.js
const BTN_CLASS = 'HIP-HOP CLASS';     // мастер-класс (45 р)
const BTN_CAST  = 'Команда YNK';       // тренировки вт/чт 90 р
const BTN_PAY   = 'Оплата';

const mainKeyboard = {
  keyboard: [
    [BTN_CLASS, BTN_CAST],
    [BTN_PAY],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
  is_persistent: true,
  input_field_placeholder: 'Выберите пункт меню…',
};

function setupMenu(bot, { showSchedule, startPaymentFlow, cancelFlowIfAny }) {
  bot.setMyCommands([
    { command: '/start', description: 'Начать' },
    { command: '/menu',  description: 'Меню' },
    { command: '/payment', description: 'Оплата' },
  ]);

  bot.onText(/^\/menu$/, (msg) => {
    cancelFlowIfAny(msg.chat.id);
    bot.sendMessage(msg.chat.id, 'Выберите раздел:', {
      reply_markup: mainKeyboard,
    });
  });

  bot.onText(/^\/payment$/, (msg) => startPaymentFlow(bot, msg.chat.id));

  // обработка reply-кнопок
  bot.on("message", (msg) => {
    const text = msg.text;
    if (!text || text.startsWith("/")) return;

    const chatId = msg.chat.id;

    if (text === BTN_CLASS) return showSchedule(bot, chatId, "class");
    if (text === BTN_CAST)  return showSchedule(bot, chatId, "casting");

    if (text === BTN_PAY)   return startPaymentFlow(bot, chatId);
  });
}

module.exports = { mainKeyboard, setupMenu };
