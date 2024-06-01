const User = require("../model/user.model");
const Category = require("../model/category.model");
const Task = require("../model/task.model");

const { ACTION_TYPE } = require("../helpers/action_type");
const { bot } = require("../bot");

const addCategory = async (chatId) => {
  const user = await User.findOne({ chatId });
  user.action = "add_category";
  await user.save();

  bot.sendMessage(chatId, "Kategoriya nomini kiriting:");
};

const saveCategory = async (msg) => {
  // In this code, there is going to be problem when rename category

  // 1.Add unique category to DB
  let categoryId;
  const category = await Category.findOne({ name: msg.text.toLowerCase() });

  if (category) {
    categoryId = category._id;
  } else {
    const newCategory = new Category({ name: msg.text });
    await newCategory.save();
    categoryId = newCategory._id;
  }

  // 2.Attach category to user
  const chatId = msg.from.id;
  const user = await User.findOne({ chatId });
  await User.findByIdAndUpdate(user._id, {
    action: "category",
    category: user.category.includes(categoryId)
      ? [...user.category]
      : [...user.category, categoryId],
  });

  bot.sendMessage(chatId, "Yangi kategoriya qo'shildi.");
  getAllCategories(chatId);
};

const getAllCategories = async (chatId) => {
  const user = await User.findOne({ chatId });
  let categories = [];
  if (user.category ?? user.category.length) {
    categories = await Category.find({
      _id: { $in: user.category },
    });
  }

  const list = categories.map((category) => [
    {
      text: category.name,
      callback_data: JSON.stringify({
        type: ACTION_TYPE.SHOW_CATEGORY,
        ct_id: category._id,
      }),
    },
  ]);

  const inline_keyboard = [
    ...list,
    [
      {
        text: "➕Yangi kategoriya qo'shish",
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

const getCategory = async (chatId, categoryId) => {
  const user = await User.findOne({ chatId });
  const category = await Category.findById(categoryId);

  if (!user.category.includes(categoryId)) {
    bot.sendMessage(
      chatId,
      `${category.name} kategoriya topilmadi.\n /addcategory 'message' orqali qayta qo'shiishingiz mumkin.`
    );
    return;
  }

  const tasks = await Task.find({
    user: user._id,
    category: categoryId,
  });
  // console.log(tasks);
  const list = tasks.map((task) => [
    {
      text: task.title,
      callback_data: JSON.stringify({
        type: ACTION_TYPE.SHOW_TASK,
        task_id: task._id,
      }),
    },
  ]);

  const inline_keyboard = [
    ...list,
    [
      {
        text: "📝Kategoriyani tahrirlash",
        callback_data: JSON.stringify({
          type: ACTION_TYPE.EDIT_CATEGORY,
          ct_id: categoryId,
        }),
      },
      {
        text: "🗑Kategoriyani o'chirish",
        callback_data: JSON.stringify({
          type: ACTION_TYPE.DELETE_CATEGORY,
          ct_id: categoryId,
        }),
      },
    ],
    [
      {
        text: "➕Yangi vazifa qo'shish",
        callback_data: JSON.stringify({
          type: ACTION_TYPE.ADD_TASK,
          ct_id: categoryId,
        }),
      },
    ],
  ];

  bot.sendMessage(
    chatId,
    `${category.name} kategoriyadagi vazifalar ${
      tasks.length ? ":" : "hozircha bo'sh"
    }`,
    {
      reply_markup: {
        remove_keyboard: true,
        inline_keyboard,
      },
    }
  );
};

const editCategory = async (chatId, categoryId, msgId = 0) => {
  const category = await Category.findById(categoryId);
  const user = await User.findOne({ chatId });
  user.action = `edit_ct-${categoryId}`;
  await user.save();

  if (msgId) {
    bot.deleteMessage(chatId, msgId);
  }
  bot.sendMessage(chatId, `${category.name} kategoriyaga yangi nom kiriting:`);
};

const updateCategory = async (chatId, categoryId, categoryName) => {
  const category = await Category.findOne({ name: categoryName });
  if (category) {
    bot.sendMessage(
      chatId,
      `${categoryName} kategoriya allaqachon kiritilgan!`
    );
    return;
  }
  await Category.findByIdAndUpdate(categoryId, { name: categoryName });
  bot.sendMessage(chatId, "Kategoriya yangilandi!");
  getAllCategories(chatId);
};

const deleteCategory = async (chatId, categoryId, msgId) => {
  const user = await User.findOne({ chatId });

  const tasks = await Task.find({ category: categoryId }).select(["id"]);
  await Promise.all(
    tasks.map(async (task) => {
      await Task.findOneAndDelete(task);
    })
  );

  user.category = user.category.filter((catEl) => catEl != categoryId);
  await user.save();

  bot.deleteMessage(chatId, msgId);
  bot.sendMessage(chatId, "Kategoriya o'chirildi!");
  getAllCategories(chatId);
};

module.exports = {
  addCategory,
  saveCategory,
  getAllCategories,
  getCategory,
  deleteCategory,
  editCategory,
  updateCategory,
  deleteCategory,
};
