const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;

// Check if Cloudinary is configured
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Local uploads directory fallback
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Use memory storage so we can process and compress the image with Sharp before saving
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB input limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

/**
 * Middleware to resize and compress uploaded images via Sharp.
 * Uploads to Cloudinary if configured; otherwise saves optimized WebP to local disk.
 */
const optimizeAndStore = async (req, res, next) => {
  if (!req.file) return next();

  try {
    // 1. Optimize image via Sharp (max 1200px width/height, 80% WebP compression)
    const optimizedBuffer = await sharp(req.file.buffer)
      .rotate() // auto-orient based on EXIF
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // 2. If Cloudinary is configured, stream optimized buffer to Cloudinary
    if (hasCloudinary) {
      const uploadStream = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'flavoriz',
              format: 'webp',
              resource_type: 'image',
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          stream.end(optimizedBuffer);
        });

      const result = await uploadStream();
      req.file.filename = result.public_id;
      req.file.path = result.secure_url;
      req.file.location = result.secure_url; // standardized url
    } else {
      // 3. Fallback: Save optimized file to local uploads directory
      const fileName = `${req.userId || 'guest'}-${Date.now()}.webp`;
      const filePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(filePath, optimizedBuffer);

      req.file.filename = fileName;
      req.file.path = `/uploads/${fileName}`;
      req.file.location = `/uploads/${fileName}`;
    }

    next();
  } catch (err) {
    console.error('Image optimization/upload error:', err);
    return res.status(500).json({ error: 'Failed to process and store image.' });
  }
};

module.exports = {
  upload,
  optimizeAndStore,
};
