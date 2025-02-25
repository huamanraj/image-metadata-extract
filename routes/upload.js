const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Image = require('../models/Image');
const ExifParser = require('exif-parser'); // You'll need to install this: npm install exif-parser
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Extract EXIF data from image buffer
function extractExifData(buffer) {
    try {
        const parser = ExifParser.create(buffer);
        const result = parser.parse();
        return result.tags;
    } catch (err) {
        console.error('Error extracting EXIF data:', err);
        return null;
    }
}

// Extract GPS data from EXIF
function extractGpsData(exifData) {
    if (!exifData || !exifData.GPSLatitude || !exifData.GPSLongitude) {
        return null;
    }

    return {
        latitude: exifData.GPSLatitude,
        longitude: exifData.GPSLongitude
    };
}

// Upload route
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        // Extract EXIF data from image
        const exifData = extractExifData(req.file.buffer);
        const gpsData = extractGpsData(exifData);

        // Convert buffer to base64 for Cloudinary
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            resource_type: 'image',
            folder: 'image-uploads'
        });

        // Create new image document in MongoDB
        const newImage = new Image({
            cloudinaryId: result.public_id,
            imageUrl: result.secure_url,
            metadata: {
                format: result.format,
                width: result.width,
                height: result.height,
                size: result.bytes,
                created_at: result.created_at,
                tags: result.tags || [],
                exif: exifData,
                location: gpsData,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype
            }
        });

        await newImage.save();

        res.status(201).json({
            success: true,
            image: {
                id: newImage._id,
                url: newImage.imageUrl,
                metadata: newImage.metadata
            }
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ message: 'Server error during upload' });
    }
});

module.exports = router;
