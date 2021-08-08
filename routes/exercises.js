const express = require("express");
const router = express.Router({ mergeParams: true });

const authorise = require('./authorisation').authorise;

const User = require("../models/user").User;
const Exercise = require("../models/user").Exercise;


router.get('/', authorise, (req, res) => {
    const username = req.params.username;
    User.findOne({
        'username': username,
    }).then((user) => {
        if (user) {
            return res.status(200).json({
                message: 'Get Exercises: Success.',
                exercises: user.exercises
            });
        }
        return res.status(404).json({
            message: `Get Exercises: User ${username} not found.`
        });
    }).catch((err) => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    });
});


router.post('/', authorise, (req, res) => {
    const username = req.params.username;
    const exerciseName = req.body.exerciseName;

    if (!exerciseName) {
        return res.status(400).json({
            message: `Create Exercise: Please provide an exercise name`
        });
    }

    User.findOne({ 'username': username })
        .exec()
        .then((user) => {
            if (!user) {
                return res.status(400).json({
                    message: `Create Exercise: Cannot find user ${username}.`
                });
            }
            if (user.exercises && user.exercises.some(exercise => exercise.name === exerciseName)) {
                return res.status(400).json({
                    message: `Create Exercise: exercise ${exerciseName} already exist.`
                });
            }

            const newExercise = new Exercise({ name: exerciseName });
            user.exercises.push(newExercise);
            user.save()
                .then((user) => {
                    return res.status(201).json({
                        message: 'Create Exercise: Success.',
                        createdExercise: newExercise,
                        exercises: user.exercises
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


router.put('/:exerciseId', authorise, (req, res) => {
    const username = req.params.username;
    const exerciseId = req.params.exerciseId;
    const exerciseName = req.body.exerciseName;

    if (!exerciseName) {
        return res.status(400).json({
            message: `Update Exercise: Please provide an exercise name.`
        });
    }

    User.findOne({ 'username': username })
        .exec()
        .then((user) => {

            if (!user) {
                return res.status(400).json({
                    message: `Update Exercise: Cannot find user ${username}.`
                })
            }
            if (!user.exercises.map(exercise => exercise._id).includes(exerciseId)) {
                return res.status(400).json({
                    message: `Update Exercise: exerciseId ${exerciseId} does not exist.`
                });
            }
            if (user.exercises.some(exercise => exercise.name === exerciseName)) {
                return res.status(400).json({
                    message: `Update Exercise: exerciseName ${exerciseName} already exist.`
                });
            }

            const updateIndex = user.exercises.map(exercise => exercise._id).indexOf(exerciseId);
            const originalExercise = {
                _id: user.exercises[updateIndex]._id,
                name: user.exercises[updateIndex].name
            };
            
            user.exercises[updateIndex].name = exerciseName;
            user.save()
                .then((user) => {
                    return res.status(200).json({
                        message: 'Update Exercise: Success.',
                        originalExercise: originalExercise,
                        updatedExercise: user.exercises[updateIndex],
                        exercises: user.exercises
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


router.delete('/:exerciseId', authorise, (req, res) => {
    const username = req.params.username;
    const exerciseId = req.params.exerciseId;

    User.findOne({ 'username': username })
        .exec()
        .then((user) => {

            if (!user) {
                return res.status(400).json({
                    message: `Delete Exercise: Cannot find user ${username}.`
                });
            }
            if (!user.exercises.map(exercise => exercise._id).includes(exerciseId)) {
                return res.status(400).json({
                    message: `Delete Exercise: exerciseId ${exerciseId} does not exist.`
                });
            }

            const deleteIndex = user.exercises.map(exercise => exercise._id).indexOf(exerciseId);
            const deletedExercise = user.exercises[deleteIndex];
            user.exercises.splice(deleteIndex, 1);

            user.save()
                .then((user) => {
                    return res.status(200).json({
                        message: 'Delete Exercise: Success.',
                        deletedExercise: deletedExercise,
                        exercises: user.exercises
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