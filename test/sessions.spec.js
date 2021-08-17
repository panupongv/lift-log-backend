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

const midTestCaseStubReset = () => {
    sinon.assert.calledOnce(authorisationStub);
    authorisationStub.reset();
    authorisationStub.callsArg(2);
};

const addDays = (date, days) => {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};


const expectDateStringsEqual = (expected, received) => {
    const expectedDate = new Date(expected);
    const receivedDate = new Date(received);
    expect(receivedDate).toEqual(expectedDate);
};


const expectSessionsEqual = (expected, received) => {
    expect(received.name).toEqual(expected.name);
    expect(received.location).toEqual(expected.location);
    expectDateStringsEqual(expected.date, received.date);
};


describe('GET /api/:username/sessions/?start={start}&limit={limit}', () => {
    const routeTemplate = '/api/:username/sessions/?start={start}&limit={limit}';

    describe('given a valid username and query parameters', () => {
        it('should return 200 - Ok with the sessions paginated according to the query', async () => {
            const username = 'test_username';
            const password = 'test_password';
            const sessions = [...Array(20).keys()].map((x) => {
                const date = new Date(`2021-08-${x + 1}Z`);
                return new Session({
                    name: `session ${x + 1}`,
                    location: `gym ${x + 1}`,
                    date: date
                })
            });

            const user = new User({
                username: username,
                password: password,
                sessions: sessions
            });
            user.save();

            const sortedSessions = sessions.reverse();

            // Normal case with start and limit

            const start = 5;
            const limit = 8;

            const expectedResponseNormalCase = {
                messsage: `Get Sessions: Success.`,
                sessions: sortedSessions.slice(start, start + limit)
            };

            const responseNormalCase = await supertest(app)
                .get(routeTemplate.replace(':username', username)
                    .replace('{start}', start.toString())
                    .replace('{limit}', limit.toString()))
                .send();
            const responseNormalCaseBody = JSON.parse(responseNormalCase.text);

            expect(responseNormalCase.statusCode).toBe(200);
            expect(responseNormalCaseBody.message).toEqual(expectedResponseNormalCase.message);
            expect(responseNormalCaseBody.sessions.length).toBe(limit);
            responseNormalCaseBody.sessions.forEach((session, index) => {
                expectSessionsEqual(expectedResponseNormalCase.sessions[index], session);
            });


            // Query window beyond last element

            midTestCaseStubReset();

            const expectedResponseWindowBeyondLastElement = {
                messsage: `Get Sessions: Success.`,
                sessions: sortedSessions.slice(start)
            };

            const limitBeyondLastElement = sessions.length * 2;

            const responseWindowBeyondLastElement = await supertest(app)
                .get(routeTemplate.replace(':username', username)
                    .replace('{start}', start.toString())
                    .replace('{limit}', limitBeyondLastElement.toString()))
                .send();
            const responseWindowBeyondLastElementBody = JSON.parse(responseWindowBeyondLastElement.text);

            expect(responseWindowBeyondLastElement.statusCode).toBe(200);
            expect(responseWindowBeyondLastElementBody.message).toEqual(expectedResponseWindowBeyondLastElement.message);
            expect(responseWindowBeyondLastElementBody.sessions.length).toBe(expectedResponseWindowBeyondLastElement.sessions.length);
            responseWindowBeyondLastElementBody.sessions.forEach((session, index) => {
                expectSessionsEqual(expectedResponseWindowBeyondLastElement.sessions[index], session);
            });


            // No start provided, defaulted to 0

            midTestCaseStubReset();

            const limitNoStart = 10;

            const expectedResponseNoStart = {
                messsage: `Get Sessions: Success.`,
                sessions: sortedSessions.slice(0, limitNoStart)
            };

            const routeNoStart = '/api/:username/sessions/?limit={limit}';
            const responseNoStart = await supertest(app)
                .get(routeNoStart.replace(':username', username)
                    .replace('{limit}', limitNoStart.toString()))
                .send();
            const responseNoStartBody = JSON.parse(responseNoStart.text);

            expect(responseNoStart.statusCode).toBe(200);
            expect(responseNoStartBody.message).toEqual(expectedResponseNoStart.message);
            expect(responseNoStartBody.sessions.length).toBe(limitNoStart);
            responseNoStartBody.sessions.forEach((session, index) => {
                expectSessionsEqual(expectedResponseNoStart.sessions[index], session);
            });
        });
    });

    describe('given a username without user record', () => {
        it('should return 400 - Bad request with no resulting sessions (user not found)', async () => {
            const username = 'test_username';

            const expectedResponse = {
                message: `Get Sessions: User ${username} not found.`
            };

            const response = await supertest(app)
                .get(routeTemplate.replace(':username', username)
                    .replace('{start}', '3')
                    .replace('{limit}', '5'))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.sessions).toBeUndefined();
        });
    });

    describe('given a request query with missing limit parameters (start is defaulted to 0)', () => {
        it('should return 400 - Bad request with no resulting sessions (missing parameter(s))', async () => {
            const username = 'test_username';

            const expectedResponse = {
                message: `Get Sessions: Missing the parameter limit.`
            };

            const routeNoLimit = '/api/:username/sessions/?start={start}'
            const responseNoLimit = await supertest(app)
                .get(routeNoLimit.replace(':username', username)
                    .replace('{start}', '2'))
                .send();
            const responseNoLimitBody = JSON.parse(responseNoLimit.text);

            expect(responseNoLimit.statusCode).toBe(400);
            expect(responseNoLimitBody.message).toEqual(expectedResponse.message);
            expect(responseNoLimitBody.sessions).toBeUndefined();

            midTestCaseStubReset();

            const routeNoParams = '/api/:username/sessions/'
            const responseNoParams = await supertest(app)
                .get(routeNoParams.replace(':username', username))
                .send();
            const responseNoParamsBody = JSON.parse(responseNoParams.text);

            expect(responseNoParams.statusCode).toBe(400);
            expect(responseNoParamsBody.message).toEqual(expectedResponse.message);
            expect(responseNoParamsBody.sessions).toBeUndefined();
        });
    });

    describe('given query parameter(s) that is not an integer', () => {
        it('should return 400 - Bad request with no resulting sessions (invalid format)', async () => {
            const username = 'test_username';

            const expectedResponse = {
                message: `Get Sessions: Please provide 'start' and 'limit' as integers.`
            };

            const responseBadStart = await supertest(app)
                .get(routeTemplate.replace(':username', username)
                    .replace('{start}', 'not integer')
                    .replace('{limit}', '10'))
                .send();
            const responseBadStartBody = JSON.parse(responseBadStart.text);

            expect(responseBadStart.statusCode).toBe(400);
            expect(responseBadStartBody.message).toEqual(expectedResponse.message);
            expect(responseBadStartBody.sessions).toBeUndefined();

            midTestCaseStubReset();

            const responseBadLimit = await supertest(app)
                .get(routeTemplate.replace(':username', username)
                    .replace('{start}', '3')
                    .replace('{limit}', '-3'))
                .send();
            const responseBadLimitBody = JSON.parse(responseBadLimit.text);

            expect(responseBadLimit.statusCode).toBe(400);
            expect(responseBadLimitBody.message).toEqual(expectedResponse.message);
            expect(responseBadLimitBody.sessions).toBeUndefined();
        });
    });
});


