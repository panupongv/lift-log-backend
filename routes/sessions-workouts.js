const express = require("express");
const router = express.Router({ mergeParams: true });

const authorise = require('./authorisation').authorise;

const mongoose = require('mongoose');
const User = require("../models/user").User;
const Workout = require("../models/user").Workout;

const isValidDateFormat = require('./utils').isValidDateFormat;
const isValidHistoryOffset = require('./utils').isValidHistoryOffset;
const isValidExerciseContent = require('./utils').isValidExerciseContent;


router.get('/:sessionId', authorise, (req, res) => {
    const username = req.params.username;
    const sessionId = req.params.sessionId;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({
            message: `Get Workouts: Invalid sessionId format.`
        });
    }

    User.findOne({ username: username })
        .then((user) => {
            if (!user) {
                return res.status(400).json({
                    message: `Get Workouts: User ${username} not found.`
                });
            }

            User.aggregate([
                { $match: { username: username } },
                { $project: { _id: false, sessions: true } },
                { $unwind: '$sessions' },
                { $match: { 'sessions._id': mongoose.Types.ObjectId(sessionId) } }
            ])
                .then((result) => {
                    if (!result || result.length === 0) {
                        return res.status(400).json({
                            message: `Get Workouts: Cannot find session ${sessionId}.`
                        });
                    }

                    const session = result[0].sessions;

                    return res.status(200).json({
                        message: 'Get Workouts: Success.',
                        session: session
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


router.get('/history/:exerciseId', authorise, (req, res) => {
    const username = req.params.username;
    const exerciseId = req.params.exerciseId;
    const date = req.query.date;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
        return res.status(400).json({
            message: `Get Workouts: Invalid exerciseId format.`
        });
    }

    if (!date || !isValidDateFormat(date)) {
        return res.status(400).json({
            message: `Get Workouts: Please provide a valid date.`
        });
    }

    if (!isValidHistoryOffset(offset)) {
        return res.status(400).json({
            message: `Get Workouts: Invalid offset parameter.`
        });
    }

    User.findOne({ username: username })
        .then((user) => {
            if (!user) {
                return res.status(400).json({
                    message: `Get History: User ${username} not found.`
                });
            }

            User.aggregate([
                { $match: { username: username } },
                { $project: { sessions: true } },
                { $unwind: '$sessions' },
                { $unwind: '$sessions.workouts' },
                { $match: { 'sessions.workouts.exerciseId': mongoose.Types.ObjectId(exerciseId) } },
                { $sort: { 'sessions.date': -1 } },
            ]).then((result) => {
                if (!result) {
                    return res.status(400).json({
                        message: `Get History: Bad query.`
                    });
                }

                if (result.length === 0) {
                    return res.status(200).json({
                        message: `Get History: Success.`,
                    });
                }

                const targetDate = new Date(date);

                const sessionIndex = offset +
                    (targetDate <= result[result.length - 1].sessions.date ?
                        result.length - 1 :
                        result.findIndex(item => new Date(item.sessions.date) <= targetDate));

                const session = result[sessionIndex];
                const olderSession = result[sessionIndex + 1];
                const newerSession = result[sessionIndex - 1];

                const response = {
                    message: `Get History: Success.`,
                };

                if (newerSession) {
                    response.newerSession = newerSession.sessions;
                }

                if (session) {
                    response.session = session.sessions
                }

                if (olderSession) {
                    response.olderSession = olderSession.sessions;
                }

                return res.status(200).json(response);

            }).catch((err) => {
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

    if (!mongoose.Types.ObjectId.isValid(workoutId)) {
        return res.status(400).json({
            message: `Update Workout: Invalid workoutId format.`
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


router.delete('/:sessionId/:workoutId', authorise, (req, res) => {
    const username = req.params.username;
    const sessionId = req.params.sessionId;
    const workoutId = req.params.workoutId;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({
            message: `Delete Workout: Invalid sessionId format.`
        });
    }

    if (!mongoose.Types.ObjectId.isValid(workoutId)) {
        return res.status(400).json({
            message: `Delete Workout: Invalid workoutId format.`
        });
    }

    User.findOne({ username: username })
        .then((user) => {
            if (!user) {
                return res.status(400).json({
                    message: `Delete Workout: User ${username} not found.`
                });
            }

            const sessionElementLabel = 'sessionElement';
            const sessionArrayFilter = {}; sessionArrayFilter[`${sessionElementLabel}._id`] = sessionId;
            const filters = [sessionArrayFilter];
            const elementToRemove = {}; elementToRemove[`sessions.$[${sessionElementLabel}].workouts`] = { _id: workoutId };

            User.findOneAndUpdate(
                {
                    username: username,
                    'sessions._id': sessionId,
                    'sessions.workouts._id': workoutId
                },
                { $pull: elementToRemove },
                {
                    arrayFilters: filters,
                })
                .then((result) => {

                    if (!result) {
                        return res.status(400).json({
                            message: `Delete Workout: Cannot find session-workout ${sessionId}/${workoutId}.`
                        });
                    }

                    return res.status(200).json({
                        message: `Delete Workout: Success.`
                    });
                })
                .catch((err) => {
                    console.log(err);
                    return res.status(500).json({
                        error: err
                    });
                });
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({
                error: err
            });
        });
});


module.exports = router;