const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const courseRoutes = require("./routes/courseRoutes");
const testimonialRoutes = require("./routes/testimonialRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");
const classLinkRoutes = require("./routes/classLinkRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const adminRoutes = require("./routes/adminRoutes");
// const teacherNoticeRoutes = require("./routes/teacherNoticeRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const orderRoutes = require("./routes/orderRoutes");
const studentRoutes = require("./routes/studentRoutes");
const contentRoutes = require("./routes/contentRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const batchRoutes = require("./routes/batchRoutes");
const donationRoutes = require("./routes/donationRoutes");
const quizRoutes = require("./routes/quizRoutes");
const cors = require("cors");

const app = express();

connectDB();

// Middleware to parse incoming JSON data
app.use(express.json());

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "https://darulislam2.vercel.app",
        process.env.FRONTEND_URL,
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Mount the routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/products", productRoutes);
app.use("/api/class-links", classLinkRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/notices", adminRoutes);
app.use("/api/general-notices", adminRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/quiz", quizRoutes);

app.get("/", (req, res) => {
  res.send("Darul Islam server is running...");
});

// Export the configured app
module.exports = app;
