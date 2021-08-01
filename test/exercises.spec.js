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
            expect(responseBody.exercises.length).toBe(expectedResponse.exerciseNames.length);
            responseBody.exercises.forEach((exercise) => {
                expect(expectedResponse.exerciseNames.includes(exercise.name)).toBe(true);                
            });
        });
    });

    describe('given a username without existing user record', () => {
        it('should return 404 - Not Found without any exercises', async () => {
            const username = 'username';

            const expectedResponse = {
                message: `Get Exercises: User ${username} not found`,
            }

            User.findOne((user) => {
                console.log(`Users: ${user}`);
            })

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