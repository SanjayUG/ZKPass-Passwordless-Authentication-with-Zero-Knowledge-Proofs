// src/routes/authRoutes.js
import express from "express";
import { loginUser, verifyZKP } from "../controllers/authController.js";

const router = express.Router();

// User login
router.post("/login", loginUser);

// ZKP verification
router.post("/verify", verifyZKP);

export default router;