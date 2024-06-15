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
  getAllTasks,
  deleteDraftTasks,
} = require("./controller/task.controller");

bot.on("message", async (msg) => {
  const { first_name, last_name, id: chatId } = msg.from;
  const user = await User.findOne({ chatId });
  if (!user) {
    saveUser(first_name, last_name, chatId);
  }

  switch (msg.text) {
    case "/start":
      bot.sendMessage(
        chatId,
        "Task Management botiga xush kelibsiz!\n/category - Get all categories\n/addcategory - Add new category\n/tasks - Get all tasks\n/addtask - Add new task\n/cancel - Delete draft tasks"
      );
      break;
    case "/addcategory":
      addCategory(chatId);
      break;
    case "/category":
      getAllCategories(chatId);
      break;
    case "/addtask":
      addTask(chatId);
      break;
    case "/tasks":
      getAllTasks(chatId);
      break;
    case "/cancel":
      deleteDraftTasks(chatId);
      break;
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
  user && (await user.save());
});
