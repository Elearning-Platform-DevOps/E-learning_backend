const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");


router.post("/signup", authController.signup);
router.post("/verify", authController.verify);
router.post("/login", authController.login);
router.post("/resend", authController.resendVerification);

module.exports = router;
