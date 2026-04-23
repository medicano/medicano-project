# CONVENTIONS.md — Medicano Backend Development Guide for Aider

This document is the single source of truth for all code you write in this project.
Read it entirely before touching any file. Follow every rule exactly.

---

## Project Context

Medicano is a healthcare scheduling platform with four user roles:
- **patient** — books appointments, no subscription
- **clinic** — healthcare organization, manages professionals and attendants, group plan
- **professional** — independent health provider, individual plan
- **attendant** — clinic employee, logs in with username+clinicId (no email)

---

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11 · TypeScript 5 · class-validator |
| Database | MongoDB (Mongoose 9) |
| Cache/Auth | Redis (ioredis 5) — revocable JWT tokens |
| Auth | Passport.js · passport-jwt · bcrypt (cost **12**) |
| Shared types | `@medicano/types` (packages/types) |

---

## Module Folder Structure

Every domain lives in its own folder under `apps/api/src/`. The internal layout is always:

```
src/
└── <domain>/
    ├── dto/
    │   ├── create-<domain>.dto.ts
    │   └── update-<domain>.dto.ts
    ├── schemas/
    │   └── <domain>.schema.ts
    ├── tests/
    │   └── <domain>.service.spec.ts
    ├── <domain>.controller.ts
    ├── <domain>.module.ts
    └── <domain>.service.ts
```

**Exceptions** (fixed locations, never move):
- `auth/schemas/user.schema.ts` — the User schema lives here; import it from here
- `auth/jwt.strategy.ts` — JWT Passport strategy (NOT in strategies/ subfolder)
- `auth/guards/jwt-auth.guard.ts` — JWT guard
- `auth/interfaces/jwt-payload.interface.ts` — JWT payload shape
- `common/enums/role.enum.ts` — the Role enum; import it from here
- `common/decorators/current-user.decorator.ts` — @CurrentUser(); import it from here
- `common/filters/all-exceptions.filter.ts` — global exception filter
- `redis/redis.service.ts` and `redis/redis.module.ts` — global Redis module

---

## Canonical Imports — Never Recreate These

Before writing any import, check if the symbol already exists:

```typescript
// Role enum
import { Role } from '../common/enums/role.enum';

// User schema and document type
import { User, UserDocument, UserSchema } from '../auth/schemas/user.schema';

// @CurrentUser() decorator
import { CurrentUser } from '../common/decorators/current-user.decorator';

// JwtStrategy (lives directly in auth/, not in strategies/)
import { JwtStrategy } from '../auth/jwt.strategy';

// JwtAuthGuard
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// RedisService (injected automatically — module is @Global())
import { RedisService } from '../redis/redis.service';

// Shared types package
import { IAuthTokens, UserRole } from '@medicano/types';
```

If any of these already exist in the file, do not add a duplicate import.

---

## Naming Conventions

| What | Pattern | Example |
|---|---|---|
| Classes | PascalCase | `ClinicsService` |
| Methods and variables | camelCase | `findByEmail`, `passwordHash` |
| Files | kebab-case | `clinic-professionals.service.ts` |
| Enum keys | SCREAMING_SNAKE_CASE | `SUBSCRIPTION_STATUS` |
| Enum values | lowercase string | `'active'`, `'patient'` |
| Constants | SCREAMING_SNAKE_CASE | `TOKEN_TTL`, `REDIS_KEY_PREFIX` |
| Interfaces | PascalCase + suffix | `JwtPayload`, `AuthTokens` |
| DTOs | PascalCase + suffix | `CreateClinicDto`, `SignupDto` |

Variable names must reveal intent. Never use `data`, `obj`, `res`, `val`, `p`, `u` as variable names.

```typescript
// Wrong
const u = await this.userModel.findOne({ email });
const pwd = await bcrypt.hash(p, 12);

// Correct
const existingUser = await this.userModel.findOne({ email });
const passwordHash = await bcrypt.hash(password, 12);
```

---

## Schema Pattern

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })  // always include timestamps
export class Clinic {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  subscriptionStatus: SubscriptionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
}

