# Feature Registry — Medicano Backend

This file is the canonical inventory of every file, class, and method that already
exists in the codebase. Before creating anything, check here first.
If it is listed here, **do not recreate it** — import it from the path shown.

Last updated: 2026-04-23 (sprint-01-auth implementation complete)

---

## Shared Types — `packages/types`

| File | Exists | Exports |
|---|---|---|
| `packages/types/package.json` | ✅ | package name: `@medicano/types` |
| `packages/types/tsconfig.json` | ✅ | — |
| `packages/types/src/auth.ts` | ❌ needs creation | UserRole, IUser, IClinic, IProfessional, IClinicProfessional, IAuthTokens, ILoginStandardDto, ILoginAttendantDto |
| `packages/types/src/index.ts` | ❌ needs creation | re-exports from ./auth |

---

## Common — `apps/api/src/common`

### `common/enums/role.enum.ts` ✅
```typescript
export enum Role {
  PATIENT = 'patient',
  CLINIC = 'clinic',
  PROFESSIONAL = 'professional',
  ATTENDANT = 'attendant',
}
```

### `common/decorators/current-user.decorator.ts` ✅
```typescript
export const CurrentUser = createParamDecorator(...)
// Returns: request.user?.userId (string)
```

### `common/filters/all-exceptions.filter.ts` ✅
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter
// catch(exception, host): returns { statusCode, message, timestamp }
```

---

## Redis — `apps/api/src/redis`

### `redis/redis.service.ts` ✅
```typescript
@Injectable()
export class RedisService
// Reads: REDIS_HOST (default 'localhost'), REDIS_PORT (default 6379) from ConfigService
// ioredis client created in constructor (no OnModuleInit)
// Redis key pattern: auth:token:{userId}

saveToken(userId: string, token: string, ttl: number): Promise<void>
getToken(userId: string): Promise<string | null>
validateToken(userId: string, token: string): Promise<boolean>
  // returns true if storedToken === token
removeToken(userId: string): Promise<void>
```

### `redis/redis.module.ts` ✅
```typescript
@Global()
@Module({ providers: [RedisService], exports: [RedisService] })
export class RedisModule
// Global — import once in AppModule; RedisService is available everywhere
```

---

## Auth — `apps/api/src/auth`

### `auth/schemas/user.schema.ts` ✅
```typescript
@Schema({ timestamps: true })
export class User
  role: Role               // immutable, required
  email?: string           // unique sparse
  username?: string        // unique sparse
  clinicId?: Types.ObjectId  // ref: 'Clinic', sparse
  passwordHash: string     // select: false — NEVER query without .select('+passwordHash')

export type UserDocument = User & Document
export const UserSchema = SchemaFactory.createForClass(User)
// Compound indexes:
//   { role, email } unique sparse
//   { clinicId, username } unique sparse
```

### `auth/dto/signup.dto.ts` ✅
```typescript
export class SignupDto
  role: Role          // @IsEnum — required
  email?: string      // @IsEmail @IsOptional
  username?: string   // @IsString @IsOptional
  clinicId?: string   // @IsMongoId @IsOptional
  password: string    // @IsString @MinLength(8)
```

### `auth/dto/login-standard.dto.ts` ✅
```typescript
export class LoginStandardDto
  email: string    // @IsEmail
  password: string // @IsString @MinLength(8)
```

### `auth/dto/login-attendant.dto.ts` ✅
```typescript
export class LoginAttendantDto
  clinicId: string  // @IsMongoId
  username: string  // @IsString
  password: string  // @IsString @MinLength(8)
```

### `auth/jwt.strategy.ts` ✅
```typescript
// JwtPayload (inline interface): { sub: string; role: Role }
// Location: auth/jwt.strategy.ts (directly in auth/, NOT in a strategies/ subfolder)
// Test imports: import { JwtStrategy } from '../jwt.strategy'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy)
// constructor: reads JWT_SECRET from ConfigService (default 'default-secret')
// ExtractJwt.fromAuthHeaderAsBearerToken()

validate(payload: JwtPayload): Promise<{ userId: string; role: Role }>
// Calls redisService.getToken(payload.sub)
// Throws UnauthorizedException if null (token revoked)
// Returns { userId: payload.sub, role: payload.role }
```

### `auth/guards/jwt-auth.guard.ts` ✅
```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt')
```

### `auth/auth.service.ts` ✅
```typescript
@Injectable()
export class AuthService
// TOKEN_TTL = 7 * 24 * 3600 (604800s)
// STANDARD_ROLES = [Role.PATIENT, Role.CLINIC, Role.PROFESSIONAL]

signup(dto: SignupDto): Promise<{ accessToken: string }>
  // calls usersService.createUser(dto)
  // signs JWT { sub: userId, role }
  // saves token to Redis with TOKEN_TTL

loginStandard(dto: LoginStandardDto): Promise<{ accessToken: string }>
  // tries findByEmailAndRole for each role in STANDARD_ROLES until found
  // throws UnauthorizedException if not found or wrong password

loginAttendant(dto: LoginAttendantDto): Promise<{ accessToken: string }>
  // calls usersService.findByClinicIdAndUsername(clinicId, username)
  // throws UnauthorizedException if not found or wrong password

