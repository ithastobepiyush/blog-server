import express from 'express'
import mongoose from 'mongoose'
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import jwt from 'jsonwebtoken'
import cors from 'cors'

// Schemas
import User from './Schema/User.js'

const app = express()
let PORT = 3000

// Validation Utility regex for email &password 
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,20}$/;

app.use(cors())
app.use(express.json())

// connection with database
mongoose.connect(process.env.DB_LOCATION, {
    autoIndex: true
})

// signup route , post request
app.post("/signup", (req, res) => {
        const {fullname, email, password} = req.body

        // validating data from frontend
        if(!fullname || fullname.trim().length <3) {
            return res.status(422).json({"error" : "Fullname must be 3 letters long!"})
        }
        // if (!email) {
        //     return res.status(422).json({"error" : "Enter email!"})
        // }
        if(!email || !emailRegex.test(email)) {
            return res.status(422).json({"error" : "Please enter a valid email address (e.g., name@example.com)."})
        }
        if(!passwordRegex.test(password)) {
            return res.status(422).json({"error" : "Password must be 8 to 20 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (like !@#$%^&*)."})
        }
        else {
            return res.status(200).json({
                message: "Validation successful",
                user: { fullname, email }
            });
        }
})

app.listen(PORT, () => {
    console.log(`listening on PORT: ${PORT}`);
})