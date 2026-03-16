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

// regex for email &password 
let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

server.use(express.json())
server.use(cors())

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
    let isUsernameExist = await User.exists({ "personal_info.username": username }).then((result) => result)

    isUsernameExist ? username += nanoid().substring(0, 5) : ""
    return username

}



// signup post request -->
server.post("/signup", (req, res) => {

    // Destructuring data for particular route / INSTEAD OF 'req.body.fullname'
    let { fullname, email, password } = req.body

    // validating the data from frontend
    if (!fullname || fullname.length < 3) {
        return res.status(403).json({ "error": "Full Name must be 3 letters long" })
    }
    if (!email) {
        return res.status(403).json({ "error": "Enter email" })
    }
    if (!emailRegex.test(email)) {
        return res.status(403).json({ "error": "Email is invalid" })
    }
    if (!passwordRegex.test(password)) {
        return res.status(403).json({ "error": "Password should be 6 to 20 charcters long with a numeric, 1 lowercase and 1 uppercase" })
    }


    // hashing of password using bcryptjs
    bcrypt.hash(password, 10, async (err, hashed_password) => {

        let username = await generateUsername(email)

        let user = new User({
            personal_info: { fullname, email, password: hashed_password, username }
        })


        // since user.save() is a promise
        user.save().then((savedUser) => {
            return res.status(200).json(formatDatatoSend(savedUser))

        }).catch(err => {

            if (err.code == 11000) {
                return res.status(500).json({ "error": "Email already exists!" })
            }

            return res.status(500).json({ "error": err.message })
        })

        // console.log(hashed_password);
    })


    // return res.status(200).json({ "status": "Okay" })

})

server.post("/signin", (req, res) => {
    // destructuring data from the frontend
    let {email, password} = req.body

    User.findOne({"personal_info.email": email})
    .then((user) => {

        // if there is no user
        if(!user){
            return res.status(403).json({"error": "Email not found!"})
        }

        bcrypt.compare(password, user.personal_info.password, (err, result) => {

            if(err){
                return res.status(403).json({"error": "Error occured while login please try again"})
            }
            if(!result){
                return res.status(403).json({"error": "Incorrect password!"})
            } else{
                return res.status(200).json(formatDatatoSend(user))
            }

        })

        // console.log(user);
        // return res.json({"status": "user document fetched"})
        
    }).catch(err => {
        console.log(err.message);
        return res.status(500).json({"error": err.message})
        
        
    })


})

server.listen(PORT, () => {
    console.log('listening on port ->' + PORT);
})