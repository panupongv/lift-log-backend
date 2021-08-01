
require('dotenv/config');

const jwt = require("jsonwebtoken");
const supertest = require('supertest');

const app = require('../app');
const dbHandler = require('./db-handler');

const authorise = require('../routes/authorisation');


beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Authorisation Middleware', () => {

    process.env.JWT_SECRET = 'bypass-key';

    const username = 'username';
    const usernameWithNoPermission = 'another-user'

    const mockRouteTemplate = '/api/:username/mockRoute';
    const mockRouteValidUser = mockRouteTemplate.replace(':username', username);
    const mockRouteInvalidUser = mockRouteTemplate.replace(':username', usernameWithNoPermission);

    const validStatusCode = 200;
    const validResponse = { message: 'OK' };

    app.get(mockRouteTemplate, authorise(), (req, res) => {
        res.status(validStatusCode).json(validResponse);
    });

    describe('given a valid authorisation token that matches the target username in params', () => {

        it(`should proceed to the 'next()' method (which returns ${validStatusCode} and ${JSON.stringify(validResponse)})`, async () => {
            const validPayload = { username: username };
            const validToken = jwt.sign(validPayload, process.env.JWT_SECRET);
            const response = await supertest(app)
                .get(mockRouteValidUser)
                .set('authorization', `Bearer ${validToken}`)
                .send();

            expect(response.statusCode).toBe(validStatusCode);
            expect(JSON.parse(response.text)).toMatchObject(validResponse);
        });
    });

    describe('given no authorisation token', () => {
        it('should return a 401 - Unauthorised response (missing token)', async () => {
            const expectedMessage = { message: 'Access denied: missing authorisation token.' };
            
            const response = await supertest(app).get(mockRouteValidUser).send();

            expect(response.statusCode).toBe(401);
            expect(JSON.parse(response.text)).toMatchObject(expectedMessage);
        });
    });

    describe('given an invalid authorisation token', () => {
        it('should return a 401 - Unauthorised response (unable to verify token)', async () => {
            const expectedMessage = { message: 'Access denied: unable to verify token.' };
            
            const response = await supertest(app)
                .get(mockRouteValidUser)
                .set('authorization', `Some made up invalid token invalid`)
                .send();

            expect(response.statusCode).toBe(401);
            expect(JSON.parse(response.text)).toMatchObject(expectedMessage);
        });
    });

    describe('given a valid authorisation token but on a route with unmatching username', () => {
        it('should return a 401 - Unauthorised response', async () => {
            const payload = { username: username };
            const token = jwt.sign(payload, process.env.JWT_SECRET);
            const expectedMessage = { message: `Access denied: token does not grant access to ${usernameWithNoPermission}.` };
            
            const response = await supertest(app)
                .get(mockRouteInvalidUser)
                .set('authorization', `Bearer ${token}`)
                .send();

            expect(response.statusCode).toBe(401);
            expect(JSON.parse(response.text)).toMatchObject(expectedMessage);
        });
    });

});