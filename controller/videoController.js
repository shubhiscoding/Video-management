const multer = require('multer');
const path = require('path');
const { saveVideo } = require("../models/video");

// Define storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'videos');
  },
  filename: function (req, file, cb) {
    const name = Date.now() + '_' + file.originalname;
    cb(null, name);
  }
});

// Define file filter to allow specific file formats
const fileFilter = function (req, file, cb) {
  // Allowed extensions
  const allowedFileTypes = ['mkv', 'webm', 'mp4', 'avi']; // Add more if needed

  // Check file extension
  const fileExt = path.extname(file.originalname).toLowerCase().substring(1);
  if (allowedFileTypes.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Only .mkv, .webm, .mp4, .avi files are allowed'));
  }
};

// Multer upload configuration with file size limit and file filter
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max file size
  },
  fileFilter: fileFilter
}).single('video');
const fs = require('fs');

// Ensure the 'videos' directory exists
const uploadDirectory = path.join(__dirname, '..', 'videos');
if (!fs.existsSync(uploadDirectory)){
    fs.mkdirSync(uploadDirectory);
}


// Upload video controller

exports.uploadVideo = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(400).send({
        error: err.message,
      });
    }

    try {
      // Save the video to the database
      await saveVideo(req);
      res.send({
        result: "File uploaded successfully",
      });
    } catch (error) {
      res.status(400).send({
        error: error.message,
      });
    }
  });
};
