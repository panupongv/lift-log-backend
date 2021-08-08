const express = require("express");
const router = express.Router({ mergeParams: true });

const authorise = require('./authorisation').authorise;

const Session = require("../models/user").Session;


router.post('/', authorise, (req, res) => {
    const name = req.body.name;
    const date = req.body.date;
    const location = req.body.location;

    const newSession = new Session({
        name: name,
        date: date,
        location: location
    });

    return res.status(201).json({
        message: 'Create Session: Success.',
        createdSession: newSession
    });
});


module.exports = router;


