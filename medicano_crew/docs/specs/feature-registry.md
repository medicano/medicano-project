# Feature Registry — Medicano Backend

This file is the canonical inventory of every file, class, and method that already
exists in the codebase. Before creating anything, check here first.
If it is listed here, **do not recreate it** — import it from the path shown.

Last updated: 2026-04-23 (sprint-01-auth complete)

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
export class RedisService implements OnModuleInit, OnModuleDestroy
// Reads: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB from ConfigService
// Redis key pattern: auth:token:{userId}

saveToken(userId: string, token: string, ttl: number): Promise<void>
getToken(userId: string): Promise<string | null>
removeToken(userId: string): Promise<void>
```

### `redis/redis.module.ts` ✅
```typescript
@Global()
@Module({ providers: [RedisService], exports: [RedisService] })
export class RedisModule
// Global — RedisService is available everywhere without importing RedisModule
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

### `auth/interfaces/jwt-payload.interface.ts` ✅
```typescript
export interface JwtPayload {
  sub: string;       // userId
  username: string;  // NOTE: current impl uses username; target spec uses role
}
```

> ⚠️ **Known deviation**: Current `JwtPayload` has `username` instead of `role`. Target spec requires `{ sub: string; role: Role }`. When rewriting auth, fix this.

### `auth/jwt.strategy.ts` ✅
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy)
// Location: auth/jwt.strategy.ts (directly in auth/, NOT in a strategies/ subfolder)
// Test imports: import { JwtStrategy } from '../jwt.strategy'

validate(payload: JwtPayload): Promise<{ userId: string; username: string }>
// Checks redisService.getToken(payload.sub) — throws UnauthorizedException if null
```

### `auth/guards/jwt-auth.guard.ts` ✅
```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt')
```

### `auth/constants.ts` ✅
Contains JWT-related constants.

### `auth/dto/signup.dto.ts` ✅
```typescript
export class SignupDto
  role: Role
  email?: string
  username?: string
  clinicId?: string
  password: string
```

### `auth/dto/login-standard.dto.ts` ✅
```typescript
export class LoginStandardDto
  email: string
  password: string
```

### `auth/dto/login-attendant.dto.ts` ✅
```typescript
export class LoginAttendantDto
  clinicId: string   // @IsMongoId()
  username: string
  password: string
```

### `auth/dto/login.dto.ts` ✅
```typescript
export class LoginDto   // legacy generic login DTO
  email: string
  password: string
```

### `auth/dto/logout.dto.ts` ✅
```typescript
export class LogoutDto
```

### `auth/dto/auth-response.dto.ts` ✅
```typescript
export class AuthResponseDto
  accessToken: string
  expiresIn: number   // 604800
```

### `auth/auth.service.ts` ✅

> ⚠️ **Known deviations from spec**:
> - Uses `@InjectModel(User.name)` directly — does not use `UsersService`
> - `bcrypt.hash(password, 10)` — spec requires cost **12**
> - Only one login method (`loginStandard`) using generic `LoginDto` — attendant login not implemented
> - Has extra `validateUser(userId)` method not in spec

```typescript
@Injectable()
export class AuthService
  signup(signupDto: SignupDto): Promise<AuthResponseDto>
  loginStandard(loginDto: LoginDto): Promise<AuthResponseDto>
  logout(userId: string): Promise<void>
  validateUser(userId: string): Promise<UserDocument>
```

### `auth/auth.controller.ts` ✅
```typescript
@Controller('auth')
export class AuthController
  POST /auth/signup         → authService.signup()         @HttpCode(201)
  POST /auth/login          → authService.loginStandard()  @HttpCode(200)
  POST /auth/logout         → authService.logout()         @HttpCode(204) @UseGuards(JwtAuthGuard)
```

### `auth/auth.module.ts` ✅
```typescript
@Module({
  imports: [PassportModule, JwtModule (registerAsync), MongooseModule(User), RedisModule],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule
```

### Auth tests — `auth/tests/` ✅
```
auth/tests/auth.service.spec.ts
auth/tests/redis.service.spec.ts
auth/tests/jwt.strategy.spec.ts
auth/tests/auth.e2e.spec.ts
```

---

## Users — `apps/api/src/users`

### `users/users.service.ts` ✅

> ⚠️ **Known deviation**: Spec (sprint-01 prompt 5) calls for `hashPassword`, `comparePassword`,
> `createUser`, and a `UsersRepository`. Current implementation is a simpler read-only service.

```typescript
@Injectable()
export class UsersService
  findById(id: string): Promise<UserDocument | null>
  findByEmail(email: string): Promise<UserDocument | null>
  findAll(): Promise<UserDocument[]>
  delete(id: string): Promise<void>
```

### `users/users.module.ts` ✅
```typescript
@Module({
  imports: [MongooseModule.forFeature([User])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule
```

> **Missing**: `UsersRepository` — not yet created.

---

## Clinics — `apps/api/src/clinics`

### `clinics/schemas/clinic.schema.ts` ✅
```typescript
export enum SubscriptionStatus {
  ACTIVE = 'active', INACTIVE = 'inactive', TRIAL = 'trial'
}

@Schema({ timestamps: true })
export class Clinic
  name: string            // required
  subscriptionStatus: SubscriptionStatus  // default: TRIAL

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
Imports: ConfigModule (global), MongooseModule (forRootAsync), RedisModule, AuthModule,
UsersModule, ClinicsModule, ProfessionalsModule, ClinicProfessionalsModule

### `main.ts` ✅
Bootstrap: ValidationPipe (whitelist, forbidNonWhitelisted, transform), AllExceptionsFilter,
enableCors(), port from `process.env.PORT ?? 3000`

---

## What Needs to Be Built (Next Sprints)

| Module | Status | Notes |
|---|---|---|
| `packages/types/src/` | ❌ Not created | auth.ts and index.ts needed |
| `auth` — attendant login | ❌ Missing | `loginAttendant(dto: LoginAttendantDto)` not implemented |
| `auth` — bcrypt cost | ⚠️ Wrong (10) | Must be **12** |
| `auth` — JWT payload | ⚠️ Has `username` | Should have `role: Role` per spec |
| `users` — UsersRepository | ❌ Missing | hashPassword, comparePassword, createUser pattern |
| `auth/decorators/roles.decorator.ts` | ❌ Not created | `@Roles(...roles)` decorator |
| `auth/guards/roles.guard.ts` | ❌ Not created | `RolesGuard` |
| `appointments` module | ❌ Not started | Full CRUD + conflict detection |
| `chat` module | ❌ Not started | ChatSession with LLM integration |
| `subscriptions` module | ❌ Not started | Plan management |
