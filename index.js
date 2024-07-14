// Import dependencie
const express = require("express");

// Setup the express server
const app = express();
const port = 3000;

// Import middlewares into express
app.use(express.json());

// Import routes
const authRouter = require("./routes/auth");
const uploadVideo = require("./routes/videos");

// Setup all the routes
app.use("/upload", uploadVideo);
app.use("/auth", authRouter);

// Start the server
app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});