const express = require('express');

const authRoutes = require('./routes/authentication');
const exercisesRoute = require('./routes/exercises');

const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/:username/exercises', exercisesRoute);


module.exports = app;