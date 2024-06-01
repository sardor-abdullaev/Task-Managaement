const { connectDB } = require("./helpers/db");
const { checkTasks } = require("./controller/task.controller");

try {
  connectDB();

  require("./message");
  require("./query");

  setInterval(checkTasks, 1000 * 60 * 30);
} catch (error) {
  console.log(error);
}
