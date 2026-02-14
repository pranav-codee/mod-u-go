const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const User = require("../models/User");
const verifyFirebaseToken = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

// Generate 2FA secret
const generate2FASecret = () => {
  return crypto.randomBytes(20).toString("hex");
};

// Generate TOTP code (simplified version)
const generateTOTP = (secret) => {
  const time = Math.floor(Date.now() / 30000);
  const hmac = crypto.createHmac("sha1", secret);
  hmac.update(Buffer.from(time.toString()));
  const hash = hmac.digest("hex");
  const offset = parseInt(hash.slice(-1), 16);
  const code =
    (parseInt(hash.substr(offset * 2, 8), 16) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, "0");
};

// Register or login user
router.post("/register", authLimiter, verifyFirebaseToken, async (req, res) => {
  try {
    const { email, name, role } = req.body;
    const firebaseUid = req.user.uid;

    let user = await User.findOne({ firebaseUid });

    if (user) {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      return res.json({ user, message: "User already exists" });
    }

    // Validate role
    const validRoles = ["student", "teacher", "proctor", "admin"];
    const userRole = validRoles.includes(role) ? role : "student";

    user = new User({
      firebaseUid,
      email,
      name,
      role: userRole,
      lastLogin: new Date(),
    });

    await user.save();

    res.status(201).json({ user, message: "User registered successfully" });
  } catch (error) {
    console.error("Error in register:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get current user
router.get("/me", verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid }).select(
      "-twoFactorSecret",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({ user });
  } catch (error) {
    console.error("Error in me:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update user profile
router.put("/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const { name, profileImage, referenceImage } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (profileImage) updateData.profileImage = profileImage;
    if (referenceImage) updateData.referenceImage = referenceImage;

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      updateData,
      { new: true },
    ).select("-twoFactorSecret");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user, message: "Profile updated" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Enable 2FA
router.post("/2fa/enable", verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is already enabled" });
    }

    // Generate secret
    const secret = generate2FASecret();
    user.twoFactorSecret = secret;
    await user.save();

    // In a real app, you would generate a QR code for authenticator apps
    // For simplicity, we'll return the secret directly
    const currentCode = generateTOTP(secret);

    res.json({
      secret,
      message: "Save this secret in your authenticator app",
      // In production, don't send currentCode - it's for testing only
      currentCode,
    });
  } catch (error) {
    console.error("Error enabling 2FA:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Verify and activate 2FA
router.post("/2fa/verify", verifyFirebaseToken, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: "Please enable 2FA first" });
    }

    const expectedCode = generateTOTP(user.twoFactorSecret);

    if (code !== expectedCode) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: "2FA enabled successfully" });
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Validate 2FA code during login
router.post("/2fa/validate", verifyFirebaseToken, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactorEnabled) {
      return res.json({ valid: true, message: "2FA not required" });
    }

    const expectedCode = generateTOTP(user.twoFactorSecret);
    const isValid = code === expectedCode;

    if (!isValid) {
      return res
        .status(401)
        .json({ valid: false, message: "Invalid 2FA code" });
    }

    res.json({ valid: true, message: "2FA verified" });
  } catch (error) {
    console.error("Error validating 2FA:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Disable 2FA
router.post("/2fa/disable", verifyFirebaseToken, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is not enabled" });
    }

    const expectedCode = generateTOTP(user.twoFactorSecret);

    if (code !== expectedCode) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({ message: "2FA disabled successfully" });
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Check 2FA status
router.get("/2fa/status", verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      enabled: user.twoFactorEnabled,
      required: user.twoFactorEnabled,
    });
  } catch (error) {
    console.error("Error checking 2FA status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
