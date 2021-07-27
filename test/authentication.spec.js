const mongoose = require('mongoose');

const dbHandler = require('./db-handler');

const User = require('../models/user').User;


beforeAll(async () => await dbHandler.connect());

//afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => await dbHandler.closeDatabase());

describe('User Authentication', () => {

    it('can be created correctly', async () => {
        expect(async () => {
            const user = new User({
                username: '1234',
                password: 'hashed-secure-password'
            })

            user.save()
                .then((user) => {
                    console.log(`Inserted: ${user}`);
                    User.find()
                        .then((users) => {
                            console.log(`DB content: ${users}.`);
                        });
                })


        })
            .not
            .toThrow();
    });
});