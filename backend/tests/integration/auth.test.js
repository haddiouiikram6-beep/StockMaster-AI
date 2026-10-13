import request from 'supertest';
import app from '../../src/app.js';
import { seedTestDb, sequelize } from '../setup.js';

describe('Auth Integration Tests', () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await seedTestDb();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('POST /api/auth/register - should register a new user successfully and assign default employee role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'New User',
        email: 'newuser@example.com',
        password: 'Password123!'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('newuser@example.com');
    expect(res.body.data.role).toBe('employee');
    expect(res.body.data.password).toBeUndefined(); // Password must not be returned

    // User can login with own credentials
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'newuser@example.com',
        password: 'Password123!'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.user.email).toBe('newuser@example.com');
  });

  it('POST /api/auth/register - should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Duplicate User',
        email: 'admin@test.com', // Already seeded
        password: 'Password123!'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });

  it('POST /api/auth/login - should login successfully and return access and refresh tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'Password123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@test.com');
  });

  it('POST /api/auth/login - should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'WrongPassword999!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid email or password');
  });

  it('POST /api/auth/refresh - should issue new tokens with valid refresh token', async () => {
    // First login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Password123!' });

    const refreshToken = loginRes.body.data.refreshToken;

    // Refresh
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).toBeDefined();
    expect(refreshRes.body.data.user).toBeDefined();
    expect(refreshRes.body.data.user.email).toBe('admin@test.com');
    expect(refreshRes.body.data.user.password).toBeUndefined();
  });

  it('POST /api/auth/logout - should revoke refresh token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Password123!' });

    const refreshToken = loginRes.body.data.refreshToken;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Try refreshing after logout
    const tryRefresh = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(tryRefresh.status).toBe(401);
  });

  it('GET /api/auth/me - should access protected route with valid token and reject without token', async () => {
    const unauthorizedRes = await request(app).get('/api/auth/me');
    expect(unauthorizedRes.status).toBe(401);

    const authorizedRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${fixtures.adminToken}`);

    expect(authorizedRes.status).toBe(200);
    expect(authorizedRes.body.success).toBe(true);
    expect(authorizedRes.body.data.email).toBe('admin@test.com');
  });
});
