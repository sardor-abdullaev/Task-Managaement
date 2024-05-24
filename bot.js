const TelegramBot = require("node-telegram-bot-api");

exports.bot = new TelegramBot(process.env.TOKEN, {
  polling: true,
});