describe('GET /api/:username/sessions/dates/?startDate={startDate}&endDate={endDate}', () => {
    const routeTemplate = '/api/:username/sessions/dates/?startDate={startDate}&endDate={endDate}';

    describe('given a valid username and date range', () => {
        it('should return 200 - Ok along with the sessions in between the date range (sorted by date asc)', async () => {
            const username = 'test-username';
            const password = 'test-password';

            const startDate = '2021-07-01Z';
            const endDate = '2021-07-31Z';

            const samples = [
                { name: 'sess1', dateOffset: -5, location: 'loc1' },
                { name: 'sess2', dateOffset: 20, location: 'loc2' },
                { name: 'sess3', dateOffset: 10, location: 'loc3' },
                { name: 'sess4', dateOffset: 99, location: 'loc4' }
            ];

            const startDateInstance = new Date(startDate);
            const sessions = samples.map((sample) => {
                const sampleDate = addDays(startDateInstance, sample.dateOffset);
                return new Session({
                    name: sample.name,
                    date: sampleDate,
                    location: sample.location
                });
            });

            const user = new User({
                username: username,
                password: password,
                sessions: sessions
            });
            await user.save();

            const expectedResponse = {
                message: 'Get Sessions by Date: Success.',
                sessionsInRange: [sessions[2], sessions[1]]
            };

            const response = await supertest(app)
                .get(routeTemplate.replace(':username', username)
                    .replace('{startDate}', startDate)
                    .replace('{endDate}', endDate))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(200);
            expect(responseBody.message).toEqual(expectedResponse.message);

            expect(responseBody.sessions.length).toBe(expectedResponse.sessionsInRange.length);
            responseBody.sessions.forEach((session, index) => {
                expectSessionsEqual(session, expectedResponse.sessionsInRange[index]);
            });
        });
    });

    describe('given a username without user record', () => {
        it('should return 400 - Bad request with no resulting sessions (user not found)', async () => {
            const username = 'test_username';

            const expectedResponse = {
                message: `Get Sessions by Date: User ${username} not found.`
            };

            const response = await supertest(app)
                .get(routeTemplate.replace(':username', username)
                    .replace('{startDate}', '2021-07-01Z')
                    .replace('{endDate}', '2021-07-31Z'))
                .send();
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
            expect(responseBody.sessions).toBeUndefined();
        });
    });

    describe('given query date(s) in invalid formats', () => {
        it('should return 400 - Bad request with no resulting sessions (invalid format)', async () => {
            const username = 'test_username';

            const expectedResponse = {
                message: `Get Sessions by Date: Invalid date format(s).`
            };

            const responseInvalidEndDate = await supertest(app)
                .get(routeTemplate.replace(':username', username)
                    .replace('{startDate}', '2021-07-01Z')
                    .replace('{endDate}', '31-07-2021Z'))
                .send();
            const responseInvalidEndDateBody = JSON.parse(responseInvalidEndDate.text);

            expect(responseInvalidEndDate.statusCode).toBe(400);
            expect(responseInvalidEndDateBody.message).toEqual(expectedResponse.message);
            expect(responseInvalidEndDateBody.sessions).toBeUndefined();

            midTestCaseStubReset();

            const responseInvalidStartDate = await supertest(app)
                .get(routeTemplate.replace(':username', username)
                    .replace('{startDate}', '08/07/21Z')
                    .replace('{endDate}', '2021-07-31Z'))
                .send();
            const responseInvalidStartDateBody = JSON.parse(responseInvalidStartDate.text);

            expect(responseInvalidStartDate.statusCode).toBe(400);
            expect(responseInvalidStartDateBody.message).toEqual(expectedResponse.message);
            expect(responseInvalidStartDateBody.sessions).toBeUndefined();
        });
    });

    describe('given a request query with missing start or end dates', () => {
        it('should return 400 - Bad request with no resulting sessions (missing parameter(s))', async () => {
            const username = 'test_username';

            const expectedResponse = {
                message: `Get Sessions by Date: Missing query parameter(s).`
            };

            const noEndDateRoute = '/api/:username/sessions/dates/?startDate={startDate}'
            const responseNoEndDate = await supertest(app)
                .get(noEndDateRoute.replace(':username', username)
                    .replace('{startDate}', '2021-07-01Z'))
                .send();
            const responseNoEndDateBody = JSON.parse(responseNoEndDate.text);

            expect(responseNoEndDate.statusCode).toBe(400);
            expect(responseNoEndDateBody.message).toEqual(expectedResponse.message);
            expect(responseNoEndDateBody.sessions).toBeUndefined();

            midTestCaseStubReset();

            const noStartDateRoute = '/api/:username/sessions/dates/?endDate={endDate}'
            const responseNoStartDate = await supertest(app)
                .get(noStartDateRoute.replace(':username', username)
                    .replace('{endDate}', '2021-07-01Z'))
                .send();
            const responseNoStartDateBody = JSON.parse(responseNoStartDate.text);
            expect(responseNoStartDate.statusCode).toBe(400);
            expect(responseNoStartDateBody.message).toEqual(expectedResponse.message);
            expect(responseNoStartDateBody.sessions).toBeUndefined();
        });
    });
});


