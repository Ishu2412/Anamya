import express from "express";
import bodyParser from "body-parser";
import env from "dotenv";
import cors from "cors";
import {
  connect,
  closeConnection,
  addUser,
  findUser,
  addUserData,
  findUrl,
  getUserData,
} from "./mongoDBMethods.js";
import { run } from "./imageAnalysis.js";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import qrcode from "qrcode";
import Twilio from "twilio";
import bcrypt from "bcrypt";

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;
let currentUser = "";
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.set("view engine", "ejs");
env.config();
connect();

// twilio configuration
const accountSid = "AC57ec98f655967fed699f177f11ebbcb4";
const authToken = "651fcbda51d5198c97753c559439c20a";
const client = new Twilio(accountSid, authToken);

// Cloudinary Configuration
cloudinary.config({
  cloud_name: "dvmk4d0kb",
  api_key: "648484154789612",
  api_secret: "_2ckv9VmOAuevbAVkC3rJtH-7NM",
});

//multer and cloud configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "uploads",
    format: "png",
    public_id: (req, file) => "unique_filename", // use unique filenames
  },
});

const multerUpload = multer({ storage: storage });

async function generateQRCode(data) {
  // Convert the data to a string (QR code content)
  const qrCodeContent = JSON.stringify(data);

  // Generate QR code as a Buffer
  const qrCodeImage = await qrcode.toBuffer(qrCodeContent);

  return qrCodeImage;
}

async function uploadToCloudinary(imageBuffer) {
  return new Promise((resolve, reject) => {
    // Upload image buffer to Cloudinary
    cloudinary.uploader
      .upload_stream({ resource_type: "image" }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      })
      .end(imageBuffer);
  });
}

//register new user
app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const check = await findUser({
      email,
      password,
    });
    if (check) {
      res.render("error", { e: `User already exists.` });
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.log(`Error while hashing the password ${err}`);
        } else {
          const user = {
            email: email,
            password: hash,
          };
          await addUser(user);
          res.redirect("login");
        }
      });
    }
  } catch (err) {
    console.log(`Internal server error ${err}`);
    // res.render("error", { e: "Internal server error" });
  }
});

//login
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  try {
    const data = {
      email: req.body.email,
      password: req.body.password,
    };
    const user = await findUser(data);
    if (user) {
      const storedHashedPassword = user.password;
      bcrypt.compare(data.password, storedHashedPassword, (err, result) => {
        if (err) {
          res.render("error", { e: "Error in hashing password" });
        } else {
          if (result) {
            currentUser = data.email;
            res.redirect("store");
          } else {
            alert("Wrong Password");
            res.redirect("/login");
          }
        }
      });
    } else {
      res.render("error", { e: "User not found" });
    }
  } catch (err) {
    console.log(`Internal server error`);
    // res.render("error", { e: "Internal server error" });
  }
});

//home page
app.get("/", (req, res) => {
  currentUser = req.query.email;
  res.render("home");
});

//uploading image
app.post("/upload", multerUpload.single("image"), async (req, res) => {
  // getting medical data
  let data = await getUserData(currentUser);
  //   console.log(data);

  // Check if 'image' field is present in the form data
  if (req.file) {
    // Image uploaded and processed by Cloudinary
    const imageUrl = req.file.path;
    const regex = /[^.]+$/;

    // Match the regular expression against the imageUrl
    const type = imageUrl.match(regex)[0];
    console.log(type);
    console.log(imageUrl);
    const text = await run(imageUrl, type, data);
    client.messages
      .create({
        body: text,
        from: "+13344544133",
        to: "+917985890185",
      })
      .then((message) => console.log(message.sid))
      .catch((error) => console.error(error));
    client.messages
      .create({
        body: text,
        from: "+13344544133",
        to: "+917078121987",
      })
      .then((message) => console.log(message.sid))
      .catch((error) => console.error(error));
    // console.log(text);
  } else {
    // No image uploaded
    console.log(`No image uploaded`);
    // res.render("error", { e: "Error while uploading the image" });
  }
});

// storing data through form
app.get("/store", async (req, res) => {
  //   if (currentUser) {
  const url = await findUrl(currentUser);
  if (url) {
    res.render(`store`, { url: url });
  }
  res.render("store", { url: null });
  //   }
});

app.post("/store", async (req, res) => {
  const data = {
    name: req.body.fullName,
    dob: req.body.dob,
    gender: req.body.gender,
    number: req.body.contactNumber,
    address: req.body.address,
    medicalConditions: req.body.medicalConditions,
    medications: req.body.medications,
    previousSurgeries: req.body.previousSurgeries,
    alergies: req.body.knownAllergies,
    bloodGroup: req.body.bloodType,
  };
  const qrCodeImage = await generateQRCode(
    `http://localhost:3000?email=${currentUser}`
  );
  // Upload QR code to Cloudinary
  const cloudinaryResponse = await uploadToCloudinary(qrCodeImage);

  // Get the URL of the uploaded QR code
  const qrCodeUrl = await cloudinaryResponse.url;
  console.log(qrCodeUrl);
  await addUserData(currentUser, data, qrCodeUrl);
  res.render(`store`, { url: `${qrCodeUrl}` });
});

app.listen(port, (req, res) => {
  console.log(`Server is running at port ${port}`);
});

process.on("SIGINT", () => {
  closeConnection();
  process.exit();
});
