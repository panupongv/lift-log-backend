const express = require("express");
const router = express.Router({ mergeParams: true });

const authorise = require('./authorisation').authorise;

const User = require("../models/user").User;
const Session = require("../models/user").Session;


router.post('/', authorise, (req, res) => {
    const username = req.params.username;
    const name = req.body.name;
    const date = req.body.date;
    const location = req.body.location;

    if (!name) {
        return res.status(400).json({
            message: `Create Session: Missing body parameter 'name'.`
        });
    }
    if (!date) {
        return res.status(400).json({
            message: `Create Session: Missing body parameter 'date'.`
        });
    }

    User.findOne({ username: username })
        .then((user) => {
            if (!user) {
                return res.status(400).json({
                    message: `Create Session: Username ${username} not found.`
                });
            }
            const newSession = new Session({
                name: name,
                date: date,
                location: location
            });
            user.sessions.push(newSession);
            user.save()
                .then((result) => {
                    return res.status(201).json({
                        message: 'Create Session: Success.',
                        createdSession: newSession
                    });
                })
                .catch((err) => {
                    console.log(`err: ${err}`);
                    return res.status(500).json({
                        err: err
                    });
                });

        })
        .catch((err) => {
            console.log(`err: ${err}`);
            return res.status(500).json({
                err: err
            });
        });
});


module.exports = router;


