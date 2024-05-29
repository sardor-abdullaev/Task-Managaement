const { bot } = require("./bot");
const {
  addCategory,
  getCategory,
  deleteCategory,
  editCategory,
} = require("./controller/category.controller");
const { add_task_next, getTask } = require("./controller/task.controller");
const { ACTION_TYPE } = require("./helpers/action_type");

bot.on("callback_query", async (query) => {
  await bot.answerCallbackQuery(query.id);

  const chatId = query.from.id;
  const data = JSON.parse(query.data);
  console.log(data);

  const { type } = data;
  switch (type) {
    case ACTION_TYPE.ADD_CATEGORY:
      addCategory(chatId);
      break;
    case ACTION_TYPE.SHOW_CATEGORY:
      getCategory(chatId, data.ct_id);
      break;
    case ACTION_TYPE.DELETE_CATEGORY:
      deleteCategory(chatId, data.ct_id, query.message.message_id);
      break;
    case ACTION_TYPE.EDIT_CATEGORY:
      editCategory(chatId, data.ct_id, query.message.message_id);
      break;
    case ACTION_TYPE.ADD_TASK:
      add_task_next(chatId, null, null, data.ct_id);
      break;
    case ACTION_TYPE.CHOOSE_TASK_STATUS:
      add_task_next(chatId, data.status, "priority");
      break;
    case ACTION_TYPE.SHOW_TASK:
      getTask(chatId, data.task_id);
      break;
  }
});
