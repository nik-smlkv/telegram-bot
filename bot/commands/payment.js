// commands/payment.js
const ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID) || 948172585;

const userState = {}; // chatId -> { active, step, data }

function cancelFlowIfAny(chatId) {
  if (userState[chatId]?.active) {
    userState[chatId] = { active: false, step: "idle" };
  }
}

function startPaymentFlow(bot, chatId) {
  userState[chatId] = {
    active: true,
    step: "fio",
    data: {},
  };

  bot.sendMessage(
    chatId,
    "🧾 Оплата участия в мастер-классе: *45 BYN*\n\nВведите вашу *Фамилию и Имя*:",
    { parse_mode: "Markdown" }
  );
}

function askAge(bot, chatId) {
  bot.sendMessage(chatId, "Введите ваш *возраст* (от 16 до 80):", {
    parse_mode: "Markdown",
  });
}

function askInstagram(bot, chatId) {
  bot.sendMessage(chatId, "Введите ваш *Instagram* (например: @nickname):", {
    parse_mode: "Markdown",
  });
}

function showPaymentInstruction(bot, chatId) {
  const s = userState[chatId];
  if (!s) return;

  bot.sendMessage(
    chatId,
    `Проверьте данные:\n\n` +
      `👤 ФИО: ${s.data.fio}\n` +
      `🎂 Возраст: ${s.data.age}\n` +
      `📸 Instagram: ${s.data.instagram}\n\n` +
      `💳 *К оплате: 45 BYN*\n\n` +
      `Оплата на карту:\n` +
      `• 4255 1901 3306 4249\n` +
      `• 01/26\n` +
      `• Беларусбанк\n\n` +
      `После перевода отправьте *фото чека* сюда.`,
    { parse_mode: "Markdown" }
  );

  // уведомляем админа + INLINE-кнопки подтверждения/отклонения
  bot.sendMessage(
    ADMIN_CHAT_ID,
    `📋 Пользователь начал оплату (45 BYN):\n` +
      `👤 ${s.data.fio}\n🎂 ${s.data.age}\n📸 ${s.data.instagram}\n` +
      `🆔 @${s.data.tgNick || "—"}\n\n` +
      `Чек придёт следующим сообщением.`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Подтвердить", callback_data: `pay:ok:${chatId}` },
          { text: "❌ Отклонить",   callback_data: `pay:no:${chatId}` },
        ]],
      },
    }
  );

  s.step = "waiting_receipt";
}

