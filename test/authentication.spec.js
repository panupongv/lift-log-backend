const supertest = require('supertest');
const dbHandler = require('./db-handler');

const app = require('../app');
const User = require('../models/user').User;

const hashPassword = require('./test-utils').hashPassword;

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('POST /auth/signup', () => {

    describe('given a valid signup request with username and password', () => {
        it('should return a 201 - Created response and create a user record on the database', async () => {
            const requestBody = {
                username: 'username',
                password: 'password'
            };
            const expectedMessage = { message: `Signup: Record for user "${requestBody.username}" created.` };

            const response = await supertest(app).post('/api/auth/signup').send(requestBody);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.text)).toMatchObject(expectedMessage);

            User.find().then((users) => {
                expect(users.length).toBe(1);
                expect(users[0].username).toEqual(requestBody.username);
            });
        });
    })

    describe('given a signup request with missing username or password', () => {
        it('should return a 400 - Bad Request response with an error message (missing parameters) and create no records', async () => {
            const expectedMessage = { message: `Signup: Please provide a valid username and password.` };

            const noUsernameResponse = await supertest(app).post('/api/auth/signup').send({ password: 'password' });
            expect(noUsernameResponse.statusCode).toBe(400);
            expect(JSON.parse(noUsernameResponse.text)).toMatchObject(expectedMessage);

            const noPasswordResponse = await supertest(app).post('/api/auth/signup').send({ username: 'åusername' });
            expect(noPasswordResponse.statusCode).toBe(400);
            expect(JSON.parse(noPasswordResponse.text)).toMatchObject(expectedMessage);

            User.find().then((users) => {
                expect(users.length).toBe(0);
            });
        });
    });

    describe('given a signup request with usernames too long and too short', () => {
        it('should return a 400 - Bad Request response with an error message (username length) and create no records', async () => {
            const expectedResponse = { message: `Signup: Username length must be between 4 and 20.` };

            const responseUsernameTooShort = await supertest(app)
                .post('/api/auth/signup')
                .send({
                    username: 'xx',
                    password: 'password'
                });
            expect(responseUsernameTooShort.statusCode).toBe(400);
            expect(JSON.parse(responseUsernameTooShort.text).message).toEqual(expectedResponse.message);

            const responseUsernameTooLong = await supertest(app)
                .post('/api/auth/signup')
                .send({
                    username: 'xxxxx_xxxxx_xxxxx_xxxxx',
                    password: 'password'
                });
            expect(responseUsernameTooLong.statusCode).toBe(400);
            expect(JSON.parse(responseUsernameTooLong.text).message).toEqual(expectedResponse.message);

            User.find().then((users) => {
                expect(users.length).toBe(0);
            });
        });
    });

    describe('given a username containing invalid character(s)', () => {
        it('should return a 400 - Bad Request response with an error message (invalid characters) and create no records', async () => {
            const expectedResponse = {message: `Signup: Username can only contain alphanumerical characters and underscore.` };
            
            const response = await supertest(app)
                .post('/api/auth/signup')
                .send({
                    username: 'xxxxx!$%#@/',
                    password: 'password'
                });
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.text).message).toEqual(expectedResponse.message);

            User.find().then((users) => {
                expect(users.length).toBe(0);
            });
        });
    });

    describe('given a signup request with a username that already exists', () => {
        it('should return a 409 - Conflict response and create no records', async () => {
            const username = 'username';
            const password = 'password';

            const mockUser = new User({
                username: username,
                password: 'password'
            });
            await mockUser.save();

            const expectedMessage = { message: `Signup: Username ${mockUser.username} already exist.` };

            const response = await supertest(app).post('/api/auth/signup').send({
                username: username,
                password: password
            });
            expect(response.status).toBe(409);
            expect(JSON.parse(response.text)).toMatchObject(expectedMessage);

            User.find().then((users) => {
                expect(users.length).toBe(1);
            })
        });
    });
});

describe('POST /auth/login', () => {
    describe('given a login request with an existing username and a matching password', () => {

        it('should return a 200 - OK response along with a signed JWT Token', async () => {
            process.env.JWT_SECRET = 'temp-key-for-testing';

            const expectedMessage = { message: 'Login: Authentication successful.' };

            const username = 'username';
            const password = 'password';
            const hash = await hashPassword(password);
            const mockUser = new User({
                username: username,
                password: hash
            });
            await mockUser.save();

            const response = await supertest(app).post('/api/auth/login').send({
                username: username,
                password: password
            });
            const responseBody = JSON.parse(response.text);

            expect(response.status).toBe(200);
            expect(responseBody.token).toBeDefined();
            expect(responseBody.message).toEqual(expectedMessage.message);
        });
    });

    describe('given a login request with an existing username but an invalid password', () => {
        it('should return a 401 - Authentication failed with no token attached to the response', async () => {
            const expectedMessage = { message: 'Login: Authentication failed.' };

            const username = 'username';
            const password = 'password';
            const invalidPassword = 'invalid-password'
            const hash = await hashPassword(password);
            const mockUser = new User({
                username: username,
                password: hash
            });
            await mockUser.save();

            const response = await supertest(app).post('/api/auth/login').send({
                username: username,
                password: invalidPassword
            });
            const responseBody = JSON.parse(response.text);

            expect(response.status).toBe(401);
            expect(responseBody.token).toBeUndefined();
            expect(responseBody.message).toEqual(expectedMessage.message);
        });
    });

    describe('given a login request with missing username or password', () => {
        it('should return a 400 - Bad Request with no token attached to the response', async () => {
            const expectedMessage = { message: 'Login: Please provide a valid username and password.' };

            const noUsernameResponse = await supertest(app).post('/api/auth/login').send({ password: 'password' });
            const noUsernameResponseBody = JSON.parse(noUsernameResponse.text);
            expect(noUsernameResponse.statusCode).toBe(400);
            expect(noUsernameResponseBody.token).toBeUndefined();
            expect(noUsernameResponseBody.message).toEqual(expectedMessage.message);

            const noPasswordResponse = await supertest(app).post('/api/auth/login').send({ username: 'username' });
            const noPasswordResponseBody = JSON.parse(noPasswordResponse.text);
            expect(noPasswordResponse.statusCode).toBe(400);
            expect(noPasswordResponseBody.token).toBeUndefined();
            expect(noPasswordResponseBody.message).toEqual(expectedMessage.message);
        });
    });

    describe('given a login request with a username that does not exist on the database', () => {
        it('should receive a 404 - Not found with no token attached to the response', async () => {
            const username = 'username';
            const password = 'password';

            const expectedMessage = { message: `Login: Cannot find user ${username}.` };

            const response = await supertest(app).post('/api/auth/login').send({
                username: username,
                password: password
            });
            const responseBody = JSON.parse(response.text);
            expect(response.status).toBe(404);
            expect(responseBody.token).toBeUndefined();
            expect(responseBody.message).toEqual(expectedMessage.message);
        });
    });
});