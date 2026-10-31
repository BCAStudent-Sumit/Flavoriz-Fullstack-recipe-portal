const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Absolute path to backend/uploads, regardless of where `node` was launched from
const uploadDir = path.join(__dirname, '..', 'uploads');

// Create the folder on startup if it doesn't already exist —
// multer's diskStorage will NOT create it for you.
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created missing uploads directory at', uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // unique filename: userId-timestamp.extension
    const ext = path.extname(file.originalname);
    cb(null, `${req.userId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

module.exports = upload;