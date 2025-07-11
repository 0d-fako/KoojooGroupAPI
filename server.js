const express = require("express")
const mongoose = require("mongoose")
const dotenv = require("dotenv")
const cors = require("cors")

app = express()
dotenv.config()
app.use(cors())
app.use(express.json())

const groupRoutes = require('./routes/groupRoutes');
app.use('/api/v1/groups', groupRoutes);

const PORT = process.env.PORT

mongoose.connect(process.env.MONGO_URI )
.then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
        console.log(`Create group: POST http://localhost:${PORT}/api/v1/groups`);
    });
})
.catch((err) => {
    console.error("Error connecting to MongoDB:", err);
});

app.get("/", (req, res) => {
    res.send("Welcome to Koojoo Group Service API");
});