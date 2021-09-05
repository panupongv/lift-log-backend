const express = require("express");
const router = express.Router({ mergeParams: true });

const authorise = require('./authorisation').authorise;

const mongoose = require('mongoose');
const User = require("../models/user").User;
const Workout = require("../models/user").Workout;

const isValidExerciseContent = require('./utils').isValidExerciseContent;


router.post('/:sessionId', authorise, (req, res) => {
    const username = req.params.username;
    const sessionId = req.params.sessionId;
    const exerciseId = req.body.exerciseId;
    const content = req.body.content;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({
            message: `Create Workout: Invalid sessionId format.`
        });
    }

    if (!exerciseId || !mongoose.Types.ObjectId.isValid(exerciseId)) {
        return res.status(400).json({
            message: `Create Workout: Please provide a valid exerciseId.`
        });
    }

    if (!isValidExerciseContent(content)) {
        return res.status(400).json({
            message: `Create Workout: Please provide a valid exercise content.`
        });
    }

    User.findOne({ username: username })
        .then((user) => {

            if (!user) {
                return res.status(400).json({
                    message: `Create Workout: User ${username} not found.`
                });
            }

            const workout = new Workout({
                exerciseId: exerciseId,
                content: content
            })

            User.findOneAndUpdate(
                { username: username, 'sessions._id': sessionId },
                { $push: { 'sessions.$.workouts': workout } })
                .then((result) => {

                    if (!result) {
                        return res.status(400).json({
                            message: `Create Workout: Session ${sessionId} not found.`
                        });
                    }

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