// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client"; // ✅ Change this import
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
