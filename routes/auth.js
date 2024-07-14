// Import dependencies
const jwt = require("jsonwebtoken");
const express = require("express");
const bcrypt = require("bcrypt");

// Setup the express server router
const router = express.Router();

// On post
router.post("/", async (req, res) => {
    // Dummy data
    const users = [{ email: "shubh@test.com", password: "$2b$15$SLVuWoViv9PuWHVwJTdIR.Ahfe9ceGFWzovlZsbdln0Y.rY4WTOLO", roles: ["admin"] }];

    // Get to user from the database, if the user is not there return error
    let user = users.find(u => u.email === req.body.email);
    if (!user) throw new Error("Invalid email or password.");

    // Compare the password with the password in the database
    const valid = await bcrypt.compare(req.body.password, user.password)
    if (!valid) throw new Error("Invalid email or password.");

    const token = jwt.sign({
        id: user._id,
        roles: user.roles,
    }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.send({
        token: token
    });
});

// Export the router
module.exports = router;