function setupPayment(bot) {
  // утилита безопасной отправки сообщений
  async function safeSend(toChatId, payload, onError) {
    try {
      return await bot.sendMessage(toChatId, payload.text, payload.opts || {});
    } catch (err) {
      if (onError) onError(err);
      return null;
    }
  }

  // утилиты редактирования карточки у админа
  function disableInline(msg) {
    // убрать кнопки
    const opts = { chat_id: msg.chat.id, message_id: msg.message_id, reply_markup: { inline_keyboard: [] } };
    if (msg.caption) return bot.editMessageCaption(msg.caption, opts).catch(() => {});
    return bot.editMessageReplyMarkup({ inline_keyboard: [] }, opts).catch(() => {});
  }
  function setStatusOnAdminCard(msg, statusLine) {
    const opts = { chat_id: msg.chat.id, message_id: msg.message_id, reply_markup: { inline_keyboard: [] }, parse_mode: "Markdown" };
    if (msg.caption) {
      const updated = msg.caption + `\n\n${statusLine}`;
      return bot.editMessageCaption(updated, { ...opts }).catch(() => {});
    } else if (msg.text) {
      const updated = msg.text + `\n\n${statusLine}`;
      return bot.editMessageText(updated, { ...opts }).catch(() => {});
    }
  }

  // основной сценарий оплаты
  bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const s = userState[chatId];

    if (!s?.active) return;
    if (text && text.startsWith("/")) return;

    switch (s.step) {
      case "fio": {
        if (
          !text ||
          !/^[A-Za-zА-Яа-яЁёІіЇїЄє'’\-]+\s+[A-Za-zА-Яа-яЁёІіЇїЄє'’\-]+$/.test(
            text.trim()
          )
        ) {
          bot.sendMessage(chatId, "Пожалуйста, введите Фамилию и Имя через пробел.");
          return;
        }
        s.data.fio = text.trim();
        s.data.tgNick = msg.from?.username || null;
        s.step = "age";
        return askAge(bot, chatId);
      }

      case "age": {
        const age = Number(text?.trim());
        if (!Number.isInteger(age) || age < 16 || age > 80) {
          bot.sendMessage(
            chatId,
            "Возраст должен быть *числом* от 16 до 80.",
            { parse_mode: "Markdown" }
          );
          return;
        }
        s.data.age = age;
        s.step = "instagram";
        return askInstagram(bot, chatId);
      }

      case "instagram": {
        if (!/^@[\w.\-]{2,}$/.test(String(text).trim())) {
          bot.sendMessage(chatId, "Ник должен начинаться с @ (например: @nickname).");
          return;
        }
        s.data.instagram = text.trim();
        return showPaymentInstruction(bot, chatId);
      }

      case "waiting_receipt": {
        if (!msg.photo && !msg.document) {
          bot.sendMessage(chatId, "Пожалуйста, отправьте *фото чека*.", {
            parse_mode: "Markdown",
          });
          return;
        }

        const fileId = msg.photo
          ? msg.photo[msg.photo.length - 1].file_id
          : msg.document.file_id;

        // отправляем чек админу вместе с кнопками подтверждения/отклонения
        bot.sendPhoto(ADMIN_CHAT_ID, fileId, {
          caption:
            `📥 Новый платёж (45 BYN)\n` +
            `👤 ${s.data.fio}\n🎂 ${s.data.age}\n📸 ${s.data.instagram}\n` +
            `🆔 @${s.data.tgNick || "—"}`,
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Подтвердить", callback_data: `pay:ok:${chatId}` },
              { text: "❌ Отклонить",   callback_data: `pay:no:${chatId}` },
            ]],
          },
        }).catch(() => {});

        s.active = false;
        s.step = "done";
        bot.sendMessage(chatId, "✅ Чек получен. Ожидайте подтверждения!");
        return;
      }
    }
  });

  // обработка кликов админа по inline-кнопкам
  bot.on("callback_query", async (q) => {
    const data = q.data || "";
    const adminChatId = q.message?.chat?.id;

    // защита: только админ может жать эти кнопки
    if (adminChatId !== ADMIN_CHAT_ID) {
      return bot.answerCallbackQuery(q.id, { text: "Нет прав", show_alert: true });
    }

    if (!data.startsWith("pay:")) return;

    const [, action, userChatIdStr] = data.split(":");
    const userChatId = Number(userChatIdStr);

    if (!userChatId) {
      return bot.answerCallbackQuery(q.id, { text: "Некорректный ID", show_alert: true });
    }

    if (action === "ok") {
      // пытаемся уведомить пользователя
      let delivered = true;
      try {
        await bot.sendMessage(
          userChatId,
          "✅ Оплата подтверждена! До встречи на мастер-классе *15.11, 18:00–20:00*.\nМесто: TORITEAM STUDIO, г. Новополоцк, ул. Дзержинского 17/2 (вход со двора)",
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        delivered = false;
        bot.answerCallbackQuery(q.id, { text: "Пользователь недоступен (возможно, заблокировал бота).", show_alert: true }).catch(()=>{});
      }

      // помечаем карточку у админа и убираем кнопки
      await setStatusOnAdminCard(q.message, delivered ? "✅ Подтверждено и отправлено пользователю." : "⚠️ Подтверждено, но пользователю отправить не удалось.").catch(()=>{});
      await disableInline(q.message);

      return bot.answerCallbackQuery(q.id).catch(()=>{});
    }

    if (action === "no") {
      // пытаемся уведомить пользователя
      let delivered = true;
      try {
        await bot.sendMessage(
          userChatId,
          "❌ Оплата отклонена. Напишите, пожалуйста, @galinskaaya"
        );
      } catch (err) {
        delivered = false;
        bot.answerCallbackQuery(q.id, { text: "Пользователь недоступен (возможно, заблокировал бота).", show_alert: true }).catch(()=>{});
      }

      // помечаем карточку у админа и убираем кнопки
      await setStatusOnAdminCard(q.message, delivered ? "❌ Отклонено и отправлено пользователю." : "⚠️ Отклонено, но пользователю отправить не удалось.").catch(()=>{});
      await disableInline(q.message);

      return bot.answerCallbackQuery(q.id).catch(()=>{});
    }
  });
}

module.exports = {
  setupPayment,
  startPaymentFlow,
  cancelFlowIfAny,
};
