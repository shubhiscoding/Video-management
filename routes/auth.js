// Import dependencies
const jwt = require("jsonwebtoken");
const express = require("express");
const bcrypt = require("bcrypt");
const { getAdminByEmail } = require('../models/admin');
require('dotenv').config();

// Setup the express server router
const router = express.Router();

// On post
router.post("/", async (req, res) => {
  try {
    // Get the user from the database
    let user = await getAdminByEmail(req.body.email);
    if (!user) return res.status(400).send("Invalid email or password.");

    // Compare the password with the password in the database
    const valid = await bcrypt.compare(req.body.password, user.password);
    if (!valid) return res.status(400).send("Invalid email or password.");

    const token = jwt.sign({
      id: user.id,
      roles: user.roles,
    }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.send({
      token: token
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Something went wrong.");
  }
});

// Export the router
module.exports = router;
