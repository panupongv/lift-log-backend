const supertest = require('supertest');
const sinon = require('sinon');

const dbHandler = require('./db-handler');
const { User, Session } = require('../models/user');
const authorisation = require('../routes/authorisation');

let app;
let authorisationStub;

beforeAll(async () => {
    await dbHandler.connect();

    authorisationStub = sinon.stub(authorisation, 'authorise');

    app = require('../app');
});

beforeEach(() => {
    authorisationStub.callsArg(2);
});

afterEach(async () => {
    await dbHandler.clearDatabase();

    sinon.assert.calledOnce(authorisationStub);
    authorisationStub.reset();
});

afterAll(async () => await dbHandler.closeDatabase());


const expectDateStringsEqual = (expected, received) => {
    const expectDate = new Date(expected);
    const receivedDate = new Date(received);

    expect(receivedDate.getDate()).toBe(expectDate.getDate());
    expect(receivedDate.getMonth()).toBe(expectDate.getMonth());
    expect(receivedDate.getFullYear()).toBe(expectDate.getFullYear());
}


describe('POST /api/:username/sessions', () => {

    const routeTemplate = '/api/:username/sessions';

    describe('given a valid username with complete request body', () => {
        it('should create the record on database then return 201 - Create along with the record', async () => {
            const username = 'test_username';
            const password = 'test_password';
            const user = new User({
                username: username,
                password: password
            });
            await user.save();

            const sessionName = 'session-name';
            const date = '2021-07-01Z';
            const location = 'session-location';

            const requestBody = {
                name: sessionName,
                date: date,
                location: location
            };

            const expectedResponse = {
                message: 'Create Session: Success.',
                createdSession: requestBody
            };

            const response = await supertest(app)
                .post(routeTemplate.replace(':username', username))
                .send(requestBody);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(201);
            expect(responseBody.createdSession.name).toEqual(expectedResponse.createdSession.name);
            expect(responseBody.createdSession.location).toEqual(expectedResponse.createdSession.location);
            expectDateStringsEqual(responseBody.createdSession.date, expectedResponse.createdSession.date);

            User.find({
                $and: [
                    { username: username },
                    {
                        sessions:
                        {
                            $elemMatch: {
                                name: sessionName,
                                date: date,
                                location: location
                            }
                        }
                    }
                ]
            })
                .then((users) => {
                    expect(users.length).toBe(1);
                    expect(users[0].sessions.length).toBe(1);
                });
        });
    });

    describe('given a username with no user record', () => {
        it('should return 400 - Bad request, an error message and no objects', async () => {
            const username = 'test_username';

            const sessionName = 'session-name';
            const date = '2021-07-01Z';
            const location = 'session-location';

            const requestBody = {
                name: sessionName,
                date: date,
                location: location
            };

            const expectedResponse = {
                message: `Create Session: Username ${username} not found.`
            };

            const response = await supertest(app)
                .post(routeTemplate.replace(':username', username))
                .send(requestBody);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.createdSession).toBeUndefined();
        });
    });

    describe('given a valid username but with incomplete request body', () => {
        it('should return 400 - Bad request, an error message and no objects', async () => {
            const username = 'test_username';
            const password = 'test_password';
            const user = new User({
                username: username,
                password: password
            });
            await user.save();

            const expectedNoNameResponse = {
                message: `Create Session: Missing body parameter 'name'.`
            };
            const requestBodyWithoutName = {
                date: '2021-07-01Z'
            }
            const responseWithoutName = await supertest(app)
                .post(routeTemplate.replace(':username', username))
                .send(requestBodyWithoutName);
            const responseWithoutNameBody = JSON.parse(responseWithoutName.text);

            expect(responseWithoutName.statusCode).toBe(400);
            expect(responseWithoutNameBody.message).toEqual(expectedNoNameResponse.message);

            sinon.assert.calledOnce(authorisationStub);
            authorisationStub.reset();
            authorisationStub.callsArg(2);

            const expectedNoDateResponse = {
                message: `Create Session: Missing body parameter 'date'.`
            };
            const requestBodyWithoutDate = {
                name: 'session-name'
            }
            const responseWithoutDate = await supertest(app)
                .post(routeTemplate.replace(':username', username))
                .send(requestBodyWithoutDate);
            const responseWithoutDateBody = JSON.parse(responseWithoutDate.text);

            expect(responseWithoutDate.statusCode).toBe(400);
            expect(responseWithoutDateBody.message).toEqual(expectedNoDateResponse.message);
        });
    });

    //describe('', () => {
    //    it('', async () => {

    //    });
    //});
});