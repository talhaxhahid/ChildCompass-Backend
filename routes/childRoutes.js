const express = require('express');
const Child = require('../models/child');

const router = express.Router();

// Register Child
router.post('/register', async (req, res) => {
    const { name, age, gender } = req.body;
    
    console.log(req.body);
    console.log(name +" "+age+" "+ gender);
    try {
        const newChild = new Child({ name, age, gender });
        await newChild.save();

        // Include the auto-generated connection string in the response
        res.status(200).json({
            message: 'Child registered successfully',
            child: {
                id: newChild._id,
                name: newChild.name,
                age: newChild.age,
                gender: newChild.gender,
                connectionString: newChild.connectionString,
            },
        });
        
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ message: err.message });
    }
});

// Get names of children by list of connectionStrings
router.post('/names-by-connection', async (req, res) => {
    const { connectionStrings } = req.body;

    if (!Array.isArray(connectionStrings)) {
        return res.status(400).json({ message: 'connectionStrings must be an array.' });
    }

    try {
        const children = await Child.find({
            connectionString: { $in: connectionStrings }
        });

        const result = {};
        connectionStrings.forEach(cs => {
            const child = children.find(c => c.connectionString === cs);
            result[cs] = child ? child.name : null; // return null if not found
        });

        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;
