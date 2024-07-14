const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { getVideoById, saveTrimmedVideo, getVideoPathFromDB, saveMergedVideo } = require('../models/video');
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

// Ensure the 'videos' directory exists
const uploadDirectory = path.join(__dirname, '..', 'videos');
if (!fs.existsSync(uploadDirectory)){
    fs.mkdirSync(uploadDirectory);
  }

exports.trimVideo = async (req, res) => {
  const { id } = req.params; // Assuming id is passed in the URL params
  const { start, end } = req.body; // Start and end times for trimming

  const videoPath = await getVideoPathFromDB(id); // Function to fetch video path from DB

  if (!videoPath) {
    return res.status(404).send({ error: 'Video not found' });
  }

  const trimmed_filename = `trimmed_${Date.now()}_${encodeURIComponent(path.basename(videoPath))}`;
  const trimmedFilePath = path.join(__dirname, '..', 'videos', `${trimmed_filename}`);

  ffmpeg(videoPath)
    .setStartTime(start)
    .setDuration(end - start)
    .output(trimmedFilePath)
    .on('end', async () => {
      // Optionally, save the trimmed video path or perform other actions
      console.log('Trimmed video saved at:', trimmedFilePath);
      const video = {
        filename: trimmed_filename,
        path: `videos/${trimmed_filename}`
      }
      const trimmedVideoDetails = await saveTrimmedVideo(video); // Function to save trimmed video to DB
      res.send({ message: 'Video trimmed successfully', path: trimmedFilePath, video_details: trimmedVideoDetails });
    })
    .on('error', (err) => {
      console.error('Error trimming video:', err.message);
      res.status(500).send({ error: 'Error trimming video', message: err.message });
    })
    .run();
};


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
      const videoDetails = await saveVideo(req);
      res.send({
        result: "File uploaded successfully",
        video: videoDetails
      });
    } catch (error) {
      res.status(400).send({
        error: error.message,
      });
    }
  });
};

exports.mergeVideos = async (req, res) => {
  try {
    const { videoIds } = req.body;

    if (!videoIds || videoIds.length < 2) {
      return res.status(400).send({ error: 'At least two video IDs are required to merge.' });
    }

    // Retrieve video paths from DB
    const videoPaths = [];
    for (const id of videoIds) {
      const videoPath = await getVideoPathFromDB(id);
      if (videoPath) {
        videoPaths.push(path.join(__dirname, '..', videoPath));
      } else {
        return res.status(404).send({ error: `Video with ID ${id} not found.` });
      }
    }

    // Ensure all files exist
    for (const filePath of videoPaths) {
      if (!fs.existsSync(filePath)) {
        return res.status(404).send({ error: `File ${filePath} not found.` });
      }
    }

    // Create a text file with the paths of videos to be merged
    const fileListPath = path.join(__dirname, '..', 'videos', `filelist_${Date.now()}.txt`);
    const fileListContent = videoPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(fileListPath, fileListContent);

    // Define the output file path
    const name = `merged_${Date.now()}.mp4`;
    const mergedFilePath = path.join(__dirname, '..', 'videos', `${name}`);

    // Construct the ffmpeg command to merge the videos
    ffmpeg()
      .input(fileListPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions([
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2'
      ])
      .on('start', function (commandLine) {
        console.log('Spawned ffmpeg with command: ' + commandLine);
      })
      .on('error', function (err, stdout, stderr) {
        console.log('Error: ' + err.message);
        console.log('ffmpeg stderr: ' + stderr);
        if (fs.existsSync(fileListPath)) {
          fs.unlinkSync(fileListPath);
        }
        res.status(500).send({ error: 'Error while merging videos: ' + err.message });
      })
      .on('end', async function () {
        console.log('Merging finished successfully');
        const mergedVideoId = await saveMergedVideo({ name: name, path: `videos/${name}` });
        if (fs.existsSync(fileListPath)) {
          fs.unlinkSync(fileListPath);
        }
        res.send({
          result: 'Videos merged successfully',
          mergedVideoId: mergedVideoId,
        });
      })
      .output(mergedFilePath)
      .run();
      // fs.rmdirSync(fileListPath);
  } catch (error) {
    console.error('Error while merging videos:', error);
    res.status(500).send({ error: error.message });
  }
};