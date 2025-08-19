const ADMIN_CHAT_ID = "948172585";
const userState = {};

function startPaymentFlow(bot, chatId) {
  userState[chatId] = { step: "name" };
  bot.sendMessage(chatId, "Введите вашу Фамилию и Имя:");
}

function setupPayment(bot) {
  bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const state = userState[chatId];

    if (!state || msg.text?.startsWith("/")) return;

    switch (state.step) {
      case "name":
        state.fullName = msg.text;
        state.username = msg.from.username;
        state.step = "insta";
        bot.sendMessage(chatId, "Введите ваш ник в Instagram:");
        break;

      case "insta":
        state.instaNick = msg.text;
        state.step = "package";

        const options = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "FULL PASS (5 классов) - 100 BYN",
                  callback_data: "full",
                },
                {
                  text: "HALF PASS (3 класса) - 80 BYN",
                  callback_data: "half",
                },
                { text: "ONE PASS (1 класс) - 30 BYN", callback_data: "one" },
              ],
            ],
          },
        };

        bot.sendMessage(chatId, "Выберите пакет участия:", options);
        break;

      case "waiting_photo":
        if (!msg.photo) {
          bot.sendMessage(chatId, "Пожалуйста, отправьте фото чека.");
          return;
        }

        const fileId = msg.photo[msg.photo.length - 1].file_id;

        bot.sendPhoto(ADMIN_CHAT_ID, fileId, {
          caption: `
📥 Новый платеж:
👤 Имя: ${state.fullName}
📸 Instagram: ${state.instaNick}
🎟 Пакет: ${state.packageText}
🧑‍🏫 Хореографы: ${state.selectedChoreographers?.join(", ") || "—"}
🆔 Telegram: @${state.username || "нет ника"}

Подтвердить запись?`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Подтвердить", callback_data: `confirm_${chatId}` },
                { text: "❌ Отклонить", callback_data: `reject_${chatId}` },
              ],
            ],
          },
        });

        state.step = "done";
        bot.sendMessage(
          chatId,
          "Чек получен. Ожидайте подтверждения от администратора."
        );
        break;
    }
  });

  bot.on("callback_query", (query) => {
    const data = query.data;
    const chatId = query.message.chat.id;
    const state = userState[chatId];

    if (data.startsWith("confirm_")) {
      const userChatId = data.split("_")[1];
      bot.sendMessage(
        userChatId,
        "✅ Вы успешно записаны! До встречи на занятиях!"
      );
      bot.answerCallbackQuery(query.id, { text: "Запись подтверждена." });
      return;
    }

    if (data.startsWith("reject_")) {
      const userChatId = data.split("_")[1];
      bot.sendMessage(
        userChatId,
        `
❌ Ваша запись была отклонена администратором.

Если у вас остались вопросы — напишите в Telegram: @galinskaaya`
      );
      bot.answerCallbackQuery(query.id, { text: "Запись отклонена." });
      return;
    }

    // Выбор пакета
    if (state?.step === "package") {
      let packageText = "";
      switch (data) {
        case "full":
          packageText = "FULL PASS (5 классов) - 100 BYN";
          break;
        case "half":
          packageText = "HALF PASS (3 класса) - 80 BYN";
          break;
        case "one":
          packageText = "ONE PASS (1 класс) - 30 BYN";
          break;
      }

      state.packageText = packageText;
      state.packageType = data;

      const priceMatch = packageText.match(/(\d+)\s*BYN/);
      const price = priceMatch ? priceMatch[1] : "—";

      if (data === "full") {
        state.step = "waiting_photo";

        bot.sendMessage(
          chatId,
          `
Спасибо! Вот ваши данные:
👤 Имя: ${state.fullName}
📸 Instagram: ${state.instaNick}
🎟 Пакет: ${packageText}
💰 Сумма к оплате: ${price} BYN

Оплата безналичным переводом на карту:  
💳 4255 1901 3306 4249  
📅 01/26  
🏦 Беларусбанк  

После перевода пришлите, пожалуйста, фото чека сюда.`
        );

        // Предварительное сообщение админу
        bot.sendMessage(
          ADMIN_CHAT_ID,
          `
📋 Новый участник:
👤 Имя: ${state.fullName}
📸 Instagram: ${state.instaNick}
🎟 Пакет: ${packageText}
🧑‍🏫 Хореографы: —
🆔 Telegram: @${state.username || "нет ника"}

Ожидаем фото чека для подтверждения.`
        );

        bot.answerCallbackQuery(query.id);
        return;
      }

      // HALF или ONE → выбор хореографов
      state.step = "select_choreographers";
      state.selectedChoreographers = [];
      state.choreographers = [
        "ANUTKA LUV",
        "KIDADA",
        "SHAVUHA",
        "ALEX ARLET",
        "GALINSKAAYA",
      ];

      const keyboard = state.choreographers.map((name) => {
        return [{ text: `☐ ${name}`, callback_data: `choreo_${name}` }];
      });
      keyboard.push([{ text: "✅ Готово", callback_data: "choreo_done" }]);

      bot.sendMessage(
        chatId,
        `
Выберите хореограф${data === "one" ? "а" : "ов"}${
          data === "half" ? " (до 3-х)" : ""
        }:`,
        {
          reply_markup: { inline_keyboard: keyboard },
        }
      );
      bot.answerCallbackQuery(query.id);
      return;
    }

    // Выбор хореографов
    if (state?.step === "select_choreographers") {
      const type = state.packageType;

      if (data === "choreo_done") {
        const count = state.selectedChoreographers.length;

        if (type === "one" && count !== 1) {
          bot.answerCallbackQuery(query.id, {
            text: "Выберите ровно одного хореографа.",
          });
          return;
        }
        if (type === "half" && count === 0) {
          bot.answerCallbackQuery(query.id, {
            text: "Выберите хотя бы одного хореографа.",
          });
          return;
        }

        state.step = "waiting_photo";
        const choreoList = state.selectedChoreographers.join(", ");
        const price = state.packageText.match(/(\d+)\s*BYN/)[1];

        bot.editMessageReplyMarkup(undefined, {
          chat_id: chatId,
          message_id: query.message.message_id,
        });

        bot.sendMessage(
          chatId,
          `
Спасибо! Вот ваши данные:
👤 Имя: ${state.fullName}
📸 Instagram: ${state.instaNick}
🎟 Пакет: ${state.packageText}
💰 Сумма к оплате: ${price} BYN
🧑‍🏫 Хореографы: ${choreoList}

Оплата безналичным переводом на карту:  
💳 4255 1901 3306 4249  
📅 01/26  
🏦 Беларусбанк  

После перевода пришлите, пожалуйста, фото чека сюда.`
        );

        // Предварительное сообщение админу
        bot.sendMessage(
          ADMIN_CHAT_ID,
          `
📋 Новый участник:
👤 Имя: ${state.fullName}
📸 Instagram: ${state.instaNick}
🎟 Пакет: ${state.packageText}
🧑‍🏫 Хореографы: ${choreoList}
🆔 Telegram: @${state.username || "нет ника"}

Ожидаем фото чека для подтверждения.`
        );

        bot.answerCallbackQuery(query.id);
        return;
      }

      const choreoName = data.replace("choreo_", "");
      const index = state.selectedChoreographers.indexOf(choreoName);

      if (index === -1) {
        if (type === "one" && state.selectedChoreographers.length >= 1) {
          bot.answerCallbackQuery(query.id, {
            text: "Можно выбрать только одного хореографа.",
          });
          return;
        }
        if (type === "half" && state.selectedChoreographers.length >= 3) {
          bot.answerCallbackQuery(query.id, {
            text: "Можно выбрать максимум 3 хореографа.",
          });
          return;
        }
        state.selectedChoreographers.push(choreoName);
      } else {
        state.selectedChoreographers.splice(index, 1);
      }

      const updatedKeyboard = state.choreographers.map((name) => {
        const selected = state.selectedChoreographers.includes(name);
        return [
          {
            text: `${selected ? "✅" : "☐"} ${name}`,
            callback_data: `choreo_${name}`,
          },
        ];
      });
      updatedKeyboard.push([
        { text: "✅ Готово", callback_data: "choreo_done" },
      ]);

      bot.editMessageReplyMarkup(
        { inline_keyboard: updatedKeyboard },
        {
          chat_id: chatId,
          message_id: query.message.message_id,
        }
      );
      bot.answerCallbackQuery(query.id);
    }
  });
}

module.exports = { setupPayment, startPaymentFlow };
