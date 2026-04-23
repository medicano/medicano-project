import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { UsersService } from '../../users/users.service';
import { RedisService } from '../redis.service';
import * as bcrypt from 'bcrypt';

describe('Auth E2E Tests', () => {
  let app: INestApplication;
  let usersService: UsersService;
  let redisService: RedisService;

  const testUser = {
    username: 'e2euser',
    password: 'password123',
    roles: ['User'],
  };

  const testAttendant = {
    username: 'e2eattendant',
    password: 'password123',
    roles: ['Attendant'],
    clinics: ['clinic123', 'clinic456'],
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

    usersService = moduleFixture.get<UsersService>(UsersService);
    redisService = moduleFixture.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up any existing test users and Redis tokens
    const existingUser = await usersService.findByUsername(testUser.username);
    if (existingUser) {
      await redisService.removeToken(existingUser._id.toString());
    }

    const existingAttendant = await usersService.findByUsername(
      testAttendant.username,
    );
    if (existingAttendant) {
      await redisService.removeToken(existingAttendant._id.toString());
    }
  });

  describe('Signup Flow', () => {
    it('should create a new user and return access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');

      // Verify user was created
      const user = await usersService.findByUsername(testUser.username);
      expect(user).toBeDefined();
      expect(user.username).toBe(testUser.username);
      expect(user.roles).toEqual(testUser.roles);

      // Verify password was hashed
      const isPasswordHashed = await bcrypt.compare(
        testUser.password,
        user.password,
      );
      expect(isPasswordHashed).toBe(true);

      // Verify token was stored in Redis
      const storedToken = await redisService.getToken(user._id.toString());
      expect(storedToken).toBe(response.body.accessToken);
    });
  });

  describe('Login Standard Flow', () => {
    let createdUserId: string;

    beforeEach(async () => {
      // Create user for login tests
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser);

      const user = await usersService.findByUsername(testUser.username);
      createdUserId = user._id.toString();
    });

    it('should login with valid credentials and return access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');

      // Verify token was stored in Redis
      const storedToken = await redisService.getToken(createdUserId);
      expect(storedToken).toBe(response.body.accessToken);
    });

    it('should return 401 for invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should return 401 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('Login Attendant Flow', () => {
    let createdAttendantId: string;

    beforeEach(async () => {
      // Create attendant user
      const hashedPassword = await bcrypt.hash(testAttendant.password, 10);
      const attendant = await usersService.create({
        ...testAttendant,
        password: hashedPassword,
      });
      createdAttendantId = attendant._id.toString();
    });

    it('should login attendant with valid clinic ID', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login/attendant')
        .send({
          username: testAttendant.username,
          password: testAttendant.password,
          clinicId: 'clinic123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');

      // Verify token was stored in Redis
      const storedToken = await redisService.getToken(createdAttendantId);
      expect(storedToken).toBe(response.body.accessToken);
    });

    it('should return 401 for unauthorized clinic ID', async () => {
      await request(app.getHttpServer())
        .post('/auth/login/attendant')
        .send({
          username: testAttendant.username,
          password: testAttendant.password,
          clinicId: 'unauthorizedClinic',
        })
        .expect(401);
    });
  });

  describe('Protected Route Access', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      // Signup and get token
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser);

      accessToken = signupResponse.body.accessToken;

      const user = await usersService.findByUsername(testUser.username);
      userId = user._id.toString();
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/protected')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/protected').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/protected')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  describe('Logout Flow', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      // Signup and get token
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser);

      accessToken = signupResponse.body.accessToken;

      const user = await usersService.findByUsername(testUser.username);
      userId = user._id.toString();
    });

    it('should logout and invalidate token', async () => {
      // Verify token works before logout
      await request(app.getHttpServer())
        .get('/auth/protected')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(logoutResponse.body).toEqual({ success: true });

      // Verify token is removed from Redis
      const storedToken = await redisService.getToken(userId);
      expect(storedToken).toBeNull();

      // Verify token no longer works
      await request(app.getHttpServer())
        .get('/auth/protected')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  describe('Full E2E Flow', () => {
    it('should complete signup → login → access protected → logout → access protected (401)', async () => {
      // 1. Signup
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(201);

      const signupToken = signupResponse.body.accessToken;

      // 2. Access protected route with signup token
      await request(app.getHttpServer())
        .get('/auth/protected')
        .set('Authorization', `Bearer ${signupToken}`)
        .expect(200);

      // 3. Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      const loginToken = loginResponse.body.accessToken;

      // 4. Access protected route with login token
      await request(app.getHttpServer())
        .get('/auth/protected')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      // 5. Old signup token should no longer work (overwritten by login)
      await request(app.getHttpServer())
        .get('/auth/protected')
        .set('Authorization', `Bearer ${signupToken}`)
        .expect(401);

      // 6. Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      // 7. Access protected route should fail after logout
      await request(app.getHttpServer())
        .get('/auth/protected')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(401);
    });
  });
});
