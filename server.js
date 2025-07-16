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

// Import routes
const groupRoutes = require('./groups/routes/groupRoutes');
const membershipRoutes = require('./memberships/routes/membershipRoutes');
const accountRoutes = require('./accounts/routes/accountRoutes'); 
const inviteRoutes = require('./inviteLink/routes/inviteRoutes');
const paymentRoutes = require('./paymentTransaction/routes/paymentRoutes');
const payoutRoutes = require('./payoutTransaction/routes/payoutRoutes');

const webhookRoutes = require('./integrations/routes/webhookRoutes');

// Register routes
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/memberships', membershipRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/invites', inviteRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/payouts', payoutRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

const PORT = process.env.PORT

mongoose.connect(process.env.MONGO_URI )
.then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
        console.log(`🚀 Koojoo Thrift Platform API Server Running on Port ${PORT}`);
        console.log('');
        console.log('📊 Available Endpoints:');
        console.log(`   Groups:      POST/GET http://localhost:${PORT}/api/v1/groups`);
        console.log(`   Memberships: POST/GET http://localhost:${PORT}/api/v1/memberships`);
        console.log(`   Accounts:    POST/GET http://localhost:${PORT}/api/v1/accounts`);
        console.log(`   Invites:     POST/GET http://localhost:${PORT}/api/v1/invites`);
        console.log(`   Payments:    POST/GET http://localhost:${PORT}/api/v1/payments`);
        console.log(`   Payouts:     POST/GET http://localhost:${PORT}/api/v1/payouts`);
    });
})
.catch((err) => {
    console.error("Error connecting to MongoDB:", err);
});

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to Koojoo Thrift Platform API",
        version: "1.0.0",
        features: [
            "Enhanced group creation with virtual accounts",
            "Trust-score-based payout randomization", 
            "Complete payment and payout transaction system",
            "Monnify integration for banking",
            "Automated invite link generation",
            "Comprehensive membership management"
        ],
        endpoints: {
            groups: "/api/v1/groups",
            memberships: "/api/v1/memberships", 
            accounts: "/api/v1/accounts",
            invites: "/api/v1/invites",
            payments: "/api/v1/payments",
            payouts: "/api/v1/payouts"
        }
    });
});