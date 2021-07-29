
//const dotenv = require('dotenv');
require('dotenv/config');
const path = require('path');

const jwt = require("jsonwebtoken");
const supertest = require('supertest');

const app = require('../app');
const dbHandler = require('./db-handler');

const User = require('../models/user').User;
const authorise = require('../routes/authorisation');

//dotenv.config({ path: path.resolve(__dirname, `../.env.${process.env.ENVIRONMENT}`) });

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Authorisation Middleware', () => {

    const validStatusCode = 200;

    const username = 'username';
    const jwtKey = process.env.JWT_SECRET = 'bypass-key';

    const mockRouteTemplate = '/api/:username/mockRoute';
    const mockRoute = mockRouteTemplate.replace(':username', username);

    console.log(`key: ${process.env.JWT_SECRET}`);
    console.log(`route: ${mockRoute}`);

    app.get(mockRouteTemplate, authorise(), (req, res) => {
        console.log(`username: ${req.params.username}`);
        res.status(validStatusCode).json({ message: 'OK' });
    });

    describe('given a valid authorisation token that matches the target username in params', () => {
        it(`should proceed to the 'next()' method (which returns ${validStatusCode})`, async () => {
            const validPayload = { username: username };
            const validToken = jwt.sign(validPayload, process.env.JWT_SECRET);
            const response = await supertest(app)
                .get(mockRoute)
                .set('authorization', `Bearer ${validToken}`)
                .send({});
            console.log(`res: ${JSON.stringify(response)}`);
            expect(response.statusCode).toBe(validStatusCode);
        });
    });

    describe('given no authorisation token', () => {
        it('should return a 401 - Unauthorised response', async () => {
            const response = await supertest(app).get(mockRoute).send({});
            expect(response.statusCode).toBe(401);
        });
    });

    describe('given an invalid authorisation token', () => {
        it('should return a 401 - Unauthorised response', async () => {
            
        });
    });

    describe('given a valid authorisation token but on a route with unmatching username', () => {
        it('should return a 401 - Unauthorised response', async () => {
            
        });
    });

});