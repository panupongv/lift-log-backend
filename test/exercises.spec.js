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
                message: 'Get Exercises: Success.',
                exerciseNames: exerciseNames
            };

            const response = await supertest(app)
                .get(routeTemplate.replace(':username', username))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(200);
            expect(responseBody.message).toEqual(expectedResponse.message);
            assertExerciseListEqualsNameList(responseBody.exercises, expectedResponse.exerciseNames);
        });
    });

    describe('given a username without existing user record', () => {
        it('should return 404 - Not Found without any exercises', async () => {
            const username = 'username';

            const expectedResponse = {
                message: `Get Exercises: User ${username} not found.`
            };

            const response = await supertest(app)
                .get(routeTemplate.replace(':username', username))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(404);
            expect(responseBody.message).toEqual(expectedResponse.message);
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
                message: 'Create Exercise: Success.',
                createdExerciseName: newExerciseName,
                exerciseNames: [...exerciseNames, newExerciseName]
            };

            const response = await supertest(app)
                .post(routeTemplate.replace(':username', username))
                .send(requestBody);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(201);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.createdExercise.name).toEqual(expectedResponse.createdExerciseName);
            assertExerciseListEqualsNameList(responseBody.exercises, expectedResponse.exerciseNames);
        });
    });

    describe('given no exercise name in the request body', () => {
        it('should return 400 - Bad request with just an info message (no exercise name)', async () => {
            const expectedResponse = {
                message: 'Create Exercise: Please provide an exercise name.'
            };

            const response = await supertest(app)
                .post(routeTemplate.replace(':username', 'username does not matter'))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
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
                message: `Create Exercise: Cannot find user ${username}.`
            };

            const response = await supertest(app)
                .post(routeTemplate.replace(':username', username))
                .send(requestBody);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
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
                message: `Create Exercise: exercise ${newExerciseName} already exist.`
            };

            const response = await supertest(app)
                .post(routeTemplate.replace(':username', username))
                .send(requestBody);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
        });
    });
});


describe('PUT /api/:username/exercises/:exerciseId', () => {

    const routeTemplate = '/api/:username/exercises/:exerciseId';

    describe('given a valid username, a valid exerciseId and an exercise name that is yet to exist', () => {
        it('should return 200 - Ok response with the exercise list, the original and the updated execise', async () => {
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

            const savedUser = await User.findOne();
            const targetIndex = 0;
            const targetExercise = savedUser.exercises[targetIndex];
            const newExerciseName = 'updated-name';
            exerciseNames[targetIndex] = newExerciseName;

            const requestBody = { exerciseName: newExerciseName };

            const expectedResponse = {
                message: 'Update Exercise: Success.',
                originalExerciseName: targetExercise.name,
                updatedExerciseName: newExerciseName,
                exerciseNames: exerciseNames
            };

            const response = await supertest(app)
                .put(routeTemplate
                    .replace(':username', username)
                    .replace(':exerciseId', targetExercise._id))
                .send(requestBody);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(200);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.originalExercise.name).toEqual(expectedResponse.originalExerciseName);
            expect(responseBody.updatedExercise.name).toEqual(expectedResponse.updatedExerciseName);
            assertExerciseListEqualsNameList(responseBody.exercises, expectedResponse.exerciseNames);
        });
    });

    describe('given no exercise name in the request body', () => {
        it('should return 400 - Bad request with just an info message (no exercise name)', async () => {
            const expectedResponse = {
                message: 'Update Exercise: Please provide an exercise name.'
            };

            const response = await supertest(app)
                .put(routeTemplate
                    .replace(':username', 'username-does-not-matter')
                    .replace(':exerciseId', 'exerciseId-does-not-matter'))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.originalExercise).toBeUndefined();
            expect(responseBody.updatedExercise).toBeUndefined();
            expect(responseBody.exercises).toBeUndefined();
        });
    });

    describe('given a username without a user record', () => {
        it('should return 400 - Bad request with just an info message (cannot find user)', async () => {
            const username = 'username';
            const requestBody = {
                exerciseName: 'exe0'
            }

            const expectedResponse = {
                message: `Update Exercise: Cannot find user ${username}.`
            };

            const response = await supertest(app)
                .put(routeTemplate
                    .replace(':username', username)
                    .replace(':exerciseId', 'exerciseId does not matter'))
                .send(requestBody);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.originalExercise).toBeUndefined();
            expect(responseBody.updatedExercise).toBeUndefined();
            expect(responseBody.exercises).toBeUndefined();
        });
    });

    describe('given a valid username but with exerciseId that does not exist', () => {
        it('should return 400 - Bad request with just an info message (exerciseId does not exist)', async () => {
            const username = 'username';
            const password = 'password';
            const exerciseId = 'non-existing-exercise-id';
            const requestBody = {
                exerciseName: 'exe0'
            }
            const user = new User({
                username: username,
                password: password,
            });
            await user.save();

            const expectedResponse = {
                message: `Update Exercise: exerciseId ${exerciseId} does not exist.`
            };

            const response = await supertest(app)
                .put(routeTemplate
                    .replace(':username', username)
                    .replace(':exerciseId', exerciseId))
                .send(requestBody);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.originalExercise).toBeUndefined();
            expect(responseBody.updatedExercise).toBeUndefined();
            expect(responseBody.exercises).toBeUndefined();
        });
    });

    describe('given a valid username but the exercise name is a duplicate', () => {
        it('should return 400 - Bad request with just an info message (exercise name already exist)', async () => {
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

            const savedUser = await User.findOne();
            const targetIndex = 0;
            const targetExercise = savedUser.exercises[targetIndex];
            const targetExerciseId = targetExercise._id;
            const duplicateExerciseName = targetExercise.name;

            const requestBody = { exerciseName: duplicateExerciseName };

            const expectedResponse = {
                message: `Update Exercise: exerciseName ${duplicateExerciseName} already exist.`
            };

            const response = await supertest(app)
                .put(routeTemplate
                    .replace(':username', username)
                    .replace(':exerciseId', targetExerciseId))
                .send(requestBody);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.originalExercise).toBeUndefined();
            expect(responseBody.updatedExercise).toBeUndefined();
            expect(responseBody.exercises).toBeUndefined();
        });
    });
});

