const express = require("express");
const router = express.Router({ mergeParams: true });

const authorise = require('./authorisation').authorise;

const User = require("../models/user").User;
const Workout = require("../models/user").Workout;


router.post('/:sessionId', authorise, (req, res) => {
    const username = req.params.username;
    const sessionId = req.params.sessionId;
    const exerciseId = req.body.exerciseId;
    const content = req.body.content;

    User.findOne({ username: username })
        .then((user) => {

            const workout = new Workout({
                exerciseId: exerciseId,
                content: content
            })

            User.findOneAndUpdate(
                { username: username, 'sessions._id': sessionId },
                { $push: { 'sessions.$.workouts': workout } })
                .then((result) => {
                    return res.status(201).json({
                        message: "Create Workout: Success.",
                        createdWorkout: workout
                    });
                })
                .catch((err) => {
                    console.log(err);
                    return res.status(500).json({
                        error: err
                    });
                });
        }).catch((err) => {
            console.log(err);
            return res.status(500).json({
                error: err
            });
        });
});


module.exports = router;