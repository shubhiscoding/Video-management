const express = require("express");
const auth = require("../middleware/auth");
const { admin } = require("../middleware/roles");

// Dummy data
let messages = [{ id: 1, name: "Lorem ipsum dolor", content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras pretium nec ipsum nec elementum." }];

const router = express.Router();

router.get("/", [auth, admin], (req, res) => {
    res.send({
        result: messages
    });
});

// Export the router
module.exports = router;