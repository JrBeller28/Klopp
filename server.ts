import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

dotenv.config();

console.log("Server starting with NODE_ENV:", process.env.NODE_ENV);

mongoose.set('bufferCommands', false);

const app = express();
const PORT = 3000;

// --- Middleware & Basic Routes ---

app.use(cors({
  origin: true,
  credentials: true
}));

// Health check - Move to top and make extremely robust
app.get("/api/health", (req, res) => {
  console.log("Health check request received");
  try {
    const dbStatus = mongoose.connection.readyState;
    const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
    
    let uriError = null;
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      uriError = "MONGODB_URI is missing in Secrets.";
    } else if (uri.includes("<") || uri.includes(">")) {
      uriError = "MONGODB_URI contains '<' or '>'. Please remove these brackets from your connection string in Secrets.";
    }

    res.json({ 
      status: "ok", 
      db: dbStates[dbStatus] || "unknown",
      dbCode: dbStatus,
      error: uriError,
      env: process.env.NODE_ENV || "development",
      time: new Date().toISOString()
    });
  } catch (err) {
    console.error("Health check internal error:", err);
    res.status(500).json({ status: "error", message: String(err) });
  }
});

app.use(express.json());
app.use(cookieParser());

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/klopp";
const JWT_SECRET = process.env.JWT_SECRET || "klopp-secret-key";

// --- Database Models ---

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "admin" },
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const reservationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  guests: { type: Number, required: true },
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
const Reservation = mongoose.models.Reservation || mongoose.model("Reservation", reservationSchema);

const authenticate = async (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

// --- API Routes ---

// Auth
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  
  // Check DB connection first
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      message: "Database belum terhubung. Periksa MONGODB_URI di Secrets dan pastikan tidak ada tanda < > pada password." 
    });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: "Username atau password salah." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Username atau password salah." });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000
    });
    res.json({ user: { username: user.username, role: user.role } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  });
  res.json({ message: "Logged out" });
});

app.get("/api/auth/me", authenticate, (req: any, res) => {
  res.json({ user: { username: req.user.username, role: req.user.role } });
});

// Products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/products", authenticate, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/products/:id", authenticate, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/products/:id", authenticate, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Reservations
app.get("/api/reservations", authenticate, async (req, res) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/reservations", async (req, res) => {
  try {
    const reservation = new Reservation(req.body);
    await reservation.save();
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/reservations/:id", authenticate, async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/reservations/:id", authenticate, async (req, res) => {
  try {
    await Reservation.findByIdAndDelete(req.params.id);
    res.json({ message: "Reservation deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// --- Server Start ---

const initializeApp = async () => {
  // Vite/Static serving logic
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

  // Start listening if not in Vercel
  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
};

const connectToDatabase = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn("WARNING: MONGODB_URI is not set.");
    } else if (process.env.MONGODB_URI.includes("<") || process.env.MONGODB_URI.includes(">")) {
      console.error("ERROR: MONGODB_URI contains '<' or '>'. Please remove these brackets from your connection string in Secrets.");
    }
    
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Connected to MongoDB successfully");

    // Seed admin user
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "adminklopp";
    const adminExists = await User.findOne({ username: adminUsername });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({ username: adminUsername, password: hashedPassword });
      console.log("Admin user created");
    }
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
};

// Initialize app and connect to DB
initializeApp();
connectToDatabase();

export default app;
