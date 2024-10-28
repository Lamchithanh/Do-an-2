const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

// Import routes
const userRoutes = require("./routes/userRoutes.js");
const courseRoutes = require("./routes/courseRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const moduleRoutes = require("./routes/moduleRoutes"); // Thêm import cho moduleRoutes

const app = express();
const port = process.env.PORT || 9000;

// Cấu hình CORS
app.use(cors());

// Middleware để log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(bodyParser.json());

// Routes
app.use("/api", userRoutes);
app.use("/api", courseRoutes);
app.use("/api", uploadRoutes);
app.use("/api", lessonRoutes);
app.use("/api", moduleRoutes); // Thêm moduleRoutes vào middleware chain

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something broke!", error: err.message });
});

app.listen(port, () => {
  console.log(`Máy chủ đang chạy trên cổng ${port}`);
});
