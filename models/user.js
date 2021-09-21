const mongoose = require('mongoose');

const exerciseSchema = mongoose.Schema({
    name: { type: String, require: true }
});

const workoutSchema = mongoose.Schema({
    exerciseId: { type: mongoose.Types.ObjectId, require: true },
    content: { type: String, default: '' }
});

const sessionSchema = mongoose.Schema({
    name: { type: String, require: true },    
    date: { type: Date, require: true },
    location: { type: String, default: '' },
    workouts: { type: [workoutSchema], default: []}
});

const userSchema = mongoose.Schema({
    username: { type: String, require: true, unique: true },
    password: { type: String, require: true },
    exercises: { type: [exerciseSchema], default: [] },
    sessions: { type: [sessionSchema], default: [] },
});

module.exports.Exercise = mongoose.model('Exercise', exerciseSchema);
module.exports.Workout = mongoose.model('Workout', workoutSchema);
module.exports.Session = mongoose.model('Session', sessionSchema);
module.exports.User = mongoose.model('User', userSchema);
