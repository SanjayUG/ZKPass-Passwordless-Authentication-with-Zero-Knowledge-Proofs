// src/routes/authRoutes.js
import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";

const router = express.Router();

// Register a new user
router.post("/register", registerUser);

// Authenticate a user
router.post("/login", loginUser);

export default router;