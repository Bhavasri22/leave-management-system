
const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Leave = require("../models/Leave");
const jwt = require("jsonwebtoken");

// Staff Authentication Middleware
function verifyStaff(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Staff login required"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "staff") {
            return res.status(403).json({
                message: "Staff access only"
            });
        }

        req.staff = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired staff token. Please login again."
        });
    }
}

// Staff Login
router.post("/staff/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            !process.env.STAFF_EMAIL ||
            !process.env.STAFF_PASSWORD ||
            !process.env.JWT_SECRET
        ) {
            return res.status(500).json({
                message: "Staff login configuration is missing"
            });
        }

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            email.trim().toLowerCase() !==
                process.env.STAFF_EMAIL.trim().toLowerCase() ||
            password !== process.env.STAFF_PASSWORD
        ) {
            return res.status(401).json({
                message: "Invalid staff email or password"
            });
        }

        const token = jwt.sign(
            {
                role: "staff",
                email: email.trim().toLowerCase()
            },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.json({
            message: "Staff login successful",
            token
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            message: "Staff login failed"
        });
    }
});

// Student Registration
router.post("/register", async (req, res) => {
    try {
        const { username, email, rollNumber } = req.body;

        if (
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof rollNumber !== "string" ||
            !username.trim() ||
            !email.trim() ||
            !rollNumber.trim()
        ) {
            return res.status(400).json({
                message: "Please fill all fields"
            });
        }

        const cleanEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({
                message: "Invalid email"
            });
        }

        const existingUser = await User.findOne({
            email: cleanEmail
        });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already registered"
            });
        }

        const user = await User.create({
            username: username.trim(),
            email: cleanEmail,
            rollNumber: rollNumber.trim()
        });

        res.status(201).json({
            message: "Registration successful",
            userId: user._id,
            username: user.username,
            rollNumber: user.rollNumber,
            casualLeave: user.casualLeave,
            medicalLeave: user.medicalLeave
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            message: "Registration failed"
        });
    }
});

// Student Login
router.post("/login", async (req, res) => {
    try {
        const { email } = req.body;

        if (typeof email !== "string" || !email.trim()) {
            return res.status(400).json({
                message: "Enter your email"
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found. Register first."
            });
        }

        res.json({
            userId: user._id,
            username: user.username,
            rollNumber: user.rollNumber,
            casualLeave: user.casualLeave,
            medicalLeave: user.medicalLeave
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            message: "Login failed"
        });
    }
});

// Student Apply for Leave with Dates
router.post("/apply-leave/:id", async (req, res) => {
    try {
        const { type, fromDate, toDate, reason } = req.body;

        if (!["casual", "medical"].includes(type)) {
            return res.status(400).json({
                message: "Invalid leave type"
            });
        }

        if (!fromDate || !toDate) {
            return res.status(400).json({
                message: "Please select both From Date and To Date"
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        if (
            !dateRegex.test(fromDate) ||
            !dateRegex.test(toDate)
        ) {
            return res.status(400).json({
                message: "Invalid date format"
            });
        }

        const start = new Date(fromDate + "T00:00:00.000Z");
        const end = new Date(toDate + "T00:00:00.000Z");

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            start.toISOString().slice(0, 10) !== fromDate ||
            end.toISOString().slice(0, 10) !== toDate ||
            end < start
        ) {
            return res.status(400).json({
                message: "Please select valid leave dates"
            });
        }

        const days = Math.round(
            (end - start) / (1000 * 60 * 60 * 24)
        ) + 1;

        if (
            typeof reason !== "string" ||
            !reason.trim()
        ) {
            return res.status(400).json({
                message: "Please enter the leave reason"
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        const leave = await Leave.create({
            userId: user._id,
            type,
            fromDate: start,
            toDate: end,
            days,
            reason: reason.trim(),
            status: "Pending"
        });

        res.status(201).json({
            message: "Leave request submitted. Waiting for staff approval.",
            leave
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            message: "Unable to submit leave request"
        });
    }
});

// Student View Own Leave Requests
router.get("/my-leaves/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        const leaves = await Leave.find({
            userId: user._id
        }).sort({ appliedAt: -1 });

        res.json(leaves);
    } catch (error) {
        console.log(error.message);
        res.status(400).json({
            message: "Unable to load leave requests"
        });
    }
});

// Staff View All Leave Requests
router.get("/staff/leaves", verifyStaff, async (req, res) => {
    try {
        const leaves = await Leave.find()
            .populate("userId", "username email rollNumber")
            .sort({ appliedAt: -1 });

        res.json(leaves);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            message: "Unable to load leave requests"
        });
    }
});

// Staff Approve or Reject Leave
router.post(
    "/staff/leaves/:leaveId/decision",
    verifyStaff,
    async (req, res) => {
        try {
            const { decision, rejectionReason } = req.body;

            if (!["Approved", "Rejected"].includes(decision)) {
                return res.status(400).json({
                    message: "Choose Approved or Rejected"
                });
            }

            if (
                decision === "Rejected" &&
                (
                    typeof rejectionReason !== "string" ||
                    !rejectionReason.trim()
                )
            ) {
                return res.status(400).json({
                    message: "Please enter the rejection reason"
                });
            }

            const leave = await Leave.findById(
                req.params.leaveId
            );

            if (!leave) {
                return res.status(404).json({
                    message: "Leave request not found"
                });
            }

            if (leave.status !== "Pending") {
                return res.status(400).json({
                    message: "This request has already been reviewed"
                });
            }

            if (decision === "Approved") {
                const user = await User.findById(leave.userId);

                if (!user) {
                    return res.status(404).json({
                        message: "Student not found"
                    });
                }

                const field = leave.type === "casual"
                    ? "casualLeave"
                    : "medicalLeave";

                if (user[field] < leave.days) {
                    return res.status(400).json({
                        message: "Insufficient leave balance"
                    });
                }

                user[field] -= leave.days;
                await user.save();

                leave.rejectionReason = "";
            }

            if (decision === "Rejected") {
                leave.rejectionReason = rejectionReason.trim();
            }

            leave.status = decision;
            await leave.save();

            res.json({
                message: `Leave ${decision.toLowerCase()} successfully`,
                leave
            });

        } catch (error) {
            console.log(error.message);
            res.status(500).json({
                message: "Unable to update leave request"
            });
        }
    }
);

// Get Student Leave Balance
router.get("/leave-balance/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.json({
            casualLeave: user.casualLeave,
            medicalLeave: user.medicalLeave
        });
    } catch (error) {
        res.status(400).json({
            message: "Invalid user ID"
        });
    }
});

module.exports = router;
