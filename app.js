const title = "The Quick Brown Fox Jumps Over The Lazy Dog while quirky wizards mix MAGIC & logic—testing symbols like !@#$%^&*();<>?,./~ alongside 1234567890 to ensure EVERYTHING works fine; meanwhile, developers say “Check THIS out! as code_snippets-run smoothly, combining CamelCase, snake_case, and kebab-case in one place—because why not make things a little more fun & chaotic?"
const blogId = title.replace(/[^a-zA-Z0-9]/g, ' ').
replace(/\s+/g, "-").toLowerCase()


console.log(blogId)





















// import express from "express";
// import mongoose from "mongoose";
// import "dotenv/config";
// import bcrypt from "bcryptjs";
// import { nanoid } from "nanoid";
// import jwt from "jsonwebtoken";
// import cors from "cors";

// // Schemas
// import User from "./Schema/User.js";

// const app = express();
// let PORT = 3000;

// // Validation Utility regex for email &password
// const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// const passwordRegex =
//   /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,20}$/;

// app.use(cors());
// app.use(express.json());

// // connection with database
// mongoose.connect(process.env.DB_LOCATION, {
//   autoIndex: true,
// });

// const formatDatatoSend = (user) => {
//   const accessToken = jwt.sign({ id: user._id }, process.env.SECRET_ACCESS_KEY);
//   return {
//     accessToken,
//     profile_img: user.personal_info.profile_img,
//     username: user.personal_info.username,
//     fullname: user.personal_info.fullname,
//   };
// };

// const generateUsername = async (email) => {
//   let username = email.split("@")[0];

//   // if username is not unique
//   const isUsernameExist = await User.exists({
//     "personal_info.username": username,
//   }).then((result) => result);

//   isUsernameExist ? (username += nanoid().substring(0, 5)) : "";
//   return username;
// };

// // signup route , post request
// app.post("/signup", async (req, res) => {
//   try {

//     const { fullname, email, password } = req.body;

//     // handelling error with fat arrow function
//     const sendError = (msg) => {
//       return res.status(422).json({
//         status: "Validation unsuccessful",
//         error: msg,
//       });
//     };

//     // validating data from frontend
//     if (fullname.trim().length < 3) {
//       return sendError("Fullname must be 3 letters long!");
//     }

//     if (!email) {
//       return sendError("Email is required!");
//     } else if (!emailRegex.test(email)) {
//       return sendError(
//         "Please enter a valid email address (e.g., name@example.com).",
//       );
//     }

//     if (!password) {
//       return sendError("Password is required!");
//     } else if (!passwordRegex.test(password)) {
//       return sendError(
//         "Password must be 8 to 20 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (like !@#$%^&*).",
//       );
//     }

//     // HASHING OF PASSWORD
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const username = await generateUsername(email);

//     const user = new User({
//       personal_info: { fullname, email, password: hashedPassword, username },
//     });
//     const savedUser = await user.save();
//     return res.status(200).json(formatDatatoSend(savedUser));

//   } catch (err) {
//       if (err.code === 11000) {
//         // duplicacy error
//         if (err.keyPattern && err.keyPattern["personal_info.email"]) {
//           return res.status(409).json({ error: "Email already exist!" });
//         }
//         if (err.keyPattern && err.keyPattern["personal_info.username"]) {
//           return res.status(409).json({ error: "Username already exists!" });
//         }
//       }
//       // console.log(err); //instead of throwing internal error to frontend / log them 
//       return res.status(500).json({ "error": "Internal server error" })
//     }
// });

// // signin route, post request
// app.post("/signin", async (req, res) => {
//   try{
//     // destructuring the data recieved from frontend
//     const {email, password} = req.body

//     if (!email || !password) {
//       return res.status(400).json({ error: "Email and password are required" });
//     }
  
//     const user = await User.findOne({
//       "personal_info.email": email
//     })
//     if(!user){
//       return res.status(401).json({"error" : "Email not found!"})
//     }
    
//     const isPasswordMatch = await bcrypt.compare(password, user.personal_info.password)

//     if(!isPasswordMatch){
//       return res.status(401).json({"error" : "Incorrect password"})
//     }

//     return res.status(200).json(formatDatatoSend(user))

//   } catch(err) {
//       console.log(err.message);
//       return res.status(500).json({"error" : "An internal server error occured!"})
//   }
// })

// app.listen(PORT, () => {
//   console.log(`listening on PORT: ${PORT}`);
// });
