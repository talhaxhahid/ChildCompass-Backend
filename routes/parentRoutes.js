const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Parent = require('../models/parent');
const Child = require('../models/child');
const nodemailer = require('nodemailer');
const router = express.Router();

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Extract token after 'Bearer'
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token
        req.user = decoded; // Attach decoded user info (e.g., id) to req object
        next(); // Move to the next middleware or route handler
    } catch (err) {
        res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
};

router.get('/parent-details', authenticate, async (req, res) => {
    try {
        const parent = await Parent.findById(req.user.id);
        if (!parent) return res.status(404).json({ message: 'Parent not found' });
        
        if(!parent.verifiedEmail){
        // Generate a 5-digit verification code and set expiration time
        const verificationCode = generateVerificationCode();
        const codeExpiration = new Date();
        codeExpiration.setMinutes(codeExpiration.getMinutes() + 10); // Code expires in 10 minutes

        parent.verificationCode = verificationCode;
        parent.verificationCodeExpiration = codeExpiration;
        await parent.save();

        // Send verification email with the 5-digit code
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: parent.email,
            subject: 'Verify Your Email',
            text: `Your 4-digit verification code is: ${verificationCode}. It will expire in 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);
             return res.status(405).json({ message: 'Email Not Verified', parent });
            }
        if(parent.childConnectionStrings.length==0) return res.status(406).json({ message: 'No Child Connected', parent });
        res.status(200).json({ message: 'Access granted', parent });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// Utility function to generate 5-digit random code for verification
const generateVerificationCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString(); // 5-digit number
};

// Utility function to generate JWT token
const generateToken = (parentId) => {
    return jwt.sign({ id: parentId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};


// Register Parent Route
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingParent = await Parent.findOne({ email });
        if (existingParent) return res.status(400).json({ message: 'Email already exists' });

        const newParent = new Parent({ name, email, password });

        // Generate a 5-digit verification code and set expiration time
        const verificationCode = generateVerificationCode();
        const codeExpiration = new Date();
        codeExpiration.setMinutes(codeExpiration.getMinutes() + 10); // Code expires in 10 minutes

        newParent.verificationCode = verificationCode;
        newParent.verificationCodeExpiration = codeExpiration;
        await newParent.save();

        // Send verification email with the 5-digit code
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Verify Your Email',
            text: `Your 4-digit verification code is: ${verificationCode}. It will expire in 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);
        const token = generateToken(newParent._id);
        res.status(201).json({ message: 'Registration successful! Please check your email for a 5-digit code.',token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Verify Parent Email with 5-Digit Code Route
router.post('/verify-email', async (req, res) => {
    const { email, verificationCode } = req.body;
    console.log("Received verification request for email:", email);
    try {
        console.log("Received verification request for email:", email);
        console.log("Provided verification code:", verificationCode);

        const parent = await Parent.findOne({ email: email });
        if (!parent) {
            console.log("Parent not found in database.");
            return res.status(404).json({ message: 'Parent not found' });
        }

        console.log("Parent found:", parent);
        console.log("Stored verification code:", parent.verificationCode);
        console.log("Verification code expiration:", parent.verificationCodeExpiration);
        console.log("Current time:", new Date());

        if (parent.verifiedEmail) {
            console.log("Email is already verified.");
            return res.status(400).json({ message: 'Email already verified' });
        }

        if (new Date() > parent.verificationCodeExpiration) {
            console.log("Verification code has expired.");
            return res.status(400).json({ message: 'Verification code has expired' });
        }

        if (String(parent.verificationCode) !== String(verificationCode)) {
            console.log("Invalid verification code provided.");
            return res.status(400).json({ message: 'Invalid verification code' });
        }
        

        // Mark parent as verified
        parent.verifiedEmail = true;
        parent.verificationCode = null; // Clear the verification code
        parent.verificationCodeExpiration = null; // Clear the expiration time
        await parent.save();

        console.log("Email verification successful for:", email);
        return res.status(200).json({ message: 'Email verified successfully!' });
    } catch (err) {
        console.error("Error during email verification:", err);
        return res.status(500).json({ message: err.message });
    }
});

// Parent Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const parent = await Parent.findOne({ email });
        if (!parent) return res.status(404).json({ message: 'Parent not found' });

        const isMatch = await bcrypt.compare(password, parent.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        if (!parent.verifiedEmail){
            // Generate a 5-digit verification code and set expiration time
        const verificationCode = generateVerificationCode();
        const codeExpiration = new Date();
        codeExpiration.setMinutes(codeExpiration.getMinutes() + 10); // Code expires in 10 minutes

        parent.verificationCode = verificationCode;
        parent.verificationCodeExpiration = codeExpiration;
        await parent.save();

        // Send verification email with the 5-digit code
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Verify Your Email',
            text: `Your 4-digit verification code is: ${verificationCode}. It will expire in 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);
        const token = generateToken(parent._id);
        return res.status(200).json({ message: 'verifyEmail' ,token,parent});}
        else{

        const token = generateToken(parent._id); // Generate JWT Token
        res.status(200).json({ message: 'Login successful', token,parent });
    }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// Add Child Connection String to Parent Route
router.post('/add-child', async (req, res) => {
    const { email, connectionString } = req.body;

    try {
        const parent = await Parent.findOne({ email });
        
        if (!parent) return res.status(404).json({ message: 'Parent not found' });

        // Check if the child exists in the database using connection string
        const child = await Child.findOne({ connectionString });
        if (!child) return res.status(404).json({ message: 'Child not found with this connection string' });

        // Check if parent has verified email
        if (!parent.verifiedEmail) return res.status(400).json({ message: 'Please verify your email first' });

        // Check if the child is already linked to this parent
        if (parent.childConnectionStrings.includes(connectionString)) {
            return res.status(400).json({ message: 'This child connection is already added to your account' });
        }

        // Add the child connection string to the parent's record
        parent.childConnectionStrings.push(connectionString);
        await parent.save();
        console.log('Updated Parent:', parent); 

        res.status(200).json({ message: 'Child connection string added successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
