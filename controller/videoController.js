const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { getVideoById, saveTrimmedVideo, getVideoPathFromDB, saveMergedVideo } = require('../models/video');
const { saveVideo } = require("../models/video");
const { v4: uuidv4 } = require('uuid');
const { getTokenById, saveToken, deleteToken } = require('../models/token');


// Define storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'videos');
  },
  filename: function (req, file, cb) {
    const sanitizedFilename = file.originalname.replace(/\s+/g, '');
    const name = Date.now() + '_' + sanitizedFilename;
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

const checkVideoDuration = (filePath) => {
  return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
              reject(err);
          } else {
              const duration = metadata.format.duration;
              resolve(duration <= 25);
          }
      });
  });
};

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
      if (!req.file) {
        return res.status(400).send({
          error: 'No video file uploaded',
        });
      }

    try {
      // Save the video to the database
      const isDurationValid = await checkVideoDuration(path.join(__dirname, '..', req.file.path));
      if (!isDurationValid) {
          // Delete the uploaded file if duration is invalid
          fs.unlinkSync(path.join(__dirname, '..', req.file.path));
          return res.status(400).send({
              error: 'Video duration must be 25 seconds or less',
          });
      }

      const videoDetails = await saveVideo(req);
      res.send({
        result: "File uploaded successfully",
        video: videoDetails
      });
    } catch (error) {
      if (fs.existsSync(path.join(__dirname, '..', req.file.path))){
        fs.rmdirSync(path.join(__dirname, '..', req.file.path));
      }
      res.status(400).send({
        error: error.message,
      });
    }
  });
};


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

exports.generateShareableLink = async (req, res) => {
  try {
    const { videoId, expiryHours } = req.body;

    if (!videoId || !expiryHours) {
      return res.status(400).json({ error: 'VideoId and expiryHours are required' });
    }

    // Generate a numeric token instead of UUID
    const token = Math.floor(100000 + Math.random() * 900000); // 6-digit number
    const expiryTime = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const Urltoken = {
      Tokenid: token,
      videoId: videoId.toString(), // Ensure videoId is a string
      expiryTime: expiryTime
    };
    const video = await getVideoById(videoId);
    if(!video){
      return res.status(404).json({ error: 'Video not found' });
    }
    await saveToken(Urltoken);

    // Generate the shareable link
    const shareableLink = `http://localhost:3000/videos/shared/${token}`;

    res.json({ shareableLink, expiryTime: expiryTime.toISOString() });
  } catch (error) {
    console.error('Error generating shareable link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.serveSharedVideo = async (req, res) => {
  try {
    const { token } = req.params;
    const ourToken = await getTokenById(token);
    const { Tokenid, videoId, expiryTime } = ourToken;
    if (!Tokenid || !videoId || !expiryTime) {
      return res.status(404).json({ error: 'Invalid or expired link' });
    }

    if (Date.now() > expiryTime) {
      await deleteToken(Tokenid);
      return res.status(410).json({ error: 'Link has expired' });
    }

    // Here, implement the logic to serve the video
    // This might involve streaming the video or redirecting to a video player
    // For this example, we'll just return the videoId
    const video = await getVideoById(videoId);
    const finalPath = uploadDirectory +'/'+ video.filename;
    res.sendfile(finalPath);
  } catch (error) {
    console.error('Error serving shared video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};