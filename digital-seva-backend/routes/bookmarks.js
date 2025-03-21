const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Bookmark = require('../models/Bookmark');
const mongoose = require('mongoose'); // Make sure to import mongoose

// Add a bookmark
router.post('/', auth, async (req, res) => {
    const { schemeId } = req.body;

    // Validate incoming data
    if (!schemeId) {
        return res.status(400).json({ message: 'Scheme ID is required' });
    }

    try {
        const newBookmark = new Bookmark({
            userId: req.user.id,
            schemeId
        });

        await newBookmark.save();
        res.status(201).json(newBookmark); // Return the created bookmark
    } catch (err) {
        console.error("Error adding bookmark:", err);
        res.status(500).json({ message: 'Server error', error: err.message }); // Include error message
    }
});

// Get all bookmarks for a user
router.get('/', auth, async (req, res) => {
    try {
        const bookmarks = await Bookmark.find({ userId: req.user.id }).populate('schemeId');
        res.json(bookmarks);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Remove a bookmark
// Remove a bookmark
router.delete('/:id', auth, async (req, res) => {
    const { id } = req.params;

    try {
        // Convert the id to ObjectId
        const objectId = mongoose.Types.ObjectId(id);
        
        const result = await Bookmark.findByIdAndDelete(objectId);
        
        if (!result) {
            return res.status(404).json({ message: 'Bookmark not found' });
        }

        res.status(200).json({ message: 'Bookmark deleted successfully' });
    } catch (error) {
        console.error("Error deleting bookmark:", error);
        res.status(500).json({ message: 'Server error', error: error.message }); // Include error message
    }
});

module.exports = router;