// models/Document.js
const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    documentType: {
        type: String,
        required: true,
        enum: [
            'Aadhar Card',
            'PAN Card',
            'Caste Certificate',
            'Ration Card',
            'Voter ID',
            'Driving License',
            'Income Certificate',
            'Disability Certificate',
            'BPL Certificate',
            'Domicile Certificate',
            'Birth Certificate',
            'Marriage Certificate',
            'Bank Passbook',
            'Employment Certificate',
            'Educational Certificates',
            'Property Documents'
        ]
    },
    filePath: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationDetails: {
        confidenceScore: {
            type: Number,
            default: 0
        },
        errors: {
            type: [String],
            default: []
        }
    }
});

module.exports = mongoose.model('Document', DocumentSchema);