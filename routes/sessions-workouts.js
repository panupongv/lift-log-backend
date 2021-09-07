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


router.put('/:sessionId/:workoutId', authorise, (req, res) => {
    const username = req.params.username;
    const sessionId = req.params.sessionId;
    const workoutId = req.params.workoutId;
    const content = req.body.content;
    const exerciseId = req.body.exerciseId;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({
            message: `Update Workout: Invalid sessionId format.`
        });
    }

    if (!exerciseId && !content) {
        return res.status(400).json({
            message: `Update Workout: Missing request body parameters.`
        });
    }

    if (exerciseId && !mongoose.Types.ObjectId.isValid(exerciseId)) {
        return res.status(400).json({
            message: `Update Workout: Please provide a valid exerciseId.`
        });
    }

    if (content && !isValidExerciseContent(content)) {
        return res.status(400).json({
            message: `Update Workout: Please provide a valid exercise content.`
        });
    }

    User.findOne({ username: username })
        .then((user) => {

            if (!user) {
                return res.status(400).json({
                    message: `Update Workout: User ${username} not found.`
                });
            }

            const sessionElementLabel = 'sessionElement';
            const workoutElementLabel = 'workoutElement';

            const sessionArrayFilter = {}; sessionArrayFilter[`${sessionElementLabel}._id`] = sessionId;
            const workoutArrayFilter = {}; workoutArrayFilter[`${workoutElementLabel}._id`] = workoutId;
            const filters = [sessionArrayFilter, workoutArrayFilter];

            const fieldsToUpdate = {};
            const updatedFields = {};
            if (exerciseId) {
                fieldsToUpdate[`sessions.$[${sessionElementLabel}].workouts.$[${workoutElementLabel}].exerciseId`] =
                    updatedFields.exerciseId = exerciseId;
            }
            if (content || content === '') {
                fieldsToUpdate[`sessions.$[${sessionElementLabel}].workouts.$[${workoutElementLabel}].content`] =
                    updatedFields.content = content;
            }

            User.findOneAndUpdate(
                {
                    username: username,
                    'sessions._id': sessionId,
                    'sessions.workouts._id': workoutId
                },
                { $set: fieldsToUpdate },
                {
                    arrayFilters: filters,
                    new: true
                })
                .then((result) => {

                    if (!result) {
                        return res.status(400).json({
                            message: `Update Workout: Cannot find session-workout ${sessionId}/${workoutId}.`
                        });
                    }

                    return res.status(200).json({
                        message: 'Update Workout: Success.',
                        updatedFields: updatedFields
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