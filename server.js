import express from 'express'
import mongoose from 'mongoose'
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import jwt from 'jsonwebtoken'
import cors from 'cors'
import admin from 'firebase-admin'
import fs from 'fs';
import { getAuth } from 'firebase-admin/auth'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Schemas
import User from './Schema/User.js'
import Blog from './Schema/Blog.js'

// loading data/JSON manually 
const serviceAccountKey = JSON.parse(
  fs.readFileSync(
    new URL('./react-js-blog-website-11a40-firebase-adminsdk-fbsvc-e21a3247b5.json', import.meta.url)
  )
);

const server = express()
let PORT =  3000

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

// Validation Utility regex for email &password
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,20}$/;

server.use(cors())
server.use(express.json());

// connection with the database
mongoose.connect(process.env.DB_LOCATION, {
    autoIndex: true
})
// s3 bucket integration
const s3 = new S3Client({
    region: "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
})


//  s3 bucket url generation function
const generateUploadUrl = async () => {
    const date = new Date()
    const imageName = `${nanoid()}-${date.getTime()}.jpeg`

    // Create a put object command
    const command = new PutObjectCommand({
      Bucket: 'react-app-median',  
      Key: imageName,
      ContentType: "image/jpeg"
    })
    // 2. generate presigned url
    return await getSignedUrl(s3, command, {expiresIn: 1000})
}

// upload url route from AWS v3 sdk
server.get('/get-upload-url', async (req, res) => {
    try {
        const url = await generateUploadUrl()
        return res.status(200).json({uploadUrl: url})
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: err.message})
    }
})


// cross auth middleware JWT
// middleware for the '/create-blog' route
const verifyJWT = (req, res, next) => {

    const authHeader = req.headers['authorization']
    
    const token = authHeader && authHeader.split(" ")[1]

    // revert no access token
    if(token == null){
        return res.status(401).json({error : "No access token"})
    }
    
    // if invalid - revert invalid identity 
    jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
        if(err){
            return res.status(403).json({error : "Access token is invalid"})
        }
        req.user = user.id;
        next();
        
    })

}

// formatted data to send to user body ||| Includes JWT
const formatDatatoSend = (user) => {
    const accessToken = jwt.sign({ id: user._id }, process.env.SECRET_ACCESS_KEY)
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


// Signup post request -->
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
        console.error("Signup Error: ", err); 
        return res.status(500).json({ "error": "Internal server error" })
    }
});

// Signin post request -->
server.post("/signin", async (req, res) => {
  try{
    // destructuring the data recieved from frontend
    const {email, password} = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
  
    const user = await User.findOne({
      "personal_info.email": email
    })
    if(!user){
      return res.status(401).json({"error" : "Email not found!"})
    }
    
    if(user.google_auth){
      return res.status(403).json({"error" : "Account was created with Google. Please log in with Google."})
    }
    
    const isPasswordMatch = await bcrypt.compare(password, user.personal_info.password)

    if(!isPasswordMatch){
      return res.status(401).json({"error" : "Incorrect password"})
    }

    return res.status(200).json(formatDatatoSend(user))

  } catch(err) {
      console.log(err.message);
      return res.status(500).json({"error" : "An internal server error occured!"})
  }
})


// Google authentication post request -->
server.post("/google-auth", async(req, res) => {
    let {accessToken} = req.body

    try {
        // 1.verify google token
        const decodedUser = await getAuth().verifyIdToken(accessToken)
        let {email, name, picture} = decodedUser

        // 2. format image
        picture = picture.replace("s96-c", "s384-c")

        // 3. find user
        let user = await User.findOne({"personal_info.email": email}).select(
            "personal_info.fullname personal_info.username personal_info.profile_img google_auth"
        )
        if(user){
            // User exist, check if they originally signed up with googlw
            if(!user.google_auth){
                return res.status(403).json({
                    "error" : "This email signed up without Google. Please login with password."
                })
            }
        } else {
            // new user - create account
            const username = await generateUsername(email)
            user = new User({
                personal_info: {
                    fullname: name,
                    email,
                    // profile_img: picture,
                    username
                },
                google_auth: true
            })
            await user.save()
        }
        return res.status(200).json(formatDatatoSend(user))

    } catch (err) {
        // This catches ANY error: Token verification, Database or save() errors
        console.error("Auth Error", err);
        return res.status(500).json({
            error: "failed to authenticate with Google. Try another account"
        })
    }
})


// latest blog  
server.get('/latest-blogs', (req, res) => {

    let maxLimit = 5

    Blog.find({ draft: false })
    .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({ "publishedAt": -1 })
    .select("blog_id title des banner activity tags publishedAt -_id")
    .limit(maxLimit)
    .then(blogs => {
        return res.status(200).json({ blogs })
    })
    .catch(err => {
        return res.status(500).json({ error: err.message})
    })
})

// blog create route with  validation to save datat
server.post('/create-blog', verifyJWT, (req, res) => {

    // console.log(req.body);
    // return res.json(req.body)
    

    let authorId = req.user

    let { title, des, banner, tags, content, draft } = req.body

    if(!title.length){
        return res.status(403).json({error : "Title is mandatory"})
    }

    if(!draft){
        if(!des.length || !des.length >200){
            return res.status(403).json({error : "Blog Description is mandatory"})
        }
        if(!banner.length){
            return res.status(403).json({error : "Blog Banner is mandatory"})
        }
        if(!content.blocks.length){
            return res.status(403).json({error : "There must be some blog content to publish"})
        }
        if(!tags.length || tags.length > 10){
            return res.status(403).json({error : "Add a few hashtags so others can find your post."})
        }

    }


    tags = tags.map(tag => tag.toLowerCase())

    let blog_id = title.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, '-').trim() + nanoid()
    // console.log(blogId);

    let blog = new Blog({
        title, des, banner, content, tags, author: authorId, blog_id, draft: Boolean(draft)

    })


    blog.save().then( blog => {
        let incrementVal = draft ? 0 : 1

        User.findOneAndUpdate({_id : authorId}, { $inc : {"account_info.total_posts" : incrementVal}, $push : {"blogs" : blog._id } } )
        .then(user => {
            return res.status(200).json({id: blog.blog_id })
        })
        .catch(err => {
            return res.status(500).json({ error: "Failed to upload total post number"})
        })
    })  
    .catch (err => {
        return res.status(500).json({ error: err.message})
    })
})

server.listen(PORT, () => {
    console.log('listening on port ->' + PORT);
})