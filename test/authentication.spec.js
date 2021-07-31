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
        test('should return a 201 - Created response and create a user record on the database', async () => {
            const requestBody = {
                username: 'username',
                password: 'password'
            };
            const expectedMessage = { message: `Record for user "${requestBody.username}" created.` };

            const response = await supertest(app).post('/api/auth/signup').send(requestBody);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.text)).toMatchObject(expectedMessage);

            User.find().then((users) => {
                expect(users.length).toBe(1);
                expect(users[0].username).toMatch(requestBody.username);
            });
        });
    })

    describe('given a signup request with missing username or password', () => {
        test('should return a 400 - Bad Request response and create no records', async () => {
            const expectedMessage = { message: `Signup: Please provide a valid username and password` };

            const noUsernameResponse = await supertest(app).post('/api/auth/signup').send({ password: 'password' });
            expect(noUsernameResponse.statusCode).toBe(400);
            expect(JSON.parse(noUsernameResponse.text)).toMatchObject(expectedMessage);
            
            const noPasswordResponse = await supertest(app).post('/api/auth/signup').send({ username: 'åusername' });
            expect(noPasswordResponse.statusCode).toBe(400);
            expect(JSON.parse(noPasswordResponse.text)).toMatchObject(expectedMessage);
            
            User.find().then((users) => {
                console.log(`Database Content: ${users}`);
                expect(users.length).toBe(0);
            });
        });
    });

    describe('given a signup request with a username that already exists', () => {
        test('should receive a 409 - Conflict response and create no records', async () => {
            const username = 'username';
            const password = 'password';

            const mockUser = new User({
                username: username,
                password: 'password'
            });
            await mockUser.save();

            const expectedMessage = { message: `Username ${mockUser.username} already exist.` };

            const response = await supertest(app).post('/api/auth/signup').send({
                username: username,
                password: password
            });
            expect(response.status).toBe(409);
            expect(JSON.parse(response.text)).toMatchObject(expectedMessage);

            User.find().then((users) => {
                console.log(`Database Content: ${users}`);
                expect(users.length).toBe(1);
            })
        });
    });
});

describe('POST /auth/login', () => {
    describe('given a login request with an existing username and a matching password', () => {
        test('should return a 200 - OK response along with a signed JWT Token', async () => {
            const username = 'username';
            const password = 'password';
            const hash = await hashPassword(password);
            const mockUser = new User({
                username: username,
                password: hash
            });
            await mockUser.save();

            const expectedMessage = { message: 'Authentication successful' };

            const response = await supertest(app).post('/api/auth/login').send({
                username: username,
                password: password
            });
            const responseBody = JSON.parse(response.text);
            
            expect(response.status).toBe(200);            
            expect(responseBody.token).toBeDefined();
            expect(responseBody.message).toMatch(expectedMessage.message);
        });
    });

    describe('given a login request with an existing username and an invalid password', () => {
        test('should return a 401 - Authentication failed without token attached', async () => {
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
            expect(response.status).toBe(401);

            const responseBody = JSON.parse(response.text);
            expect(responseBody.token).toBeUndefined();
        });
    });

    describe('given a login request with missing username or password', () => {
        test('should return a 400 - Bad Request response and create no records', async () => {

            const noUsernameResponse = await supertest(app).post('/api/auth/login').send({ password: 'password' });
            expect(noUsernameResponse.statusCode).toBe(400);

            const noPasswordResponse = await supertest(app).post('/api/auth/login').send({ username: 'username' });
            expect(noPasswordResponse.statusCode).toBe(400);

            User.find().then((users) => {
                expect(users.length).toBe(0);
            })
        });
    });

    describe('given a login request with a username that does not exist on the database', () => {
        test('should receive a 404 - Not found response', async () => {

            const username = 'username';
            const password = 'password';

            const response = await supertest(app).post('/api/auth/login').send({
                username: username,
                password: password
            });
            expect(response.status).toBe(404);

        });
    });
});