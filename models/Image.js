const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
    cloudinaryId: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    metadata: {
        format: String,
        width: Number,
        height: Number,
        size: Number,
        created_at: Date,
        tags: [String],
        exif: mongoose.Schema.Types.Mixed,
        location: {
            latitude: Number,
            longitude: Number
        },
        originalName: String,
        mimeType: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Image', ImageSchema);
