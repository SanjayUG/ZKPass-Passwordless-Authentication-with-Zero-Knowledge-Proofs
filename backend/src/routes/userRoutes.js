// src/routes/userRoutes.js
import express from "express";
import { registerUser, updateCredentials } from "../controllers/userController.js";

const router = express.Router();

// User registration
router.post("/register", registerUser);

// Credential management
router.put("/credentials", updateCredentials);

export default router;