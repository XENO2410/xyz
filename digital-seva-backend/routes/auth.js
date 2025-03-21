// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Register User
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phoneNumber, age, sex } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Create new user
        user = new User({
            name,
            email,
            password,
            phoneNumber,
            age,
            sex
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Create JWT token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Login User
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Create JWT token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get User Profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update User Profile
router.put('/profile', auth, async (req, res) => {
    try {
        const {
            // Existing fields
            maritalStatus,
            address,
            fatherName,
            motherName,
            annualIncome,
            location,
            familySize,
            
            // New fields
            residenceType,
            category,
            isDifferentlyAbled,
            disabilityPercentage,
            isMinority,
            isStudent,
            employmentStatus,
            isGovernmentEmployee
        } = req.body;

        const updateFields = {};
        
        // Existing fields
        if (maritalStatus) updateFields.maritalStatus = maritalStatus;
        if (address) updateFields.address = address;
        if (fatherName) updateFields.fatherName = fatherName;
        if (motherName) updateFields.motherName = motherName;
        if (annualIncome) updateFields.annualIncome = annualIncome;
        if (location) updateFields.location = location;
        if (familySize) updateFields.familySize = familySize;

        // New fields
        if (residenceType) updateFields.residenceType = residenceType;
        if (category) updateFields.category = category;
        if (isDifferentlyAbled !== undefined) {
            updateFields.isDifferentlyAbled = isDifferentlyAbled;
            if (isDifferentlyAbled && disabilityPercentage) {
                updateFields.disabilityPercentage = disabilityPercentage;
            }
        }
        if (isMinority !== undefined) updateFields.isMinority = isMinority;
        if (isStudent !== undefined) updateFields.isStudent = isStudent;
        if (employmentStatus) updateFields.employmentStatus = employmentStatus;
        if (isGovernmentEmployee !== undefined) updateFields.isGovernmentEmployee = isGovernmentEmployee;

        // Add some basic validation
        if (updateFields.disabilityPercentage && (updateFields.disabilityPercentage < 0 || updateFields.disabilityPercentage > 100)) {
            return res.status(400).json({ msg: 'Disability percentage must be between 0 and 100' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateFields },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;