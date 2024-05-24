const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: true,
  },
  chatId: {
    type: Number,
    required: true,
    unique: true,
  },
  category: [{ type: mongoose.Types.ObjectId, ref: "Category", default: [] }],
  action: { type: String, default: "category" },
});

module.exports = mongoose.model("User", userSchema);
