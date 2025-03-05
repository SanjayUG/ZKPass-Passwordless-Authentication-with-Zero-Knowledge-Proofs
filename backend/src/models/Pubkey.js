// src/models/Pubkey.js
import mongoose from "mongoose";

const PubkeySchema = new mongoose.Schema(
  {
    publicKey: {
      type: String,
      required: true,
      unique: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { autoIndex: true } // Ensure indexes are created
);

const Pubkey = mongoose.model("Pubkey", PubkeySchema);

export default Pubkey;