export type ClinicDocument = Clinic & Document;
export const ClinicSchema = SchemaFactory.createForClass(Clinic);
// Add compound indexes after SchemaFactory.createForClass():
ClinicSchema.index({ userId: 1 }, { unique: true });
```

Rules:
- Always `{ timestamps: true }` on `@Schema`
- Export pattern: `XDocument = X & Document`, `XSchema = SchemaFactory.createForClass(X)`
- Password field is always named `passwordHash`, never `password`, always `select: false`
- ObjectId references use `Types.ObjectId` with a `ref` string

---

## DTO Pattern

```typescript
import { IsString, IsEmail, MinLength, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class SignupDto {
  @IsEnum(Role)
  readonly role: Role;

  @IsEmail()
  @IsOptional()
  readonly email?: string;

  @IsString()
  @IsOptional()
  readonly username?: string;

  @IsMongoId()
  @IsOptional()
  readonly clinicId?: string;

  @IsString()
  @MinLength(8)
  readonly password: string;
}
```

Rules:
- All DTO fields are `readonly`
- Optional fields use `?` **and** `@IsOptional()` together
- Update DTOs have all fields optional — do **not** use `PartialType(CreateDto)`
- Use `@IsMongoId()` for ObjectId fields, not `@IsString()`

---

## Service Pattern

```typescript
@Injectable()
export class ClinicsService {
  constructor(
    @InjectModel(Clinic.name) private readonly clinicModel: Model<ClinicDocument>,
  ) {}

  async findById(id: string): Promise<ClinicDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid clinic ID: ${id}`);
    }
    const clinic = await this.clinicModel.findById(id).exec();
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${id} not found`);
    }
    return clinic;
  }

  async create(dto: CreateClinicDto): Promise<ClinicDocument> {
    try {
      return await new this.clinicModel(dto).save();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('Clinic already exists');
      }
      throw error;
    }
  }
}
```

Rules:
- Always validate ObjectId with `Types.ObjectId.isValid(id)` before any DB call
- Throw `NotFoundException` when a resource is not found
- Catch MongoDB error code `11000` and throw `ConflictException`
- Throw `BadRequestException` for invalid input that passes DTO validation
- Never expose raw Mongoose errors — always rethrow as NestJS exceptions
- Never use `console.log` — use NestJS `Logger` if logging is needed
- Always type the return of every public method

---

## Controller Pattern

```typescript
@Controller('clinics')
@UseGuards(JwtAuthGuard)
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() createClinicDto: CreateClinicDto): Promise<ClinicDocument> {
    return this.clinicsService.create(createClinicDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ClinicDocument> {
    return this.clinicsService.findById(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.clinicsService.remove(id);
  }
}
```

Rules:
- Controllers contain zero business logic — only receive, delegate, return
- All routes protected by `@UseGuards(JwtAuthGuard)` unless explicitly public
- Use `@CurrentUser()` to get the userId from the JWT, never `@Req()`
- Always explicit `@HttpCode()` when the status is not the framework default
- Logout returns `@HttpCode(204)` with no body
- Explicit return types on all methods — no `any`

---

## Module Pattern

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Clinic.name, schema: ClinicSchema }]),
    AuthModule,  // only if you need JwtAuthGuard
  ],
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService],  // export only what other modules need
})
export class ClinicsModule {}
```

Rules:
- Always define `exports` — even if empty, make the decision explicit
- Export the service if other modules import this module and call its methods
- Export `MongooseModule` if other modules need the same model registered

---

## Authentication — Business Rules (Never Violate)

| Rule | Detail |
|---|---|
| Password field name | Always `passwordHash` in the database — never `password` |
| bcrypt cost | Always **12** |
| JWT TTL | 7 days = `604800` seconds |
| Redis validation | Every protected request: JWT signature valid **AND** token present in Redis |
| Logout | Immediately removes token from Redis regardless of JWT expiry |
| Login — patient/clinic/professional | `email` + `password` |
| Login — attendant | `clinicId` + `username` + `password` (no email) |
| Signup | Creates user and returns token immediately (auto-login) |
| Role | Set at signup via `role` field; immutable — never allow changing it |
| Username uniqueness | Scoped per clinic — `(clinicId, username)` unique, not globally |

Redis key pattern: `auth:token:{userId}`

JWT payload shape:
```typescript
interface JwtPayload {
  sub: string;   // userId
  role: Role;    // user role
}
```

`JwtStrategy.validate()` must:
1. Call `redisService.getToken(payload.sub)`
2. If null → throw `UnauthorizedException('Session expired or revoked')`
3. Return `{ userId: payload.sub, role: payload.role }`

---

## Test Pattern

```typescript
describe('ClinicsService', () => {
  let clinicsService: ClinicsService;

  const mockClinicModel = {
    findById: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicsService,
        { provide: getModelToken(Clinic.name), useValue: mockClinicModel },
      ],
    }).compile();
    clinicsService = module.get<ClinicsService>(ClinicsService);
  });

  afterEach(() => jest.clearAllMocks());  // required — prevents mock state bleed

  it('should throw NotFoundException for invalid ObjectId', async () => {
    await expect(clinicsService.findById('invalid')).rejects.toThrow(NotFoundException);
  });
});
```

For Mongoose model mocks used with `new this.model(dto).save()`, use a constructor function:

```typescript
function MockUserModel(this: any, dto: any) {
  Object.assign(this, { ...dto, _id: { toString: () => 'mock-id' }, save: mockSave });
}
MockUserModel.findOne = jest.fn();
MockUserModel.findById = jest.fn();
```

Rules:
- Never use real DB connections in unit tests — always mock with `jest.fn()`
- `afterEach(() => jest.clearAllMocks())` is mandatory in every describe block
- E2E tests use real `AppModule` with `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`
- Test behavior, not implementation

---

## AppModule Registration

Every new module must be added to `apps/api/src/app.module.ts` imports array.
Check the file before adding — never duplicate an import.

---

## Never Do

- Create a file outside the module structure defined above
- Duplicate a schema, enum, decorator, or service that already exists — import it instead
- Import `User` schema from anywhere other than `auth/schemas/user.schema`
- Import `Role` from anywhere other than `common/enums/role.enum`
- Save a plain password string to the DB — always hash with bcrypt cost **12**
- Use `any` explicitly in production code
- Use `console.log` — use NestJS `Logger`
- Add logic to a controller — controllers only delegate
- Create a module without deciding what it exports
- Generate partial files — always write the complete file
- Write `// TODO` comments — implement it or don't include it
