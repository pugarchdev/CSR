import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dgacmjfbp",
  api_key: process.env.CLOUDINARY_API_KEY || "589443559885547",
  api_secret: process.env.CLOUDINARY_API_SECRET || "-qXsqaWreXU5ITN7RzuJ5uNO2Ck",
});

export default cloudinary;
