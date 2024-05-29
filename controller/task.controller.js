const User = require("../model/user.model");
const Category = require("../model/category.model");
const { ACTION_TYPE } = require("../helpers/action_type");
const { bot } = require("../bot");

const addTask = async (chatId) => {
  const user = await User.findOne({ chatId });

  const categories = await Category.find({
    _id: { $in: user.category },
  });
  // console.log(categories);

  const inline_keyboard = categories.map((category) => [
    {
      text: category.name,
      callback_data: JSON.stringify({
        type: ACTION_TYPE.ADD_TASK,
        ct_id: category._id,
      }),
    },
  ]);

  bot.sendMessage(
    chatId,
    "Kiritilayotgan vazifa qaysi kategoriyaga mansubligini belgilang:",
    {
      reply_markup: {
        remove_keyboard: true,
        inline_keyboard,
      },
    }
  );
};

module.exports = { addTask };
