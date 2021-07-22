const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    username: { type: String, require: true, unique: true },
    password: { type: String, require: true },
    exercises: { type: [], default: [] },
    sessions: { type: [], default: [] },
});

module.exports = mongoose.model('User', userSchema);