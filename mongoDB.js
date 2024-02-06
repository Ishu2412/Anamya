import mongoose from "mongoose";
import { object } from "webidl-conversions";

const codeAuthSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const dataSchema = new mongoose.Schema({
  email: String,
  data: Object,
  url: String,
});

const CodeAuthData = mongoose.model("CodeAuthData", codeAuthSchema);
const CodeUserData = mongoose.model("CodeUserData", dataSchema);

export { CodeAuthData, CodeUserData };
