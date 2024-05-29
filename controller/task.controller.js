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
    text: "Vazifa deadline vaqtini YYYY-MM-DDTHH:mm:ss formatda kiriting:\nNamuna: 2024-05-29T13:51:50",
  },
  deadline: {
    action: "new_task-priority",
    text: "Vazifa ustuvorligini tanlang:",
  },
};

const inline_keyboard = ["critical", "high", "medium", "low"].map(
  (priority) => [
    {
      text: priority,
      callback_data: JSON.stringify({
        type: ACTION_TYPE.CHOOSE_TASK_PRIORITY,
        priority,
      }),
    },
  ]
);

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
          //         type: ACTION_TYPE.CHOOSE_TASK_PRIORITY,
          //         status: "critical",
          //       }),
          //     },
          //   ],
          //   [
          //     {
          //       text: "high",
          //       callback_data: JSON.stringify({
          //         type: ACTION_TYPE.CHOOSE_TASK_PRIORITY,
          //         status: "high",
          //       }),
          //     },
          //   ],
          //   [
          //     {
          //       text: "medium",
          //       callback_data: JSON.stringify({
          //         type: ACTION_TYPE.CHOOSE_TASK_PRIORITY,
          //         status: "medium",
          //       }),
          //     },
          //   ],
          //   [
          //     {
          //       text: "low",
          //       callback_data: JSON.stringify({
          //         type: ACTION_TYPE.CHOOSE_TASK_PRIORITY,
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
  const task = await Task.findById(taskId).populate("category");
  // console.log(task);
  bot.sendMessage(
    chatId,
    `Title: <b>${task.title}</b>\Category: <b>${task.category.name}</b>\Description: <b>${task.description}</b>\Priority: <b>${task.priority}</b>\nStatus: <b>${task.status}\nDeadline: <b>${task.deadline}</b></b>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        remove_keyboard: true,
        inline_keyboard: [
          [
            {
              text: "📝Tahrirlash",
              callback_data: JSON.stringify({
                type: ACTION_TYPE.EDIT_TASK,
                task_id: taskId,
              }),
            },
            {
              text: "🗑O'chirish",
              callback_data: JSON.stringify({
                type: ACTION_TYPE.DELETE_TASK,
                task_id: taskId,
              }),
            },
          ],
        ],
      },
    }
  );
};

const deleteTask = async (chatId, taskId, msgId) => {
  bot.deleteMessage(chatId, msgId);
  await Task.findByIdAndDelete(taskId);
  bot.sendMessage(chatId, "Vazifa o'chirildi.");
};

const editTask = async (chatId, taskId) => {
  const user = await User.findOne({ chatId });
  user.action = `edit_task-${taskId}`;
  await user.save();

  const fields = ["title", "description", "priority", "status", "deadline"].map(
    (field) => [
      {
        text: field,
        callback_data: JSON.stringify({
          type: ACTION_TYPE.EDIT_TASK_FIELD,
          // tid: taskId,
          field,
          //Error: ETELEGRAM: 400 Bad Request: BUTTON_DATA_INVALID
          //that's why we use user.action
        }),
      },
    ]
  );

  bot.sendMessage(chatId, "Qaysi maydonni tahrir qilishni tanlang:", {
    reply_markup: {
      inline_keyboard: [
        ...fields,
        user.category.length > 1
          ? [
              {
                text: "category",
                callback_data: JSON.stringify({
                  type: ACTION_TYPE.EDIT_TASK_FIELD,
                  field: "category",
                }),
              },
            ]
          : [],
      ],
    },
  });
};

const inline_keyboardPriority = ["critical", "high", "medium", "low"].map(
  (priority) => [
    {
      text: priority,
      callback_data: JSON.stringify({
        type: ACTION_TYPE.UPDATE_TASK_PRIORITY,
        priority,
      }),
    },
  ]
);

const editTaskField = async (chatId, field, val = null) => {
  const user = await User.findOne({ chatId });
  if (!val) {
    const taskId = user.action.split("-")[1];
    console.log("test");
    if (["title", "description", "deadline"].includes(field)) {
      user.action = `edit_task-${taskId}-${field}`;
      await user.save();
    } else if (field == "priority") {
      bot.sendMessage(chatId, "Yangilanayotgan priorityni tanlang:", {
        reply_markup: {
          remove_keyboard: true,
          inline_keyboard: inline_keyboardPriority,
        },
      });
    } else if (field == "status") {
      bot.sendMessage(chatId, "status");
    } else if (field == "category") {
      bot.sendMessage(chatId, "status");
    }
  } else {
  }
};

module.exports = {
  addTask,
  add_task_next,
  getTask,
  deleteTask,
  editTask,
  editTaskField,
};
