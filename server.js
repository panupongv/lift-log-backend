require('dotenv/config');
const mongoose = require('mongoose');

const app = require('./app');
const PORT = process.env.PORT || 7317;

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