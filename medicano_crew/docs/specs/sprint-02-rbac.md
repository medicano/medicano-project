# Sprint 02 — RBAC + Shared Types

## Objective

Add role-based access control (RBAC) to the existing API and create the shared TypeScript interfaces package used by both backend and frontend.

## Scope

- Shared types package (`@medicano/types`)
- `@Roles()` decorator
- `RolesGuard`
- Apply guards to existing controllers

## Shared Types — `packages/types/src`

### `auth.ts`

```typescript
export enum UserRole {
  PATIENT = 'patient',
  CLINIC = 'clinic',
  PROFESSIONAL = 'professional',
  ATTENDANT = 'attendant',
}

export interface IUser {
  _id: string;
  role: UserRole;
  email?: string;
  username?: string;
  clinicId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClinic {
  _id: string;
  name: string;
  subscriptionStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProfessional {
  _id: string;
  specialty: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClinicProfessional {
  _id: string;
  clinicId: string;
  professionalId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthTokens {
  accessToken: string;
}

export interface ILoginStandardDto {
  email: string;
  password: string;
}

export interface ILoginAttendantDto {
  clinicId: string;
  username: string;
  password: string;
}
```

### `index.ts`

Re-exports everything from `./auth`.

## RBAC — `apps/api/src/auth`

### `decorators/roles.decorator.ts`

```typescript
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### `guards/roles.guard.ts`

- Implements `CanActivate`
- Reads `ROLES_KEY` metadata via `Reflector.getAllAndOverride`
- Returns `true` when no `@Roles()` is set (public-to-all-authenticated routes)
- Checks `request.user.role` (set by `JwtStrategy.validate`) against required roles

**Must always be applied after `JwtAuthGuard`** — depends on `request.user` being populated.

## Controller Updates

Apply `@UseGuards(JwtAuthGuard, RolesGuard)` at class level. Add `@Roles()` only on mutation methods.

| Controller | Method | Roles |
|---|---|---|
| `ClinicsController` | POST, PUT, DELETE | `CLINIC` |
| `ProfessionalsController` | POST, PUT, DELETE | `CLINIC` |
| `ClinicProfessionalsController` | POST, DELETE | `CLINIC`, `ATTENDANT` |
| GET endpoints | any | no `@Roles` (all authenticated) |

## Tests

- `auth/tests/roles.guard.spec.ts` — unit tests for `RolesGuard`
  - should allow access when no roles required
  - should allow access when user role matches
  - should deny access when user role does not match
  - should deny access when user is undefined

## Files to Create

| File | Action |
|---|---|
| `packages/types/src/auth.ts` | Create |
| `packages/types/src/index.ts` | Create |
| `apps/api/src/auth/decorators/roles.decorator.ts` | Create |
| `apps/api/src/auth/guards/roles.guard.ts` | Create |
| `apps/api/src/auth/tests/roles.guard.spec.ts` | Create |

## Files to Update

| File | Change |
|---|---|
| `apps/api/src/clinics/clinics.controller.ts` | Add `RolesGuard` + `@Roles` on mutations |
| `apps/api/src/professionals/professionals.controller.ts` | Add `RolesGuard` + `@Roles` on mutations |
| `apps/api/src/professionals/clinic-professionals.controller.ts` | Add `RolesGuard` + `@Roles` on mutations |

## Definition of Done

- [ ] `@medicano/types` compiles and exports all interfaces
- [ ] `RolesGuard` passes unit tests
- [ ] Existing 20 tests still pass after controller changes
- [ ] `tsc --noEmit` passes
