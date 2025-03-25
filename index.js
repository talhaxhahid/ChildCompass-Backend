const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const childRoutes = require('./routes/childRoutes');
const parentRoutes = require('./routes/parentRoutes');
const cors = require('cors');
const http = require('http');
const locationWebSocket = require('./websockets/locationSharing');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};
connectDB();

app.use('/api/child', childRoutes);
app.use('/api/parent', parentRoutes);

// Test Route
app.get('/', (req, res) => {
    res.send('Child Compass API is running');
});

// Create HTTP server from Express app
const server = http.createServer(app);

// Start WebSocket Server
locationWebSocket(server);

// Start HTTP server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server is running on port ${PORT}`));
