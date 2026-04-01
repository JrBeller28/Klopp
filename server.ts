import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";

dotenv.config();

console.log("Server starting with NODE_ENV:", process.env.NODE_ENV);

const app = express();
const PORT = 3000;

// --- Middleware ---

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// --- Basic Routes ---

app.get("/api/health", async (req, res) => {
  console.log("Health check request received");
  try {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV || "development",
      time: new Date().toISOString()
    });
  } catch (err) {
    console.error("Health check internal error:", err);
    res.status(500).json({ 
      status: "error", 
      message: err instanceof Error ? err.message : String(err)
    });
  }
});

// --- Server Start ---

const initializeApp = async () => {
  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware initialized");
    } catch (viteErr) {
      console.error("Vite Middleware Error:", viteErr);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Static serving initialized");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

// Initialize app
initializeApp();

export default app;
