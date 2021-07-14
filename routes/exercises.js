const express = require("express");
const { User, ExerciseSchema } = require("../models/User");
const router = express.Router({ mergeParams: true });

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

router.get('/', (req, res) => {
    const username = req.params.username;
    User.find({
        'username': username,
    }).then((result) => {
        if (result.length > 0) {
            const user = result[0];
            console.log(user);
            if (user._id.toString() !== req.header('userId')) {
                res.status(500).send(`Get Exercise: Not allowed to access User ${username}`);
                return;
            }
            res.status(200).send(user.exercises);
            return;
        }
        res.status(404).send(`Get Exercise: User ${username} not found`);
    }).catch((err) => {
        console.log(err);
        res.send(err);
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