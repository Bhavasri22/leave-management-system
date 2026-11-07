const express = require("express");
const cors = require("cors");
const leaveRoutes = require("./routes/leaveRoutes");

const app = express();

app.use(cors({
    origin: "https://leave-management-system-public.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.use("/api", leaveRoutes);