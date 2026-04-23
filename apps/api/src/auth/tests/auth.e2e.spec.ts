import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { RedisService } from '../../redis/redis.service';
import { Role } from '../../common/enums/role.enum';

describe('Auth E2E Tests', () => {
  let app: INestApplication;
  let redisService: RedisService;

  const testUser = {
    name: 'Test User',
    email: 'e2e@test.com',
    password: 'password123',
    role: Role.PATIENT,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    redisService = moduleFixture.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should create a new user and return access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(typeof response.body.accessToken).toBe('string');
    });

    it('should return 409 if user already exists', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(409);
    });

    it('should return 400 for invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'invalid' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials and return access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('expiresIn');
    });

    it('should return 401 for wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 401 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'none@none.com', password: 'password123' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout and return 204', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const { accessToken } = loginResponse.body;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });

  describe('Full flow: signup → login → logout', () => {
    const flowUser = {
      name: 'Flow User',
      email: 'flow@test.com',
      password: 'password123',
      role: Role.PATIENT,
    };

    it('should complete the full auth cycle', async () => {
      const signupRes = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(flowUser)
        .expect(201);

      expect(signupRes.body.accessToken).toBeDefined();

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: flowUser.email, password: flowUser.password })
        .expect(200);

      const token = loginRes.body.accessToken;
      expect(token).toBeDefined();

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });
  });
});
