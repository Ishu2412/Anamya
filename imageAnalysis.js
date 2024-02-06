import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import env from "dotenv";
import fetch from "node-fetch";

env.config();
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

async function downloadImage(url, localPath) {
  const response = await fetch(url);
  const imageBuffer = await response.buffer();
  fs.writeFileSync(localPath, imageBuffer);
}

function fileToGenerativePart(localPath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(localPath)).toString("base64"),
      mimeType,
    },
  };
}

async function run(path, type, data) {
  await downloadImage(path, `public/images/image.${type}`);
  // For text-and-image input (multimodal), use the gemini-pro-vision model
  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

  const prompt = `Emergency: Detect the severity of the person's injury from the accident image and predict the immediate medical assistance required. The individual's medical records are as follows: ${JSON.stringify(
    data
  )}. Please ensure that the ambulance brings the necessary supplies based on the severity of the condition. Urgent medical attention is needed. Also include the json data in points.`;

  //   const imageParts = [fileToGenerativePart(path, `image/${type}`)];
  // const path =
  const imageParts = [
    fileToGenerativePart(`public/images/image.${type}`, `image/${type}`),
  ];
  //("image.jpeg", "image/jpeg") and png

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = result.response;
  const text = response.text();
  console.log(text);
  return text;
}
// run(
//   "https://res.cloudinary.com/dvmk4d0kb/image/upload/v1707166641/uploads/unique_filename.jpg",
//   "jpg",
//   {
//     "blood-group": "O+",
//     alergic: "polluted air",
//   }
// );
export { run };
