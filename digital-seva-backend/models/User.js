// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // Required fields for registration
    name: {
        type: String,
        required: true,
        immutable: true // Cannot be changed once set
    },
    email: {
        type: String,
        required: true,
        unique: true,
        immutable: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true,
        immutable: true
    },
    sex: {
        type: String,
        required: true,
        enum: ['Male', 'Female', 'Other']
    },
    
    // Optional fields that can be updated later
    maritalStatus: {
        type: String,
        enum: ['Single', 'Married', 'Divorced', 'Widowed']
    },
    address: String,
    fatherName: String,
    motherName: String,
    annualIncome: Number,
    location: String,
    familySize: Number,

    residenceType: {
        type: String,
        enum: ['Urban', 'Rural']
    },
    category: {
        type: String,
        enum: ['General', 'OBC', 'PVTG', 'SC', 'ST']
    },
    isDifferentlyAbled: {
        type: Boolean,
        default: false
    },
    disabilityPercentage: {
        type: Number,
        min: 0,
        max: 100,
        required: function() { return this.isDifferentlyAbled; }
    },
    isMinority: {
        type: Boolean,
        default: false
    },
    isStudent: {
        type: Boolean,
        default: false
    },
    employmentStatus: {
        type: String,
        enum: ['Employed', 'Unemployed', 'Self-Employed/ Entrepreneur']
    },
    isGovernmentEmployee: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('User', UserSchema);