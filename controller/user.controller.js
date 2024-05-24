const User = require("../model/user.model");

const saveUser = async (first_name, last_name, chatId) => {
  const newUser = new User({ first_name, last_name, chatId });
  await newUser.save();
};

module.exports = { saveUser };