describe('DELETE /api/:username/exercises/:exerciseId', () => {

    const routeTemplate = '/api/:username/exercises/:exerciseId';

    describe('given a valid username with existing exerciseId', () => {
        it('should remove the record of the according exercise then return 200 - Ok response with the delete exercise and the exercise list', async () => {
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

            const savedUser = await User.findOne();
            const targetIndex = 0;
            const targetExercise = savedUser.exercises[targetIndex];
            exerciseNames.splice(targetIndex, 1);

            const expectedResponse = {
                message: 'Delete Exercise: Success.',
                deletedExerciseName: targetExercise.name,
                exerciseNames: exerciseNames
            };

            const response = await supertest(app)
                .delete(routeTemplate
                    .replace(':username', username)
                    .replace(':exerciseId', targetExercise._id))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(200);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.deletedExercise.name).toEqual(expectedResponse.deletedExerciseName);
            assertExerciseListEqualsNameList(responseBody.exercises, expectedResponse.exerciseNames);
        });
    });

    describe('given a username without a user record', () => {
        it('should return 400 - Bad request with just an info message (cannot find user)', async () => {
            const username = 'username';          

            const expectedResponse = {
                message: `Delete Exercise: Cannot find user ${username}.`
            };

            const response = await supertest(app)
                .delete(routeTemplate
                    .replace(':username', username)
                    .replace(':exerciseId', 'exerciseId-does-not-matter'))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.deletedExercise).toBeUndefined();
            expect(responseBody.exercises).toBeUndefined();
        });
    });

    describe('given a valid username but with exerciseId that does not exist', () => {
        it('should return 400 - Bad request with just an info message (exerciseId does not exist)', async () => {
            const username = 'username';
            const password = 'password';
            const exerciseId = 'non-existing-exercise-id';
            const user = new User({
                username: username,
                password: password,
            });
            await user.save();

            const expectedResponse = {
                message: `Delete Exercise: exerciseId ${exerciseId} does not exist.`
            };

            const response = await supertest(app)
                .delete(routeTemplate
                    .replace(':username', username)
                    .replace(':exerciseId', exerciseId))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.deletedExercise).toBeUndefined();
            expect(responseBody.exercises).toBeUndefined();
        });
    });
});