const mongoose = require('mongoose');

const ExerciseSchema = mongoose.Schema({
    name: {
        type: String,
        require: true,
    },
});

const UserSchema = mongoose.Schema({
    exercises: {
        type: [ExerciseSchema],
        default: [],
    }
});

module.exports.User = mongoose.model('User', UserSchema)
module.exports.ExerciseSchema = mongoose.model('Exercise', ExerciseSchema);