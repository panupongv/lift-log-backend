const supertest = require('supertest');
const sinon = require('sinon');

const dbHandler = require('./db-handler');
const User = require('../models/user').User;
const Exercise = require('../models/user').Exercise;
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

const assertExerciseListEqualsNameList = (exercises, expectedNames) => {
    const exerciseNames = exercises.map((exercise) => exercise.name);
    expect(exerciseNames.sort()).toEqual(expectedNames.sort());
};

describe('GET /api/:username/exercises', () => {

    const routeTemplate = '/api/:username/exercises';

    describe('given a username with existing user record', () => {
        it('should return 200 - OK along with the exercise list of the user', async () => {
            const username = 'username';
            const password = 'password';
            const exerciseNames = ['exe1', 'exe2'];
            const exercises = exerciseNames.map(exerciseName => new Exercise({ name: exerciseName }));
            const user = new User({
                username: username,
                password: password,
                exercises: exercises
            });
            await user.save();

            const expectedResponse = {
                message: 'Get Exercises: Success',
                exerciseNames: exerciseNames
            }

            const response = await supertest(app)
                .get(routeTemplate.replace(':username', username))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(200);
            expect(responseBody.message).toMatch(expectedResponse.message);
            assertExerciseListEqualsNameList(responseBody.exercises, expectedResponse.exerciseNames);
        });
    });

    describe('given a username without existing user record', () => {
        it('should return 404 - Not Found without any exercises', async () => {
            const username = 'username';

            const expectedResponse = {
                message: `Get Exercises: User ${username} not found`,
            }

            const response = await supertest(app)
                .get(routeTemplate.replace(':username', username))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(404);
            expect(responseBody.message).toMatch(expectedResponse.message);
            expect(responseBody.exercises).toBeUndefined();
        });
    });
});


describe('POST /api/:username/exercises', () => {

    const routeTemplate = '/api/:username/exercises';

    describe('given a valid user and an exercise that is yet to exist', () => {
        it('should return 201 - Created with the new exercise and the list of exercises', async () => {
            const username = 'username';
            const password = 'password';
            const exerciseNames = ['exe1', 'exe2'];
            const exercises = exerciseNames.map(exerciseName => new Exercise({ name: exerciseName }));
            const user = new User({
                username: username,
                password: password,
                exercises: exercises
            });
            await user.save();

            const newExerciseName = 'exe3';
            const requestBody = { exerciseName: newExerciseName };

            const expectedResponse = {
                createdExerciseName: newExerciseName,
                exerciseNames: [...exerciseNames, newExerciseName]
            };

            const response = await supertest(app)
                .post(routeTemplate.replace(':username', username))
                .send(requestBody);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(201);
            expect(responseBody.createdExercise.name).toMatch(expectedResponse.createdExerciseName);
            assertExerciseListEqualsNameList(responseBody.exercises, expectedResponse.exerciseNames);
        });
    });

    describe('given no exercise name in the request body', () => {
        it('should return 400 - Bad request with just an info message (no exercise name)', async () => {
            const expectedResponse = {
                message: 'Create Exercise: Please provide an exercise name'
            };

            const response = await supertest(app)
                .post(routeTemplate.replace(':username', 'username does not matter'))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toMatch(expectedResponse.message);
            expect(responseBody.exercises).toBeUndefined();
            expect(responseBody.createdExercise).toBeUndefined();
        });
    });

    describe('given a username without a user record', () => {
        it('should return 400 - Bad request with just an info message (cannot find user)', async () => {
            const username = 'username';
            const requestBody = {
                exerciseName: 'exe0'
            }

            const expectedResponse = {
                message: `Create Exercise: Cannot find user ${username}`
            }

            const response = await supertest(app)
                .post(routeTemplate.replace(':username', username))
                .send(requestBody);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toMatch(expectedResponse.message);
            expect(responseBody.exercises).toBeUndefined();
            expect(responseBody.createdExercise).toBeUndefined();
        });
    });

    describe('given a valid username but the exercise name is a duplicate', () => {
        it('should return 400 - Bad request with just an info message (exercise already exist)', async () => {
            const username = 'username';
            const password = 'password';
            const exerciseNames = ['exe1', 'exe2'];
            const exercises = exerciseNames.map(exerciseName => new Exercise({ name: exerciseName }));
            const user = new User({
                username: username,
                password: password,
                exercises: exercises
            });
            await user.save();

            const newExerciseName = exerciseNames[0];
            const requestBody = { exerciseName: newExerciseName };

            const expectedResponse = {
                message: `Create Exercise: exercise ${newExerciseName} already exist`
            };

            const response = await supertest(app)
                .post(routeTemplate.replace(':username', username))
                .send(requestBody);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toMatch(expectedResponse.message);
        });
    });
});