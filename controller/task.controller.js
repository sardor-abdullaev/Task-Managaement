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
    `Title: <b>${task.title}</b>\nCategory: <b>${task.category.name}</b>\nDescription: <b>${task.description}</b>\nPriority: <b>${task.priority}</b>\nStatus: <b>${task.status}\nDeadline: <b>${task.deadline}</b></b>`,
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
        type: ACTION_TYPE.UPDATE_TASK_FIELD,
        value: priority,
      }),
    },
  ]
);

const inline_keyboardStatus = ["completed", "pending", "ongoing"].map(
  (status) => [
    {
      text: status,
      callback_data: JSON.stringify({
        type: ACTION_TYPE.UPDATE_TASK_FIELD,
        value: status,
      }),
    },
  ]
);

const editTaskField = async (chatId, field) => {
  const user = await User.findOne({ chatId });

  const taskId = user.action.split("-")[1];

  user.action = `edit_task-${taskId}-${field}`;
  await user.save();

  if (["title", "description", "deadline"].includes(field)) {
    bot.sendMessage(chatId, `Tangilanayotgan "${field}" maydonini kiriting: `);
  } else if (field == "priority") {
    bot.sendMessage(chatId, "Yangilanayotgan priorityni tanlang:", {
      reply_markup: {
        remove_keyboard: true,
        inline_keyboard: inline_keyboardPriority,
      },
    });
  } else if (field == "status") {
    bot.sendMessage(chatId, "Yangilanayotgan statusni tanlang:", {
      reply_markup: {
        remove_keyboard: true,
        inline_keyboard: inline_keyboardStatus,
      },
    });
  } else if (field == "category") {
    const categories = await Promise.all(
      user.category.map(async (cat) => await Category.findById(cat))
    );

    const inline_keyboardCategory = categories.map((category) => [
      {
        text: category.name,
        callback_data: JSON.stringify({
          type: ACTION_TYPE.UPDATE_TASK_FIELD,
          value: category.name,
        }),
      },
    ]);

    bot.sendMessage(chatId, "Yangilanayotgan kategoriyani tanlang:", {
      reply_markup: {
        remove_keyboard: true,
        inline_keyboard: inline_keyboardCategory,
      },
    });
  }
};

const updateField = async (chatId, value) => {
  const user = await User.findOne({ chatId });
  const [_, taskId, field] = user.action.split("-");

  if (field == "category") {
    const category = await Category.findOne({ name: value });
    await Task.findByIdAndUpdate(taskId, { category: category._id });
  } else {
    await Task.findByIdAndUpdate(taskId, { [field]: value });
  }

  user.action = "category";
  await user.save();
  bot.sendMessage(chatId, "Vazifa yangilandi.");
};

module.exports = {
  addTask,
  add_task_next,
  getTask,
  deleteTask,
  editTask,
  editTaskField,
  updateField,
};
