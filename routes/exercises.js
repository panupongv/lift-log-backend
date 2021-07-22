const express = require("express");
const User = require("../models/user");
const router = express.Router({ mergeParams: true });

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const authorise = require('./authorisation');

router.get('/', authorise(), (req, res) => {
    const username = req.params.username;
    User.findOne({
        'username': username,
    }).then((user) => {
        if (user) {
            return res.status(200).send(user.exercises);
        }
        res.status(404).send(`Get Exercise: User ${username} not found`);
    }).catch((err) => {
        console.log(err);
        return res.status(500).json({
            error: err
        })
    });
});

// router.post('/', jsonParser, (req, res) => {
//     const username = req.params.username;
//     const exerciseName = req.body.exerciseName;

//     if (!exerciseName) {
//         res.status(400).send(`Create Exercise: Please specify the exercise name`);
//         return;
//     }

//     User.findOneAndUpdate(
//         {
//             '_id': req.header('userId'),
//             'username': username,
//         },
//         {
//             $push: {
//                 ExerciseSchema: { 'name': exerciseName }
//             }
//         });

// });

module.exports = router;