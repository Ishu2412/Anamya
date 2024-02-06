import mongoose from "mongoose";
import { CodeAuthData, CodeUserData } from "./mongoDB.js";

const uri =
  "mongodb+srv://ishu:lNwKH7FlCS8wwZBx@cluster0.bbugwp2.mongodb.net/?retryWrites=true&w=majority";

async function connect() {
  try {
    mongoose.connect(uri);
    console.log("Connected to Database");
  } catch (err) {
    console.error(`Error in connecting to Database${err}`);
  }
}

async function closeConnection() {
  try {
    mongoose.connection.close();
    console.log("Disconnected");
  } catch (err) {
    console.error(`Error while disconnecting ${err}`);
  }
}

async function addUser(data) {
  try {
    const user = new CodeAuthData(data);
    await user.save();
    console.log(data);
  } catch (err) {
    console.error(`Error while adding new user ${err}`);
  }
}

async function findUser(data) {
  try {
    const user = await CodeAuthData.findOne({ email: data.email });
    if (user) return user;
    return null;
  } catch (err) {
    console.error(`Error while finding user ${err}`);
  }
}

async function addUserData(email, data, url) {
  try {
    const userData = new CodeUserData({
      email,
      data,
      url,
    });
    await userData.save();
    console.log(data);
  } catch (err) {
    console.error(`Error while adding the user's data`);
  }
}

async function findUrl(email) {
  try {
    const user = await CodeUserData.findOne({ email: email });
    if (user) return user.url;
    return null;
  } catch (err) {
    console.log(`Error while finding error ${err}`);
  }
}

async function getUserData(email) {
  try {
    const user = await CodeAuthData.findOne({ email: email });
    if (user) return user.data;
    return null;
  } catch (err) {
    console.log(`Error while finding user data`);
  }
}

export {
  connect,
  closeConnection,
  addUser,
  findUser,
  addUserData,
  findUrl,
  getUserData,
};
