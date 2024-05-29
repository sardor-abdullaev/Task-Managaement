const User = require("../model/user.model");
const Category = require("../model/category.model");
const Task = require("../model/task.model");

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

const steps = {
  title: {
    action: "new_task-description",
    text: "Vazifa haqida qisqacha ma'lumot kiriting:",
  },
  description: {
    action: "new_task-deadline",
    text: "Vazifa deadline vaqtini kiriting",
  },
  deadline: {
    action: "new_task-priority",
    text: "Vazifa ustuvorligini tanlang:",
  },
};

const inline_keyboard = ["critical", "high", "medium", "low"].map((status) => [
  {
    text: status,
    callback_data: JSON.stringify({
      type: ACTION_TYPE.CHOOSE_TASK_STATUS,
      status,
    }),
  },
]);

const add_task_next = async (chatId, value, slug, categoryId = null) => {
  const user = await User.findOne({ chatId });

  if (categoryId) {
    const newTask = new Task({ category: categoryId, user: user._id });
    await newTask.save();

    user.action = "new_task-title";
    await user.save();

    bot.sendMessage(chatId, "Yangi vazifa nomini kiriting:");
    return;
  }

  const task = await Task.findOne({ status: "0" });
  if (["title", "description", "priority", "deadline"].includes(slug)) {
    task[slug] = value;

    if (slug == "priority") {
      user.action = "category";
      await user.save();

      task.status = "pending";
      bot.sendMessage(chatId, "Vazifa saqlandi!");
    } else if (slug == "deadline") {
      bot.sendMessage(chatId, "Vazifa ustuvorligini tanlang:", {
        reply_markup: {
          remove_keyboard: true,
          inline_keyboard,
          // inline_keyboard: [
          //   [
          //     {
          //       text: "critical",
          //       callback_data: JSON.stringify({
          //         type: ACTION_TYPE.CHOOSE_TASK_STATUS,
          //         status: "critical",
          //       }),
          //     },
          //   ],
          //   [
          //     {
          //       text: "high",
          //       callback_data: JSON.stringify({
          //         type: ACTION_TYPE.CHOOSE_TASK_STATUS,
          //         status: "high",
          //       }),
          //     },
          //   ],
          //   [
          //     {
          //       text: "medium",
          //       callback_data: JSON.stringify({
          //         type: ACTION_TYPE.CHOOSE_TASK_STATUS,
          //         status: "medium",
          //       }),
          //     },
          //   ],
          //   [
          //     {
          //       text: "low",
          //       callback_data: JSON.stringify({
          //         type: ACTION_TYPE.CHOOSE_TASK_STATUS,
          //         status: "low",
          //       }),
          //     },
          //   ],
          // ],
        },
      });
    } else {
      user.action = steps[slug].action;
      await user.save();
      bot.sendMessage(chatId, steps[slug].text);
    }
    await task.save();
  }
};

const getTask = async (chatId, taskId) => {
  const task = await Task.findById(taskId);
  console.log(task);
  bot.sendMessage(chatId, `Title: <b>${task.title}</b>`, {
    parse_mode: "HTML",
  });
};
module.exports = { addTask, add_task_next, getTask };
