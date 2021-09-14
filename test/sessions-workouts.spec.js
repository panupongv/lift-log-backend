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


describe('GET /api/:username/sessions/:sessionId/:workoutId', () => {
    const routeTemplate = '/api/:username/sessions/:sessionId/:workoutId';

    describe('given a valid username and a sessionId-workoutId pair that exist', () => {
        it('should return a 200 - Ok response with the information related to the session and workout', async () => {
            const username = 'test_username';
            const password = 'test_password';

            const placeHolderWorkout = new Workout({
                content: '88x5',
                exerciseId: mongoose.Types.ObjectId()
            });

            const workout = new Workout({
                content: '99x10;99x10;99x10',
                exerciseId: mongoose.Types.ObjectId()
            });

            const session = new Session({
                name: 'session-name',
                date: '2021-08-30Z',
                workouts: [placeHolderWorkout, workout]
            });

            const placeHolderSession = new Session({
                name: 'dontmatter',
                date: '2021-04-22Z'
            });

            const user = new User({
                username: username,
                password: password,
                sessions: [session, placeHolderSession]
            });

            const saveResult = await user.save();
            const sessionId = saveResult.sessions[0]._id;
            const workoutId = saveResult.sessions[0].workouts[1]._id;

            const expectedResponse = {
                message: 'Get Workout: Success.',
                session: {
                    location: session.location,
                    date: session.date,
                    workout: workout
                }
            };

            const response = await supertest(app)
                .get(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', workoutId))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(200);
            expect(responseBody.message).toEqual(expectedResponse.message);

            expect(responseBody.session.location).toEqual(expectedResponse.session.location);
            expect(new Date(responseBody.session.date)).toEqual(new Date(expectedResponse.session.date));

            expect(responseBody.session.workout.content).toEqual(expectedResponse.session.workout.content);
            expect(responseBody.session.workout.exerciseId.toString()).toEqual(expectedResponse.session.workout.exerciseId.toString());
        });
    });

    describe('given a username without a user record', () => {
        it('should not update any record and return 400 - Bad request (no user)', async () => {
            const username = 'test_username';
            const sessionId = mongoose.Types.ObjectId();
            const workoutId = mongoose.Types.ObjectId();
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const expectedResponse = {
                message: `Get Workout: User ${username} not found.`
            };

            const response = await supertest(app)
                .get(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', workoutId))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
        });
    });

    describe('given a valid username but a sessionId-workoutId pair that does not exist', () => {
        it('should not update any record and return 400 - Bad request (no session)', async () => {
            const username = 'test_username';
            const password = 'test_password';
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const session = new Session({
                name: 'test_session',
                date: '2021-09-02Z'
            })

            const user = new User({
                username: username,
                password: password,
                sessions: [session]
            });
            await user.save();

            const randomWorkoutId = mongoose.Types.ObjectId();

            const sessionId = user.sessions[0]._id;

            const expectedResponse = {
                message: `Get Workout: Cannot find session-workout ${sessionId}/${randomWorkoutId}.`
            };

            const response = await supertest(app)
                .get(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', randomWorkoutId))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
        });
    });

    describe('given a sessionId in an invalid format', () => {
        it('should not update any record and return 400 - Bad request (invalid sessionId)', async () => {
            const username = 'test_username';
            const sessionId = 'not in valid format';
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const expectedResponse = {
                message: `Get Workout: Invalid sessionId format.`
            };

            const response = await supertest(app)
                .get(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', mongoose.Types.ObjectId()))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
        });
    });

    describe('given a workoutId in an invalid format', () => {
        it('should not update any record and return 400 - Bad request (invalid workoutId)', async () => {
            const username = 'test_username';
            const sessionId = mongoose.Types.ObjectId();
            const workoutId = 'not in valid format';
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const expectedResponse = {
                message: `Get Workout: Invalid workoutId format.`
            };

            const response = await supertest(app)
                .get(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', workoutId))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
        });
    });
});


describe('POST /api/:username/sessions/:sessionId', () => {

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

            const placeHolderSession = new Session({
                name: 'dontmatter',
                date: '2021-04-22Z'
            });

            const user = new User({
                username: username,
                password: password,
                exercises: [exercise],
                sessions: [session, placeHolderSession]
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
                    expect(results[0].sessions.length).toBe(2);
                    expect(results[0].sessions[0].workouts.length).toBe(1);
                    expectWorkoutsEqual(results[0].sessions[0].workouts[0], expectedResponse.createdWorkout);

                    expect(results[0].sessions[1].workouts.length).toBe(0);
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


describe('PUT /api/:username/sessions/:sessionId/:workoutId', () => {
    const routeTemplate = '/api/:username/sessions/:sessionId/:workoutId';

    describe('given a valid username, sessionsId, workoutId and request body (containing exerciseId and content)', () => {
        it('should update the workout record and return 200 - Ok response with the updated workout fields', async () => {
            const username = 'test_username';
            const password = 'test_password';

            const workout = new Workout({
                exerciseId: mongoose.Types.ObjectId(),
                content: '1x10;1x10;1x10;1x10'
            });
            const session = new Session({
                name: 'session-name',
                date: '2021-08-30Z',
                workouts: [workout]
            });

            const user = new User({
                username: username,
                password: password,
                sessions: [session]
            });
            const saveResult = await user.save();
            const sessionId = saveResult.sessions[0]._id;
            const workoutId = saveResult.sessions[0].workouts[0]._id;

            const expectedResponse = {
                message: 'Update Workout: Success.',
                workout: {
                    exerciseId: mongoose.Types.ObjectId(),
                    content: '99x9;99x9;100x5'
                }
            };

            const response = await supertest(app)
                .put(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', workoutId))
                .send(expectedResponse.workout);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(200);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.updatedFields.exerciseId.toString()).toEqual(expectedResponse.workout.exerciseId.toString());
            expect(responseBody.updatedFields.content).toEqual(expectedResponse.workout.content);

            User.find({
                username: username,
                'sessions._id': sessionId,
                'sessions.workouts._id': workoutId
            }).then((result) => {
                const resultUser = result[0];
                const session = resultUser.sessions[0];
                const workout = session.workouts[0];

                expect(resultUser.sessions.length).toBe(1);
                expect(session.workouts.length).toBe(1);
                expect(workout.exerciseId.toString()).toEqual(expectedResponse.workout.exerciseId.toString());
                expect(workout.content).toEqual(expectedResponse.workout.content);
            });
        });
    });

    describe('given a username without a user record', () => {
        it('should not update any record and return 400 - Bad request (no user)', async () => {
            const username = 'test_username';
            const sessionId = mongoose.Types.ObjectId();
            const workoutId = mongoose.Types.ObjectId();
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const expectedResponse = {
                message: `Update Workout: User ${username} not found.`
            };

            const response = await supertest(app)
                .put(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', workoutId))
                .send({
                    exerciseId: exerciseId,
                    content: content
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.updatedFields).toBeUndefined();
        });
    });

    describe('given a valid username but a sessionId-workoutId pair that does not exist', () => {
        it('should not update any record and return 400 - Bad request (no session)', async () => {
            const username = 'test_username';
            const password = 'test_password';
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const session = new Session({
                name: 'test_session',
                date: '2021-09-02Z'
            })

            const user = new User({
                username: username,
                password: password,
                sessions: [session]
            });
            await user.save();

            const randomWorkoutId = mongoose.Types.ObjectId();

            const sessionId = user.sessions[0]._id;

            const expectedResponse = {
                message: `Update Workout: Cannot find session-workout ${sessionId}/${randomWorkoutId}.`
            };

            const response = await supertest(app)
                .put(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', randomWorkoutId))
                .send({
                    exerciseId: exerciseId,
                    content: content
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.updatedFields).toBeUndefined();
        });
    });

    describe('given a sessionId in an invalid format', () => {
        it('should not update any record and return 400 - Bad request (invalid sessionId)', async () => {
            const username = 'test_username';
            const sessionId = 'not in valid format';
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const expectedResponse = {
                message: `Update Workout: Invalid sessionId format.`
            };

            const response = await supertest(app)
                .put(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', mongoose.Types.ObjectId()))
                .send({
                    exerciseId: exerciseId,
                    content: content
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.updatedFields).toBeUndefined();
        });
    });

    describe('given a workoutId in an invalid format', () => {
        it('should not update any record and return 400 - Bad request (invalid workoutId)', async () => {
            const username = 'test_username';
            const sessionId = mongoose.Types.ObjectId();
            const workoutId = 'not in valid format';
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const expectedResponse = {
                message: `Update Workout: Invalid workoutId format.`
            };

            const response = await supertest(app)
                .put(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', workoutId))
                .send({
                    exerciseId: exerciseId,
                    content: content
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.updatedFields).toBeUndefined();
        });
    });

    describe('given a request body without a request body', () => {
        it('should not update any record and return 400 - Bad request (missing exerciseId)', async () => {
            const username = 'test_username';
            const sessionId = mongoose.Types.ObjectId();

            const expectedResponse = {
                message: `Update Workout: Missing request body parameters.`
            };

            const response = await supertest(app)
                .put(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', mongoose.Types.ObjectId()))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.updatedFields).toBeUndefined();
        });
    });

    describe('given a request body with an invalid exerciseId', () => {
        it('should not update any record and return 400 - Bad request (missing exerciseId)', async () => {
            const username = 'test_username';
            const sessionId = mongoose.Types.ObjectId();
            const exerciseId = 'not in valid format';

            const expectedResponse = {
                message: `Update Workout: Please provide a valid exerciseId.`
            };

            const response = await supertest(app)
                .put(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', mongoose.Types.ObjectId()))
                .send({
                    exerciseId: exerciseId,
                    content: '40x10;40x10;40x10'
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.updatedFields).toBeUndefined();
        });
    });

    describe('given a request body with an invalid exercise content', () => {
        it('should not put any record and return 400 - Bad request (invalid exercise content)', async () => {
            const username = 'test_username';
            const sessionId = mongoose.Types.ObjectId();
            const exerciseId = mongoose.Types.ObjectId();
            const content = 'not weightxreps;weightxreps;weightxreps';

            const expectedResponse = {
                message: `Update Workout: Please provide a valid exercise content.`
            };

            const response = await supertest(app)
                .put(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', mongoose.Types.ObjectId()))
                .send({
                    exerciseId: exerciseId,
                    content: content
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
        });
    });
});


describe('DELETE /api/:username/sessions/:sessionId/:workoutId', () => {
    const routeTemplate = '/api/:username/sessions/:sessionId/:workoutId';

    describe('given a valid username and a session-workoutId pair that exist', () => {
        it('should delete that certain workout record and return a 200 - Ok response', async () => {
            const username = 'test_username';
            const password = 'test_password';

            const workout1 = new Workout({
                content: '30x10;40x8',
                exerciseId: mongoose.Types.ObjectId()
            });

            const workout2 = new Workout({
                content: '50x10;60x8',
                exerciseId: mongoose.Types.ObjectId()
            });

            const session = new Session({
                name: 'test SESSION',
                date: '2021-09-23Z',
                workouts: [workout1, workout2]
            });

            const user = new User({
                username: username,
                password: password,
                sessions: [session]
            });

            const saveResult = await user.save();

            const sessionId = saveResult.sessions[0]._id;
            const workoutId = saveResult.sessions[0].workouts[0].id;

            const expectedResponse = {
                message: 'Delete Workout: Success.'
            };

            const response = await supertest(app)
                .delete(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', workoutId))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(200);
            expect(responseBody.message).toEqual(expectedResponse.message);

            User.find({ username: username })
                .then((results) => {
                    expect(results.length).toBe(1);
                    expect(results[0].sessions.length).toBe(1);
                    expect(results[0].sessions[0].workouts.length).toBe(1);

                    const remainingWorkout = results[0].sessions[0].workouts[0];
                    expect(remainingWorkout.exerciseId.toString()).toEqual(workout2.exerciseId.toString());
                    expect(remainingWorkout.content).toEqual(workout2.content);
                });
        });
    });

    describe('given a username without a user record', () => {
        it('should not update any record and return 400 - Bad request (no user)', async () => {
            const username = 'test_username';
            const sessionId = mongoose.Types.ObjectId();
            const workoutId = mongoose.Types.ObjectId();
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const expectedResponse = {
                message: `Delete Workout: User ${username} not found.`
            };

            const response = await supertest(app)
                .delete(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', workoutId))
                .send({
                    exerciseId: exerciseId,
                    content: content
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
        });
    });

    describe('given a valid username but a sessionId-workoutId pair that does not exist', () => {
        it('should not update any record and return 400 - Bad request (no session)', async () => {
            const username = 'test_username';
            const password = 'test_password';
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const session = new Session({
                name: 'test_session',
                date: '2021-09-02Z'
            })

            const user = new User({
                username: username,
                password: password,
                sessions: [session]
            });
            await user.save();

            const randomWorkoutId = mongoose.Types.ObjectId();

            const sessionId = user.sessions[0]._id;

            const expectedResponse = {
                message: `Delete Workout: Cannot find session-workout ${sessionId}/${randomWorkoutId}.`
            };

            const response = await supertest(app)
                .delete(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', randomWorkoutId))
                .send({
                    exerciseId: exerciseId,
                    content: content
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
        });
    });

    describe('given a sessionId in an invalid format', () => {
        it('should not update any record and return 400 - Bad request (invalid sessionId)', async () => {
            const username = 'test_username';
            const sessionId = 'not in valid format';
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const expectedResponse = {
                message: `Delete Workout: Invalid sessionId format.`
            };

            const response = await supertest(app)
                .delete(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', mongoose.Types.ObjectId()))
                .send({
                    exerciseId: exerciseId,
                    content: content
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
        });
    });

    describe('given a workoutId in an invalid format', () => {
        it('should not update any record and return 400 - Bad request (invalid workoutId)', async () => {
            const username = 'test_username';
            const sessionId = mongoose.Types.ObjectId();
            const workoutId = 'not in valid format';
            const exerciseId = mongoose.Types.ObjectId();
            const content = '40x10;40x10;40x10';

            const expectedResponse = {
                message: `Delete Workout: Invalid workoutId format.`
            };

            const response = await supertest(app)
                .delete(routeTemplate
                    .replace(':username', username)
                    .replace(':sessionId', sessionId)
                    .replace(':workoutId', workoutId))
                .send({
                    exerciseId: exerciseId,
                    content: content
                });
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
        });
    });
});
