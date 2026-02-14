const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Exam = require("../models/Exam");
const Submission = require("../models/Submission");
const ProctoringSession = require("../models/ProctoringSession");
const Notification = require("../models/Notification");
const verifyFirebaseToken = require("../middleware/auth");

// Middleware to check admin role
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.adminUser = user;
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all users (admin only)
router.get("/users", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, isActive } = req.query;

    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-twoFactorSecret")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user by ID
router.get(
  "/users/:id",
  verifyFirebaseToken,
  requireAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select(
        "-twoFactorSecret",
      );
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user statistics
      const stats = {
        examsCreated:
          user.role === "teacher"
            ? await Exam.countDocuments({ teacherId: user._id })
            : 0,
        submissions: await Submission.countDocuments({ studentId: user._id }),
        flaggedSubmissions: await Submission.countDocuments({
          studentId: user._id,
          isFlagged: true,
        }),
      };

      res.json({ user, stats });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

// Update user (admin only)
router.put(
  "/users/:id",
  verifyFirebaseToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { role, isActive, name } = req.body;

      const updateData = {};
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (name) updateData.name = name;

      const user = await User.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
      }).select("-twoFactorSecret");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Notify user of role change
      if (role) {
        await Notification.create({
          userId: user._id,
          type: "account_update",
          title: "Role Updated",
          message: `Your account role has been changed to ${role}`,
          priority: "high",
        });
      }

      res.json({ user, message: "User updated successfully" });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

// Delete user (admin only)
router.delete(
  "/users/:id",
  verifyFirebaseToken,
  requireAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent deleting self
      if (user._id.toString() === req.adminUser._id.toString()) {
        return res
          .status(400)
          .json({ message: "Cannot delete your own account" });
      }

      // Delete associated data
      await Submission.deleteMany({ studentId: user._id });
      await Exam.deleteMany({ teacherId: user._id });
      await Notification.deleteMany({ userId: user._id });
      await ProctoringSession.deleteMany({ studentId: user._id });
      await User.findByIdAndDelete(req.params.id);

      res.json({ message: "User and associated data deleted" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

// Get all exams (admin only)
router.get("/exams", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, isActive, search } = req.query;

    const query = {};
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const exams = await Exam.find(query)
      .populate("teacherId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Exam.countDocuments(query);

    res.json({
      exams,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete exam (admin only)
router.delete(
  "/exams/:id",
  verifyFirebaseToken,
  requireAdmin,
  async (req, res) => {
    try {
      const exam = await Exam.findById(req.params.id);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Delete associated submissions and proctoring sessions
      await Submission.deleteMany({ examId: exam._id });
      await ProctoringSession.deleteMany({ examId: exam._id });
      await Exam.findByIdAndDelete(req.params.id);

      res.json({ message: "Exam and associated data deleted" });
    } catch (error) {
      console.error("Error deleting exam:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

// Get all submissions (admin only)
router.get(
  "/submissions",
  verifyFirebaseToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, isFlagged, examId } = req.query;

      const query = {};
      if (isFlagged !== undefined) query.isFlagged = isFlagged === "true";
      if (examId) query.examId = examId;

      const submissions = await Submission.find(query)
        .populate("studentId", "name email")
        .populate("examId", "title")
        .sort({ submittedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Submission.countDocuments(query);

      res.json({
        submissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
);

// System settings
router.get("/settings", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    // In a real app, this would come from a settings collection
    const settings = {
      allowRegistration: true,
      defaultUserRole: "student",
      maxFileUploadSize: 10, // MB
      sessionTimeout: 60, // minutes
      proctoringEnabled: true,
      defaultProctoringSettings: {
        requireWebcam: true,
        requireFullscreen: true,
        trackTabSwitches: true,
      },
    };

    res.json({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// System health check
router.get("/health", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const health = {
      status: "healthy",
      database: "connected",
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      counts: {
        users: await User.countDocuments(),
        exams: await Exam.countDocuments(),
        submissions: await Submission.countDocuments(),
        activeSessions: await ProctoringSession.countDocuments({
          status: "active",
        }),
      },
    };

    res.json({ health });
  } catch (error) {
    console.error("Error fetching health:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
