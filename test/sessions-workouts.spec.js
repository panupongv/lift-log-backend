const supertest = require('supertest');
const sinon = require('sinon');

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
            const workoutContent = '54kgx10;54kgx10;54kgx10;54kgx10;';

            const expectedResponse = {
                message: "Create Workout: Success.",
                createdWorkout: {
                    exerciseId: exerciseId,
                    content: workoutContent
                }
            }

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
            .then((results)=>{
                console.log(`after insert results: ${results}`)
                expectWorkoutsEqual(results[0].sessions[0].workouts[0], expectedResponse.createdWorkout);
            })
        });
    });
});