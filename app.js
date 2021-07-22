require('dotenv/config');

const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();


const authRoutes = require('./routes/authentication');
const exercisesRoute = require('./routes/exercises');


const app = express();
const PORT = process.env.PORT || 7317;

app.use('/api/auth', authRoutes);
app.use('/api/:username/exercises', exercisesRoute);

mongoose.connect(
    process.env.DB_CONNECTION,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    },
).then(() => {
    console.log('Connected to Mongoo');
    app.listen(PORT, () => {
        console.log(`Lift Log Backend running of PORT ${PORT}`);
    });
});
