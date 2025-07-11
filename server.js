const express = require("express")
const mongoose = require("mongoose")
const dotenv = require("dotenv")
const cors = require("cors")

app = express()
dotenv.config()
app.use(cors())
app.use(express.json())

const groupRoutes = require('./src/routes/groupRoutes');
app.use('/api/groups', groupRoutes);

const PORT = process.env.PORT || 3001

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/koojoo-groups')
.then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
        console.log(`Create group: POST http://localhost:${PORT}/api/groups`);
    });
})
.catch((err) => {
    console.error("Error connecting to MongoDB:", err);
});

app.get("/", (req, res) => {
    res.send("Welcome to Koojoo Group Service API");
});