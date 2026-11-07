
require("dotenv").config();

const express = require("express");
const path = require("path");
const connectDB = require("./config/db");
const leaveRoutes = require("./routes/leaveRoutes");

const app = express();
const PORT = 5050;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", leaveRoutes);

async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log("Server running at http://localhost:5050");
        });
    } catch (error) {
        console.log("Server startup failed:", error.message);
    }
}

startServer();
