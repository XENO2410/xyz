// routes/documents.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Document = require('../models/Document');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Set up multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Upload document
router.post('/upload', auth, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        const { documentType, verificationResult } = req.body;
        if (!documentType) {
            return res.status(400).json({ msg: 'Document type is required' });
        }

        const parsedVerificationResult = JSON.parse(verificationResult);

        // Create new document record
        const document = new Document({
            userId: req.user.id,
            documentType,
            filePath: req.file.path,
            isVerified: parsedVerificationResult.isValid,
            verificationDetails: {
                confidenceScore: parsedVerificationResult.confidenceScore,
                errors: parsedVerificationResult.errors
            }
        });

        await document.save();

        res.json({
            msg: 'Document uploaded successfully',
            document
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get all documents for a user
router.get('/my-documents', auth, async (req, res) => {
    try {
        const documents = await Document.find({ userId: req.user.id });
        res.json(documents);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get specific document
router.get('/:id', auth, async (req, res) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!document) {
            return res.status(404).json({ msg: 'Document not found' });
        }

        res.json(document);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Delete document
router.delete('/:id', auth, async (req, res) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!document) {
            return res.status(404).json({ msg: 'Document not found' });
        }

        // Delete file from storage
        if (fs.existsSync(document.filePath)) {
            fs.unlinkSync(document.filePath);
        }

        await document.remove();

        res.json({ msg: 'Document deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;