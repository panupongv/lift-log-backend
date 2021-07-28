const supertest = require('supertest');

const mongoose = require('mongoose');

const dbHandler = require('./db-handler');

const app = require('../app');
const User = require('../models/user').User;
const { TestWatcher } = require('jest');


beforeAll(async () => await dbHandler.connect());

//afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => await dbHandler.closeDatabase());

describe('POST /auth/signup', () => {

    describe('missing a username or a password', () => {
        test('should receive a 400 - Bad Request response', async () => {
            const noUsernameResponse = await supertest(app).post('/api/auth/signup').send({password: "password"});
            expect(noUsernameResponse.statusCode).toBe(400);

            const noPasswordResponse = await supertest(app).post('/api/auth/signup').send({username: "username"});
            expect(noPasswordResponse.statusCode).toBe(400);
        });
        
    });
});