logout(userId: string): Promise<void>
  // calls redisService.removeToken(userId)
```

### `auth/auth.controller.ts` ✅
```typescript
@Controller('auth')
export class AuthController
  POST /auth/signup            → authService.signup()          @HttpCode(201) — default
  POST /auth/login             → authService.loginStandard()   @HttpCode(200)
  POST /auth/login/attendant   → authService.loginAttendant()  @HttpCode(200)
  POST /auth/logout            → authService.logout()          @HttpCode(204) @UseGuards(JwtAuthGuard)
// logout uses @CurrentUser() to extract userId from JWT
```

### `auth/auth.module.ts` ✅
```typescript
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({ secret: JWT_SECRET, expiresIn: '7d' }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule
// Does NOT import RedisModule — RedisService is available via @Global() RedisModule in AppModule
// Does NOT import MongooseModule — User model is registered in UsersModule
```

### Auth tests — `auth/tests/` ✅
```
auth/tests/auth.service.spec.ts    — 9 tests, all pass
auth/tests/redis.service.spec.ts   — 8 tests, all pass
auth/tests/jwt.strategy.spec.ts    — 3 tests, all pass
auth/tests/auth.e2e.spec.ts        — 9 tests, require MongoDB + Redis (skip in unit CI)
```

---

## Users — `apps/api/src/users`

### `users/dto/create-user.dto.ts` ✅
```typescript
export class CreateUserDto
  role: Role          // @IsEnum — required
  email?: string      // @IsEmail @IsOptional
  username?: string   // @IsString @IsOptional
  clinicId?: string   // @IsMongoId @IsOptional
  password: string    // @IsString @MinLength(8) — hashed inside UsersService.createUser
```

### `users/dto/update-user.dto.ts` ✅
```typescript
export class UpdateUserDto   // role is immutable — never in update DTO
  email?: string      // @IsEmail @IsOptional
  username?: string   // @IsString @IsOptional
  clinicId?: string   // @IsMongoId @IsOptional
```

### `users/users.service.ts` ✅
```typescript
@Injectable()
export class UsersService
// Injects: Model<UserDocument> (User schema registered in UsersModule)

createUser(dto: CreateUserDto): Promise<UserDocument>
  // hashes dto.password with bcrypt cost 12, stores as passwordHash
  // catches MongoError 11000 → ConflictException('User already exists')

comparePassword(password: string, passwordHash: string): Promise<boolean>
  // bcrypt.compare — use after querying with .select('+passwordHash')

getById(id: string): Promise<UserDocument>
  // validates ObjectId → NotFoundException for invalid id or not found

findByEmailAndRole(email: string, role: Role): Promise<UserDocument | null>
  // .select('+passwordHash') — returns null if not found

findByClinicIdAndUsername(clinicId: string, username: string): Promise<UserDocument | null>
  // .select('+passwordHash') — returns null if not found
```

### `users/users.controller.ts` ✅
```typescript
@Controller('users') @UseGuards(JwtAuthGuard)
export class UsersController
  GET /users/:id → usersService.getById()
```

### `users/users.module.ts` ✅
```typescript
@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule
// User schema is imported from auth/schemas/user.schema.ts
// AuthModule imports UsersModule to access UsersService
```

---

## Clinics — `apps/api/src/clinics`

### `clinics/schemas/clinic.schema.ts` ✅
```typescript
export enum SubscriptionStatus {
  ACTIVE = 'active', INACTIVE = 'inactive', TRIAL = 'trial'
}

@Schema({ timestamps: true })
export class Clinic
  name: string                                // required
  subscriptionStatus: SubscriptionStatus      // default: TRIAL

export type ClinicDocument = Clinic & Document
export const ClinicSchema = SchemaFactory.createForClass(Clinic)
```

### `clinics/dto/create-clinic.dto.ts` ✅
```typescript
export class CreateClinicDto
  name: string                      // @IsString @IsNotEmpty
  subscriptionStatus?: SubscriptionStatus  // @IsEnum @IsOptional
```

### `clinics/dto/update-clinic.dto.ts` ✅
```typescript
export class UpdateClinicDto  // all fields optional
  name?: string
  subscriptionStatus?: SubscriptionStatus
```

### `clinics/clinics.service.ts` ✅
```typescript
@Injectable()
export class ClinicsService
  create(dto: CreateClinicDto): Promise<ClinicDocument>
  findAll(): Promise<ClinicDocument[]>
  findById(id: string): Promise<ClinicDocument>      // validates ObjectId, throws NotFoundException
  update(id: string, dto: UpdateClinicDto): Promise<ClinicDocument>
  remove(id: string): Promise<{ success: boolean }>
```

### `clinics/clinics.controller.ts` ✅
```typescript
@Controller('clinics') @UseGuards(JwtAuthGuard)
export class ClinicsController
  POST   /clinics       → create()
  GET    /clinics       → findAll()
  GET    /clinics/:id   → findOne()
  PUT    /clinics/:id   → update()
  DELETE /clinics/:id   → remove()
```

### `clinics/clinics.module.ts` ✅
```typescript
@Module({
  imports: [MongooseModule.forFeature([Clinic])],
  providers: [ClinicsService],
  exports: [ClinicsService],
})
export class ClinicsModule
```

---

## Professionals — `apps/api/src/professionals`

### `professionals/schemas/professional.schema.ts` ✅
```typescript
@Schema({ timestamps: true })
export class Professional
  specialty: string          // required
  userId: Types.ObjectId     // ref: 'User', required, unique

export type ProfessionalDocument = Professional & Document
export const ProfessionalSchema = SchemaFactory.createForClass(Professional)
```

### `professionals/schemas/clinic-professional.schema.ts` ✅
```typescript
@Schema({ timestamps: true })
export class ClinicProfessional
  clinicId: Types.ObjectId        // ref: 'Clinic', required
  professionalId: Types.ObjectId  // ref: 'Professional', required
// Compound unique index: { clinicId, professionalId }

export type ClinicProfessionalDocument = ClinicProfessional & Document
export const ClinicProfessionalSchema = SchemaFactory.createForClass(ClinicProfessional)
```

### `professionals/dto/create-professional.dto.ts` ✅
```typescript
export class CreateProfessionalDto
  specialty: string  // @IsString @IsNotEmpty
  userId: string     // @IsMongoId @IsNotEmpty
```

### `professionals/dto/update-professional.dto.ts` ✅
```typescript
export class UpdateProfessionalDto
  specialty?: string  // @IsString @IsNotEmpty @IsOptional
```

### `professionals/professionals.service.ts` ✅
```typescript
@Injectable()
export class ProfessionalsService
  create(dto: CreateProfessionalDto): Promise<ProfessionalDocument>
    // validates userId ObjectId; catches 11000 → ConflictException
  findAll(): Promise<ProfessionalDocument[]>
  findById(id: string): Promise<ProfessionalDocument>
  update(id: string, dto: UpdateProfessionalDto): Promise<ProfessionalDocument>
  remove(id: string): Promise<{ success: boolean }>
```

### `professionals/professionals.controller.ts` ✅
```typescript
@Controller('professionals') @UseGuards(JwtAuthGuard)
export class ProfessionalsController
  POST   /professionals       → create()
  GET    /professionals       → findAll()
  GET    /professionals/:id   → findOne()
  PUT    /professionals/:id   → update()
  DELETE /professionals/:id   → remove()
```

### `professionals/professionals.module.ts` ✅
```typescript
@Module({
  imports: [MongooseModule.forFeature([Professional])],
  providers: [ProfessionalsService],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule
```

### `professionals/clinic-professionals.service.ts` ✅
```typescript
@Injectable()
export class ClinicProfessionalsService
  assignProfessionalToClinic(clinicId, professionalId): Promise<ClinicProfessionalDocument>
    // validates both ObjectIds; verifies clinic and professional exist; catches 11000
  getProfessionalsByClinic(clinicId): Promise<ProfessionalDocument[]>
    // validates ObjectId; verifies clinic exists; returns professionals via ClinicProfessional join
  removeProfessionalFromClinic(clinicId, professionalId): Promise<{ success: boolean }>
    // throws NotFoundException if assignment not found
```

### `professionals/clinic-professionals.controller.ts` ✅
```typescript
@Controller('clinics') @UseGuards(JwtAuthGuard)
export class ClinicProfessionalsController
  POST   /clinics/:clinicId/professionals/:professionalId → assignProfessionalToClinic()
  GET    /clinics/:clinicId/professionals                 → getProfessionalsByClinic()
  DELETE /clinics/:clinicId/professionals/:professionalId → removeProfessionalFromClinic()
```

### `professionals/clinic-professionals.module.ts` ✅
```typescript
@Module({
  imports: [
    MongooseModule.forFeature([ClinicProfessional, Professional]),
    ClinicsModule,
    ProfessionalsModule,
  ],
  providers: [ClinicProfessionalsService],
  exports: [ClinicProfessionalsService],
})
export class ClinicProfessionalsModule
```

---

## App Root — `apps/api/src`

### `app.module.ts` ✅
Imports: ConfigModule (global), MongooseModule (forRootAsync), RedisModule (global),
AuthModule, UsersModule, ClinicsModule, ProfessionalsModule, ClinicProfessionalsModule

### `main.ts` ✅
Bootstrap: ValidationPipe (whitelist, forbidNonWhitelisted, transform), AllExceptionsFilter,
enableCors(), port from `process.env.PORT ?? 3000`

---

## What Needs to Be Built (Next Sprints)

| Module | Status | Notes |
|---|---|---|
| `packages/types/src/` | ❌ Not created | auth.ts and index.ts needed |
| `auth/decorators/roles.decorator.ts` | ❌ Not created | `@Roles(...roles)` decorator |
| `auth/guards/roles.guard.ts` | ❌ Not created | `RolesGuard` |
| `appointments` module | ❌ Not started | Full CRUD + conflict detection |
| `chat` module | ❌ Not started | ChatSession with LLM integration |
| `subscriptions` module | ❌ Not started | Plan management |
