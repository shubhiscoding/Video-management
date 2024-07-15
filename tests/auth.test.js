const request = require('supertest');
const express = require('express');
const authRouter = require('../routes/auth');

const app = express();
app.use(express.json());
app.use('/', authRouter);

describe("POST /", () => {
  describe("given a correct username and password", () => {
    test("should respond with a 200 status code", async () => {
      const response = await request(app)
        .post("/")
        .send({
          email: "shubh@test.com",
          password: "password"
        });
      expect(response.statusCode).toBe(200);
    }, 10000);

    test("should specify json in the content type header", async () => {
      const response = await request(app)
        .post("/")
        .send({
          email: "shubh@test.com",
          password: "password"
        });
      expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
    }, 10000);
  });

  describe("when the email or password is wrong", () => {
    test("should respond with a 400 status code", async () => {
      const bodyData = [
        {
          email: "shubh@test.com",
          password: "wrongpassword"
        },
        {
          email: "wrong@email.com",
          password: "password"
        }
      ];
      for (const body of bodyData) {
        const response = await request(app).post("/").send(body);
        expect(response.statusCode).toBe(400);
      }
    }, 20000);
  });

  describe("when the username and password is missing", () => {
    test("should respond with a status code of 400", async () => {
      const bodyData = [
        {username: "username"},
        {password: "password"},
        {}
      ];
      for (const body of bodyData) {
        const response = await request(app).post("/").send(body);
        expect(response.statusCode).toBe(500);
      }
    }, 20000);
  });
});