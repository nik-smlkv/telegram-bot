const { startPaymentFlow } = require('./commands/payment');
const showSchedule = require('./commands/shedule');

function setupMenu(bot) {
	// Устанавливаем встроенное Telegram-меню
	bot.setMyCommands([
		{ command: '/start', description: 'Начать общение с ботом' },
		{ command: '/menu', description: 'Открыть главное меню' },
		{ command: '/schedule', description: '📅 Посмотреть расписание' },
		{ command: '/payment', description: '💳 Оплатить участие' }
	]);

	// Команда /menu — показывает обычную клавиатуру
	bot.onText(/\/menu/, (msg) => {
		const chatId = msg.chat.id;

		const options = {
			reply_markup: {
				keyboard: [
					['📅 Расписание', '💳 Оплата'],
				],
				resize_keyboard: true,
				one_time_keyboard: false,
			},
		};

		bot.sendMessage(chatId, 'Выберите пункт меню:', options);
	});

	// Команда /schedule — показать расписание
	bot.onText(/\/schedule/, (msg) => {
		const chatId = msg.chat.id;
		showSchedule(bot, chatId);
	});

	// Команда /payment — начать оплату
	bot.onText(/\/payment/, (msg) => {
		const chatId = msg.chat.id;
		startPaymentFlow(bot, chatId);
	});

	// Обработка выбора из обычной клавиатуры
	bot.on('message', (msg) => {
		const chatId = msg.chat.id;
		const text = msg.text;

		if (text === '📅 Расписание') {
			showSchedule(bot, chatId);
		}

		if (text === '💳 Оплата') {
			startPaymentFlow(bot, chatId);
		}
	});
}


module.exports = { setupMenu };
