const express = require("express");
const auth = require("../middleware/auth");
const { admin } = require("../middleware/roles");
const { uploadVideo } = require("../controllers/videoController");

const router = express.Router();

router.post("/", [auth, admin], uploadVideo);

// Export the router
module.exports = router;
