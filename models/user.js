const mongoose = require('mongoose');

const exerciseSchema = mongoose.Schema({
    name: { type: String, require: true }
});

const userSchema = mongoose.Schema({
    username: { type: String, require: true, unique: true },
    password: { type: String, require: true },
    exercises: { type: [exerciseSchema], default: [] },
    sessions: { type: [], default: [] },
});

module.exports = mongoose.model('User', userSchema);