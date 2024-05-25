const { bot } = require("../bot");
const User = require("../model/user.model");
const Category = require("../model/category.model");

const addCategory = async (chatId) => {
  const user = await User.findOne({ chatId });
  user.action = "add_category";
  await user.save();

  bot.sendMessage(chatId, "Kategoriya nomini kiriting:");
};

const saveCategory = async (msg) => {
  //   1.Add unique category to DB
  let categoryId;
  const category = await Category.findOne({ name: msg.text.toLowerCase() });

  if (category) {
    categoryId = category._id;
  } else {
    const newCategory = new Category({ name: msg.text });
    await newCategory.save();
    categoryId = newCategory._id;
  }

  //   2.Attach category to user
  const user = await User.findOne({ chatId: msg.from.id });
  await User.findByIdAndUpdate(user._id, {
    action: "category",
    category: user.category.includes(categoryId)
      ? [...user.category]
      : [...user.category, categoryId],
  });

  bot.sendMessage(msg.from.id, "Added new category.");
};

const getAllCategories = async (chatId) => {
  const user = await User.findOne({ chatId });

  const categories = await Category.find({
    _id: { $in: user.category },
  });
  // console.log(categories);

  const list = categories.map((category) => [
    {
      text: category.name,
      callback_data: JSON.stringify({
        type: ACTION_TYPE.ADD_EXPENSE,
        ct_id: category._id,
      }),
    },
  ]);

  const inline_keyboard = [
    ...list,
    [
      {
        text: "Yangi kategoriya qo'shish",
        callback_data: JSON.stringify({
          type: ACTION_TYPE.ADD_CATEGORY,
        }),
      },
    ],
  ];

  bot.sendMessage(
    chatId,
    categories.length
      ? "Kategoriyalar ro'yxati:"
      : "Kategoriyalar ro'yxati hozircha bo'sh.",
    {
      reply_markup: {
        remove_keyboard: true,
        inline_keyboard,
      },
    }
  );
};

module.exports = { addCategory, saveCategory, getAllCategories };
