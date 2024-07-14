const express = require("express");
const auth = require("../middleware/auth");
const { admin } = require("../middleware/roles");
const { uploadVideo, trimVideo, mergeVideos } = require("../controller/videoController");

const router = express.Router();

router.post("/", [auth, admin], uploadVideo);
router.post('/trim/:id', [auth, admin], trimVideo);
router.post("/merge", mergeVideos);

// Export the router
module.exports = router;
