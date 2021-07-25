const express = require("express");
const router = express.Router({ mergeParams: true });

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const authorise = require('./authorisation');

const User = require("../models/user").User;
const Exercise = require("../models/user").Exercise;

router.get('/', authorise(), (req, res) => {
    const username = req.params.username;
    User.findOne({
        'username': username,
    }).then((user) => {
        if (user) {
            return res.status(200).json({ exercises: user.exercises });
        }
        res.status(404).json({ message: `Get Exercise: User ${username} not found` });
    }).catch((err) => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    });
});


router.post('/', [authorise(), jsonParser], (req, res) => {
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
                    message: `Create Exercise: Please specify user`
                })
            }
            if (user.exercises.some(exercise => exercise.name === exerciseName)) {
                return res.status(400).json({
                    message: `Create Exercise: exercise ${exerciseName} already exist`
                });
            }

            user.exercises.push(new Exercise({ name: exerciseName }));
            user.save()
                .then((user) => {
                    return res.status(201).json({
                        exercises: user.exercises
                    });
                })
                .catch((err) => {
                    return res.status(500).json({
                        error: err
                    });
                });
        })
        .catch((err) => {
            return res.status(500).json({
                error: err
            });
        });
});

module.exports = router;