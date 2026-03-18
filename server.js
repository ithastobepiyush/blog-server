import express from 'express'
import mongoose from 'mongoose'
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import jwt from 'jsonwebtoken'
import cors from 'cors'

// Schemas
import User from './Schema/User.js'

const server = express()
let PORT = 3000

// Validation Utility regex for email &password
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,20}$/;

server.use(cors())
server.use(express.json())

// connection with the database
mongoose.connect(process.env.DB_LOCATION, {
    autoIndex: true
})

const formatDatatoSend = (user) => {
    const accessToken = jwt.sign({id: user._id}, process.env.SECRET_ACCESS_KEY)
    return {
        accessToken,
        profile_img: user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname
    }
}

// dynamically generate username for the user if same email exist
const generateUsername = async (email) => {

    let username = email.split("@")[0]

    // if username not unique
    let isUsernameExist = await User.exists(
        {
            "personal_info.username": username
        }
    ).then((result) => result)

    isUsernameExist ? username += nanoid().substring(0, 5) : ""
    return username

}

// signup post request -->
server.post("/signup", async (req, res) => {
    try {

        const {fullname, email, password} = req.body
        // handelling error with fat arrow function
        const sendError = (msg) => {
            res.status(422).json({
            error: msg,
            });
        };
        // validating data from frontend
        if (!fullname || fullname.trim().length < 3) {
            return sendError("Fullname must be 3 letters long!");
        }
        
        if (!email) {
            return sendError(
                "Email is required!"
            )
        } else if (!emailRegex.test(email)) {
            return sendError(
                "Please enter a valid email address (e.g., name@example.com).",
            );
        }
        if(!password){
            return sendError(
                "Password is required!"
            )
        } else if (!passwordRegex.test(password)) {
            return sendError(
                "Password must be 8 to 20 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (like !@#$%^&*).",
            );
        }

        // Hashing of password using bcryptjs
        const hashed_password = await bcrypt.hash(password, 10);
        let username = await generateUsername(email);

        let user = new User({
            personal_info: { fullname, email, password: hashed_password, username }
        });

        const savedUser = await user.save();
        return res.status(200).json(formatDatatoSend(savedUser));

    } catch (err) {
        if (err.code === 11000) {
        // duplicacy error
        if (err.keyPattern && err.keyPattern["personal_info.email"]) {
            return res.status(409).json({ error: "Email already exist!" });
        }
        if (err.keyPattern && err.keyPattern["personal_info.username"]) {
            return res.status(409).json({ error: "Username already exists!" });
        }
        }
        // console.log(err); //instead of throwing internal error to frontend / log them 
        return res.status(500).json({ "error": "Internal server error" })
    }
    
    
    // catch (err) {
    //     if (err.code === 11000) {
    //         // Distinguish between duplicate email and duplicate username
    //         if (err.message && err.message.includes('email')) {
    //             return res.status(409).json({ "error": "Email already exists!" });
    //         }
    //         if (err.message && err.message.includes('username')) {
    //             return res.status(409).json({ "error": "Username already taken! Please try again." });
    //         }
    //         return res.status(409).json({ "error": "Duplicate entry exists!" });
    //     }
    //     return res.status(500).json({ "error": err.message });
    // }
});

server.post("/signin", async (req, res) => {
    try {
        let { email, password } = req.body;

        const user = await User.findOne({ "personal_info.email": email });
        
        if (!user) {
            return res.status(401).json({ "error": "Email not found!" });
        }

        const isMatch = await bcrypt.compare(password, user.personal_info.password);
        
        if (!isMatch) {
            return res.status(401).json({ "error": "Incorrect password!" });
        }

        return res.status(200).json(formatDatatoSend(user));
        
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ "error": "An internal server error occurred" });
    }
});

server.listen(PORT, () => {
    console.log('listening on port ->' + PORT);
})