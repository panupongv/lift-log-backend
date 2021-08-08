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

    console.log(receivedDate.getDate());
    console.log(receivedDate.getMonth());
    console.log(receivedDate.getFullYear());
    
    expect(receivedDate.getDate()).toBe(expectDate.getDate());
    expect(receivedDate.getMonth()).toBe(expectDate.getMonth());
    expect(receivedDate.getFullYear()).toBe(expectDate.getFullYear());
}


describe('POST /api/:username/sessions', () => {

    const routeTemplate = '/api/:username/sessions';

    describe('given a valid username with complete request body', () => {
        it('should return 201 - Create along with the created session record', async () => {
            const username = 'username';
            const password = 'password';
            const user = new User({
                username: username,
                password: password
            });
            await user.save();

            const sessionName = 'Usual Workout';
            const date = '2021-03-01';
            const location = 'Gym';

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
        });
    });

    //describe('', () => {
    //    it('', async () => {

    //    });
    //});

    //describe('', () => {
    //    it('', async () => {

    //    });
    //});
});