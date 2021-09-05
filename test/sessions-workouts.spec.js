const supertest = require('supertest');
const sinon = require('sinon');

const mongoose = require('mongoose');
const dbHandler = require('./db-handler');
const User = require('../models/user').User;
const Exercise = require('../models/user').Exercise;
const Workout = require('../models/user').Workout;
const Session = require('../models/user').Session;
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


const expectWorkoutsEqual = (received, expected) => {
    expect(received.exerciseId.toString()).toEqual(expected.exerciseId.toString());
    expect(received.content).toEqual(expected.content);
};





describe('POST /api/sessions/:sessionId', () => {

    const routeTemplate = '/api/:username/sessions/:sessionId';

    describe('given a valid username, sessionId and request body', () => {
        it('should create a workout under the target user and session then return a 201 - Create response with the create workout', async () => {
            const username = 'test_username';
            const password = 'test_password';

            const exercise = new Exercise({
                name: 'some-exercise'
            });
            const session = new Session({
                name: 'session-name',
                date: '2021-08-30Z'
            });

            const user = new User({
                username: username,
                password: password,
                exercises: [exercise],
                sessions: [session]
            });
            const saveResult = await user.save();
            const sessionId = saveResult.sessions[0]._id;

            const exerciseId = saveResult.exercises[0]._id;
            const workoutContent = '54x10;54x10;54x10;54x10';

            const expectedResponse = {
                message: "Create Workout: Success.",
                createdWorkout: {
                    exerciseId: exerciseId,
                    content: workoutContent
                }
            };

            const response = await supertest(app)
                .post(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId))
                .send(expectedResponse.createdWorkout);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(201);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expectWorkoutsEqual(responseBody.createdWorkout, expectedResponse.createdWorkout);

            User.find({
                username: username,
                'sessions._id': sessionId,
                'sessions.workouts._id': responseBody.createdWorkout._id
            })
                .then((results) => {
                    expect(results.length).toBe(1);
                    expect(results[0].sessions.length).toBe(1);
                    expect(results[0].sessions[0].workouts.length).toBe(1);
                    expectWorkoutsEqual(results[0].sessions[0].workouts[0], expectedResponse.createdWorkout);
                });
        });
    });

    describe('given a username without a user record', () => {
        it('should not create any record and return 400 - Bad request (no user)', async () => {
            const username = 'test_username';
            const sessionId = mongoose.Types.ObjectId();
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const expectedResponse = {
                message: `Create Workout: User ${username} not found.`
            };

            const response = await supertest(app)
                .post(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId))
                .send({
                    exerciseId: exerciseId,
                    content: content
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.createdWorkout).toBeUndefined();
        });
    });

    describe('given a valid username but a sessionId that does not exist', () => {
        it('should not create any record and return 400 - Bad request (no session)', async () => {
            const username = 'test_username';
            const password = 'test_password';
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const user = new User({
                username: username,
                password: password
            });
            await user.save();

            const sessionId = mongoose.Types.ObjectId();

            const expectedResponse = {
                message: `Create Workout: Session ${sessionId} not found.`
            };

            const response = await supertest(app)
                .post(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId))
                .send({
                    exerciseId: exerciseId,
                    content: content
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.createdWorkout).toBeUndefined();
        });
    });

    describe('given a sessionId in an invalid format', () => {
        it('should not create any record and return 400 - Bad request (invalid sessionId)', async () => {
            const username = 'test_username';
            const sessionId = 'not in valid format';
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const expectedResponse = {
                message: `Create Workout: Invalid sessionId format.`
            };

            const response = await supertest(app)
                .post(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId))
                .send({
                    exerciseId: exerciseId,
                    content: content
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.createdWorkout).toBeUndefined();
        });
    });

    describe('given a request body without an exerciseId', () => {
        it('should not create any record and return 400 - Bad request (missing exerciseId)', async () => {
            const username = 'test_username';
            const sessionId = mongoose.Types.ObjectId();

            const expectedResponse = {
                message: `Create Workout: Please provide a valid exerciseId.`
            };

            const response = await supertest(app)
                .post(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId))
                .send({ content: '40x10;40x10;40x10' });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.createdWorkout).toBeUndefined();
        });
    });

    describe('given a request body with an invalid exerciseId', () => {
        it('should not create any record and return 400 - Bad request (missing exerciseId)', async () => {
            const username = 'test_username';
            const sessionId = mongoose.Types.ObjectId();
            const exerciseId = 'not in valid format';

            const expectedResponse = {
                message: `Create Workout: Please provide a valid exerciseId.`
            };

            const response = await supertest(app)
                .post(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId))
                .send({
                    exerciseId: exerciseId,
                    content: '40x10;40x10;40x10'
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.createdWorkout).toBeUndefined();
        });
    });

    describe('given a request body with an invalid exercise content', () => {
        it('should not create any record and return 400 - Bad request (invalid exercise content)', async () => {
            const username = 'test_username';
            const sessionId = mongoose.Types.ObjectId();
            const exerciseId = mongoose.Types.ObjectId();
            const content = 'not weightxreps;weightxreps;weightxreps';

            const expectedResponse = {
                message: `Create Workout: Please provide a valid exercise content.`
            };

            const response = await supertest(app)
                .post(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId))
                .send({
                    exerciseId: exerciseId,
                    content: content
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.createdWorkout).toBeUndefined();
        });
    });
});