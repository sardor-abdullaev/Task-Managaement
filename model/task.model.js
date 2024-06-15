const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    // required: true,
  },
  category: {
    type: mongoose.Types.ObjectId,
    ref: "Category",
    // required: true,
  },
  description: {
    type: String,
  },
  priority: {
    type: String,
    // required: true,
    enum: ["critical", "high", "medium", "low"],
    // default: "low",
  },
  status: {
    type: String,
    // required: true,
    enum: ["completed", "pending", "ongoing", "0", "expired"],
    default: "0",
  },
  deadline: {
    type: Date,
    // validate: {
    //   message:
    //     "Kiritilgan vaqt ({VALUE})ni qabul qila olmaymiz./nIltimos kamida yarim soat oldingi vaqtni kiriting.",
    //   validator: function (val) {
    //     return Date.parse(val) - Date.now() >= 1000 * 60 * 30;
    //   },
    // },
  },
  user: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: [true, "Task must belong to a user"],
  },
  msgSent: {
    oneDay: {
      type: Boolean,
      default: false,
    },
    halfHour: {
      type: Boolean,
      default: false,
    },
  },
  createdAt: { type: Date, default: Date.now(), select: false },
});

module.exports = mongoose.model("Task", taskSchema);
