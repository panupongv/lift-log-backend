const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../models/user');

const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()

router.post('/signup', jsonParser, (req, res, next) => {
    const username = req.body.username;
    User.find({ username: username })
        .exec()
        .then((user) => {
            if (user.length >= 1) {
                return res.status(409).json({
                    message: `Username ${username} already exist.`
                });
            } else {
                bcrypt.hash(req.body.password, 10, (err, hash) => {
                    if (err) {
                        console.log(err)
                        return res.status(500).json({
                            error: err
                        });
                    } else {
                        const user = new User({
                            username: username,
                            password: hash
                        });

                        user.save()
                            .then((result) => {
                                console.log(result);
                                return res.status(201).json({
                                    message: `Record for user "${username}" created.`
                                })
                            })
                            .catch((err) => {
                                console.log(err);
                                return res.status(500).json({
                                    error: err
                                });
                            });
                    }
                });
            }
        });
});

route.post('/login', (req, res, next) => {
    const username = req.body.username
    User.find({ username: username })
        .exec()
        .then((user) => {
            if (user.length < 1) {
                return res.status(404).json({
                    message: `Cannot find user ${username}`
                });
            }
            bcrypt.compare(req.body.password, user[0].password, (err, checkResult) => {
                if (err) {
                    return res.status(401).json({
                        message: 'Authentication failed'
                    });
                }
                if (checkResult) {
                    return res.status(200).json({
                        message: 'Auth successful'
                    });
                }
                return res.status(401).json({
                    message: 'Authentication failed'
                });
            });
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({
                error: err
            });
        });

    module.exports = router;