describe('POST /api/:username/sessions', () => {

    const routeTemplate = '/api/:username/sessions';

    describe('given a valid username with complete request body (location included)', () => {
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

    describe('given a valid username with complete request body (location excluded)', () => {
        it('should create the record on database then return 201 - Create along with the record (location autopopulated as \'\')', async () => {
            const username = 'test_username';
            const password = 'test_password';
            const user = new User({
                username: username,
                password: password
            });
            await user.save();

            const sessionName = 'session-name';
            const date = '2021-07-01Z';

            const requestBody = {
                name: sessionName,
                date: date
            };

            const expectedResponse = {
                message: 'Create Session: Success.',
                createdSession: {
                    name: sessionName,
                    date: date,
                    location: ''
                }
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
                            }
                        }
                    }
                ]
            })
                .then((users) => {
                    expect(users.length).toBe(1);
                    const sessions = users[0].sessions;
                    expect(sessions.length).toBe(1);
                    expect(sessions[0].location).toEqual('');
                });
        });
    });

    describe('given a username with no user record', () => {
        it('should return 400 - Bad request, an error message and no result objects (no user)', async () => {
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

    describe('given an incomplete request body', () => {
        it('should return 400 - Bad request, an error message and no result objects (missing parameter(s))', async () => {
            const username = 'test_username';

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

            midTestCaseStubReset();

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

    describe('given a complete request body but invalid date format', () => {
        it('should return 400 - Bad request, an error message and no result objects ()', async () => {
            const username = 'test_username';

            const expectedResponse = {
                message: `Create Session: invalid date format.`
            };
            const requestBody = {
                name: 'session-name',
                date: '20210701Z'
            }
            const response = await supertest(app)
                .post(routeTemplate.replace(':username', username))
                .send(requestBody);
            const responseBody = JSON.parse(response.text);

            expect(response.statusCode).toBe(400);
            expect(responseBody.message).toEqual(expectedResponse.message);
        });
    });
});
