const { bot } = require("./bot");
const User = require("./model/user.model");
const { saveUser } = require("./controller/user.controller");
const {
  addCategory,
  saveCategory,
  getAllCategories,
  updateCategory,
} = require("./controller/category.controller");
const {
  addTask,
  add_task_next,
  updateField,
} = require("./controller/task.controller");

bot.on("message", async (msg) => {
  const { first_name, last_name, id: chatId } = msg.from;
  const user = await User.findOne({ chatId });

  switch (msg.text) {
    case "/start":
      bot.sendMessage(chatId, "Task Management botiga xush kelibsiz!");
      if (!user) {
        saveUser(first_name, last_name, chatId);
      }
      break;
    case "/addcategory":
      addCategory(chatId);
      break;
    case "/category":
      getAllCategories(chatId);
      break;
    case "/addtask":
      addTask(chatId);
  }

  if (msg.text && !msg.text.startsWith("/")) {
    if (user.action == "add_category") {
      saveCategory(msg);
    }
    if (user.action.startsWith("edit_ct-")) {
      categoryId = user.action.split("-")[1];
      updateCategory(chatId, categoryId, msg.text);
    }
    if (user.action.includes("new_task-")) {
      add_task_next(chatId, msg.text, user.action.split("-")[1]);
    }
    if (user.action.startsWith("edit_task-")) {
      updateField(chatId, msg.text);
    }
  }

  user && (user.action = "category");
  await user.save();
});
