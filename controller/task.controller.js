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
  if (!categories.length) {
    bot.sendMessage(
      chatId,
      "Vazifa qo'shish uchun kamida bitta kategoriya mavjud bo'lishi kerak. Kategoriyalar ro'yxati hozircha bo'sh.\n/addcategory - Kategoriya qo'shish"
    );
    return;
  }

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
    text: "Vazifa deadline kamida 1 soat keyingi vaqtini YYYY-MM-DDTHH:mm:ss formatda kiriting:\nNamuna: 2024-05-29T13:51:50",
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
  if (task) {
    bot.sendMessage(
      chatId,
      `Title: <b>${task.title ?? undefined}</b>\nCategory: <b>${
        task.category.name ?? undefined
      }</b>\nDescription: <b>${
        task.description ?? undefined
      }</b>\nPriority: <b>${task.priority ?? undefined}</b>\nStatus: <b>${
        task.status ?? undefined
      }\nDeadline: <b>${task.deadline ?? undefined}</b></b>`,
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
  } else {
    bot.sendMessage(chatId, "Vazifa topilmadi yoki o'chirilgan!");
  }
};

const getAllTasks = async (chatId) => {
  const user = await User.findOne({ chatId });
  const tasks = await Task.find({ user: user._id }).sort({ deadline: 1 });
  if (tasks.length) {
    tasks.forEach((task) => getTask(chatId, task._id));
  } else {
    bot.sendMessage(
      chatId,
      "Vazifalar ro'yxati hozircha bo'sh. Birinchi navbatda agar kategoriya yo'q bo'lsa yaratishingiz kerak. Keyin shu kategoriyaga vazifa qo'shiladi.\n/addcategory - Kategoriya qoshish\n/addtask - Vazifa qo'shish"
    );
  }
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

const inline_keyboardStatus = ["completed", "ongoing"].map((status) => [
  {
    text: status,
    callback_data: JSON.stringify({
      type: ACTION_TYPE.UPDATE_TASK_FIELD,
      value: status,
    }),
  },
]);

const editTaskField = async (chatId, field) => {
  const user = await User.findOne({ chatId });

  const taskId = user.action.split("-")[1];

  user.action = `edit_task-${taskId}-${field}`;
  await user.save();

  if (["title", "description", "deadline"].includes(field)) {
    bot.sendMessage(
      chatId,
      field == "deadline"
        ? "Yangilanayotgan 'deadline' maydonini \nYYYY-MM-DDTHH:mm:ss formatda kiriting:\nNamuna: 2024-05-29T13:51:50"
        : `Yangilanayotgan "${field}" maydonini kiriting`
    );
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

let halfHourMsgSent = false;
let oneDayMsgSent = false;

const checkTasks = async () => {
  await Task.findOneAndUpdate(
    { deadline: { $lte: Date.now() } },
    { status: "expired" }
  );

  const tasks = await Task.find({
    status: { $in: ["pending", "ongoing"] },
  });
  if (!tasks.length) return;

  tasks.forEach(async (task) => {
    const currentDate = new Date();
    const time = task.deadline.getTime() - currentDate.getTime();

    const user = await User.findById(task.user);

    if (!halfHourMsgSent && time < 1000 * 60 * 30) {
      bot.sendMessage(user.chatId, "Sizda yarim soatdan kamroq vaqt qoldi.");
      getTask(user.chatId, task._id);
      halfHourMsgSent = true;
      return;
    } else if (
      !oneDayMsgSent &&
      time > 1000 * 60 * 30 &&
      time < 1000 * 60 * 60 * 24
    ) {
      bot.sendMessage(user.chatId, "Sizda bir kundan kamroq vaqt qoldi.");
      getTask(user.chatId, task._id);
      oneDayMsgSent = true;
      return;
    }
  });
};

const deleteDraftTasks = async (chatId) => {
  const user = await User.findOne({ chatId });
  const tasks = await Task.find({ user: user._id, status: "0" }).select(["id"]);

  await Promise.all(
    tasks.map(async (task) => {
      await Task.findOneAndDelete(task);
    })
  );

  bot.sendMessage(chatId, "Chala vazifalar o'chirildi.");
};

module.exports = {
  addTask,
  add_task_next,
  getTask,
  deleteTask,
  editTask,
  editTaskField,
  updateField,
  getAllTasks,
  checkTasks,
  deleteDraftTasks,
};
