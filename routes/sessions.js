const express = require("express");
const router = express.Router({ mergeParams: true });

const authorise = require('./authorisation').authorise;

const User = require("../models/user").User;
const Session = require("../models/user").Session;


const isValidStartLimit = (stringValue) => {
    return !isNaN(stringValue) &&
        Number.isInteger(parseFloat(stringValue)) &&
        parseFloat(stringValue) >= 0;
};

const isValidDateFormat = (dateString) => {
    var regEx = /^\d{4}-\d{2}-\d{2}Z$/;
    return dateString.match(regEx) !== null;
};


router.get('/', authorise, (req, res) => {
    const username = req.params.username;
    const start = req.query.start ? req.query.start : '0';
    const limit = req.query.limit;

    if (!limit) {
        return res.status(400).json({
            message: `Get Sessions: Missing the parameter limit.`
        });
    }

    if (!isValidStartLimit(start) || !isValidStartLimit(limit)) {
        return res.status(400).json({
            message: `Get Sessions: Please provide 'start' and 'limit' as integers.`
        });
    }

    const startInt = parseInt(start);
    const limitInt = parseInt(limit);

    User.findOne({ username: username })
        .then((user) => {
            if (!user) {
                return res.status(400).json({
                    message: `Get Sessions: User ${username} not found.`
                });
            }

            User.aggregate([
                { $match: { username: username } },
                { $project: { username: 1, sessions: { name: 1, date: 1, location: 1 } } },
                { $unwind: '$sessions' },
                { $sort: { 'sessions.date': -1 } },
                { $skip: startInt },
                { $limit: limitInt },
                { $group: { _id: '$username', sessions: { $push: '$sessions' } } },
            ])
                .then((result) => {
                    const sessions = (result && result.length) ? result[0].sessions : [];
                    return res.status(200).json({
                        messsage: `Get Sessions: Success.`,
                        sessions: sessions
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


router.get('/dates', authorise, (req, res) => {
    const username = req.params.username;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (!startDate || !endDate) {
        return res.status(400).json({
            message: `Get Sessions by Date: Missing query parameter(s).`
        });
    }

    if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
        return res.status(400).json({
            message: `Get Sessions by Date: Invalid date format(s).`
        });
    }

    User.findOne({ username: username })
        .then((user) => {
            if (!user) {
                return res.status(400).json({
                    message: `Get Sessions by Date: User ${username} not found.`
                });
            }

            User.aggregate([
                { $match: { username: username } },
                { $project: { username: 1, sessions: { name: 1, date: 1, location: 1 } } },
                { $unwind: '$sessions' },
                { $match: { 'sessions.date': { $gte: new Date(startDate), $lte: new Date(endDate) } } },
                { $sort: { 'sessions.date': 1 } },
                { $group: { _id: '$username', sessions: { $push: '$sessions' } } },
            ]).then((result) => {
                const sessions = (result && result.length) ? result[0].sessions : [];
                return res.status(200).json({
                    message: 'Get Sessions by Date: Success.',
                    sessions: sessions
                });
            }).catch((err) => {
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


router.post('/', authorise, (req, res) => {
    const username = req.params.username;
    const name = req.body.name;
    const date = req.body.date;
    const location = req.body.location ? req.body.location : '';

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
    if (!isValidDateFormat(date)) {
        return res.status(400).json({
            message: `Create Session: invalid date format.`
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


router.put('/:sessionId', authorise, (req, res) => {
    const username = req.params.username;
    const sessionId = req.params.sessionId;
    const newName = req.body.name;
    const newDate = req.body.date;
    const newLocation = req.body.location;

    if (!newName && !newDate && !newLocation) {
        return res.status(400).json({
            message: `Update Session: No fields to update.`
        });
    }

    if (newDate && !isValidDateFormat(newDate)) {
        return res.status(400).json({
            message: `Update Session: Invalid date format.`
        });
    }

    User.findOne({ username: username })
        .then((user) => {
            if (!user) {
                return res.status(400).json({
                    message: `Update Session: User ${username} not found.`
                });
            }

            const fieldsToUpdate = {};

            if (newName) fieldsToUpdate['sessions.$.name'] = newName;
            if (newDate) fieldsToUpdate['sessions.$.date'] = newDate;
            if (newLocation) fieldsToUpdate['sessions.$.location'] = newLocation;

            User.findOneAndUpdate({ username: username, 'sessions._id': sessionId }, fieldsToUpdate, { new: true })
                .then((result) => {
                    if (!result) {
                        return res.status(400).json({
                            message: `Update Session: Session ${sessionId} not found.`
                        });
                    }

                    const updatedSession = result.sessions.find((session) => session._id.equals(sessionId));
                    return res.status(200).json({
                        message: `Update Session: Success.`,
                        updatedSession: updatedSession,
                    });
                });
        });
});


router.delete('/:sessionId', authorise, (req, res) => {
    const username = req.params.username;
    const sessionId = req.params.sessionId;

    User.findOne(
        { username: username },
        )
        .then((user) => {
            if (!user) {
                return res.status(400).json({
                    message: `Delete Session: User ${username} not found.`
                });
            }

            const deleteIndex = user.sessions.findIndex((session) => session._id.equals(sessionId));

            if (deleteIndex === -1) {
                return res.status(400).json({
                    message: `Delete Session: Session ${sessionId} not found.`
                });
            }

            const deletedSession = user.sessions[deleteIndex];
            user.sessions.pull(sessionId);
            user.save();
            return res.status(200).json({
                message: 'Delete Session: Success.',
                deletedSession: deletedSession
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
