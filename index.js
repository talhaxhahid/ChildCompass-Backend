const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const childRoutes = require('./routes/childRoutes');
const parentRoutes = require('./routes/parentRoutes');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());




// Test Route
app.get('/', (req, res) => {
    res.send('Child Compass API is running');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server is running on port ${PORT}`));


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
app.use('/api/child', childRoutes);
app.use('/api/parent', parentRoutes);
connectDB();
