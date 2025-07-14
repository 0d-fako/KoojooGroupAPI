const express = require("express")
const mongoose = require("mongoose")
const dotenv = require("dotenv")
const cors = require("cors")

app = express()
dotenv.config()
app.use(cors())
app.use(express.json())

app.post('/debug', (req, res) => {
  console.log('Debug POST:', req.body);
  res.send({ message: 'POST received' });
});

const groupRoutes = require('./groups/routes/groupRoutes');
const membershipRoutes = require('./memberships/routes/membershipRoutes');
const accountRoutes = require('./accounts/routes/accountRoutes'); // ← Fixed: added 's'

app.use('/api/v1/memberships', membershipRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/accounts', accountRoutes);

const PORT = process.env.PORT

mongoose.connect(process.env.MONGO_URI )
.then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
        console.log(`Create group: POST http://localhost:${PORT}/api/v1/groups`);
        console.log(`Create membership: POST http://localhost:${PORT}/api/v1/memberships`);
        console.log(`Create account: POST http://localhost:${PORT}/api/v1/accounts`);
    });
})
.catch((err) => {
    console.error("Error connecting to MongoDB:", err);
});

app.get("/", (req, res) => {
    res.send("Welcome to Koojoo Group Service API");
});