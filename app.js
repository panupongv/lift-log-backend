const express = require('express');

const authRoutes = require('./routes/authentication');
const exercisesRoute = require('./routes/exercises');
const sessionsRoute = require('./routes/sessions');
const workoutsRoute = require('./routes/sessions-workouts');

const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/:username/exercises', exercisesRoute);
app.use('/api/:username/sessions', sessionsRoute);
app.use('/api/:username/sessions', workoutsRoute);

module.exports = app;