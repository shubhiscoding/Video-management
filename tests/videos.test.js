const request = require('supertest');
const express = require('express');
const videoRouter = require('../routes/videos');
const auth = require('../middleware/auth');

// Mock middleware
jest.mock('../middleware/auth', () => jest.fn((req, res, next) => next()));
jest.mock('../middleware/roles', () => ({
  admin: jest.fn((req, res, next) => next())
}));

const app = express();
app.use(express.json());
app.use('/', videoRouter);

describe('Video Routes', () => {
  describe('POST /', () => {
    test('should upload a video and respond with 200 status code when Provided valid video path', async () => {
      const response = await request(app)
        .post('/')
        .attach('video', '/home/shubh/Video-management/videos/1721040158531_Screencastfrom2024-07-1317-29-43.webm')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'File uploaded successfully');
      expect(response.body).toHaveProperty('video');
    });

    test('should return 400 if no file is uploaded', async () => {
      await request(app)
        .post('/')
        .expect(400);
    });
  });

  describe('POST /trim/:id', () => {
    test('should trim a video and respond with 200 status code when given valid video Id', async () => {
      const response = await request(app)
        .post('/trim/1')
        .send({ start: 0, end: 10 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Video trimmed successfully');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('video_details');
    });

    test('should return 404 if video is not found', async () => {
      await request(app)
        .post('/trim/999')
        .send({ start: 0, end: 10 })
        .expect(404);
    });
  });

  describe('POST /merge', () => {
    test('should merge videos and respond with 200 status code when given valid video Ids', async () => {
      const response = await request(app)
        .post('/merge')
        .send({ videoIds: ['1', '2'] })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'Videos merged successfully');
      expect(response.body).toHaveProperty('mergedVideoId');
    });

    test('should return 400 if less than two video IDs are provided', async () => {
      await request(app)
        .post('/merge')
        .send({ videoIds: ['123'] })
        .expect(400);
    });
  });

  describe('POST /share', () => {
    test('should generate a shareable link and respond with 200 status code when given valid video Id', async () => {
      const response = await request(app)
        .post('/share')
        .send({ videoId: '1', expiryHours: 24 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('shareableLink');
      expect(response.body).toHaveProperty('expiryTime');
    });

    test('should return 400 if videoId or expiryHours is missing', async () => {
      await request(app)
        .post('/share')
        .send({ videoId: '123' })
        .expect(400);

      await request(app)
        .post('/share')
        .send({ expiryHours: 24 })
        .expect(400);
    });
  });

  describe('GET /shared/:token', () => {
    test('should serve a shared video and respond with 200 status code when token is valid', async () => {
      const response = await request(app)
        .get('/shared/201198')
        .expect(200);

      // Assuming the response is a file stream
      expect(response.header['content-type']).toMatch(/video/);
    });

    test('should return 404 if token is invalid', async () => {
      await request(app)
        .get('/shared/123456')
        .expect(404);
    });

    test('should return 410 if link has expired', async () => {
      const response = await request(app)
        .post('/share')
        .send({ videoId: 1, expiryHours: 0.00001 })
        .expect('Content-Type', /json/)
        .expect(200);

        const token = response.body.shareableLink.split('/').pop();
        await request(app)
            .get(`/shared/${token}`)
            .expect(410);

        jest.restoreAllMocks();
    });
  });
});