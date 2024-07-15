const express = require("express");
const auth = require("../middleware/auth");
const { admin } = require("../middleware/roles");
const { uploadVideo, trimVideo, mergeVideos, generateShareableLink, serveSharedVideo } = require("../controller/videoController");

const router = express.Router();

router.post("/", [auth, admin], uploadVideo);
router.post('/trim/:id', [auth, admin], trimVideo);
router.post("/merge", [auth, admin], mergeVideos);
router.post("/share", generateShareableLink);
router.get("/shared/:token", serveSharedVideo);

// Export the router
module.exports = router;
