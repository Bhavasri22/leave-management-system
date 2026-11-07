const cors = require("cors");
app.use(cors({
    origin: "https://leave-management-system-public.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());