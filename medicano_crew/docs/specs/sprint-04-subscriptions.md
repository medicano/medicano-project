# Sprint 04 — Subscriptions

## Objective

Manage clinic subscription plans and enforce professional count limits based on the active plan.

## Dependencies

- Sprint 02 (RBAC)
- Sprint 03 (Appointments) — optional, no hard dependency

## Core Entity

### `Subscription`

| Field | Type | Rules |
|---|---|---|
| `clinicId` | `ObjectId` → Clinic | required, **unique** (one subscription per clinic) |
| `plan` | `SubscriptionPlan` | default: `FREE` |
| `status` | `SubscriptionStatus` (from clinics schema) | default: `TRIAL` |
| `expiresAt` | `Date` | required |
| `timestamps` | — | `true` |

### `SubscriptionPlan` enum

```typescript
export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
}
```

### Professional count limits per plan

```typescript
export const PLAN_PROFESSIONAL_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 2,
  [SubscriptionPlan.BASIC]: 10,
  [SubscriptionPlan.PRO]: -1,  // -1 = unlimited
};
```

## Module Structure

```
subscriptions/
├── dto/
│   ├── create-subscription.dto.ts
│   └── update-subscription.dto.ts
├── schemas/
│   └── subscription.schema.ts
├── tests/
│   └── subscriptions.service.spec.ts
├── subscriptions.controller.ts
├── subscriptions.module.ts
└── subscriptions.service.ts
```

## DTOs

### `CreateSubscriptionDto`

```typescript
clinicId: string         // @IsMongoId
plan?: SubscriptionPlan  // @IsEnum @IsOptional — defaults to FREE
expiresAt: string        // @IsDateString
```

### `UpdateSubscriptionDto`

```typescript
plan?: SubscriptionPlan      // @IsEnum @IsOptional
status?: SubscriptionStatus  // @IsEnum @IsOptional
expiresAt?: string           // @IsDateString @IsOptional
```

## Service

### `SubscriptionsService`

```typescript
create(dto: CreateSubscriptionDto): Promise<SubscriptionDocument>
  // Validates clinicId ObjectId
  // Verifies clinic exists via ClinicsService.findById
  // Catches MongoError 11000 → ConflictException('Subscription already exists for this clinic')

findByClinicId(clinicId: string): Promise<SubscriptionDocument | null>
  // Returns null if not found (no NotFoundException — absence is valid)

findById(id: string): Promise<SubscriptionDocument>
  // Validates ObjectId, throws NotFoundException if not found

update(id: string, dto: UpdateSubscriptionDto): Promise<SubscriptionDocument>
  // findByIdAndUpdate with { new: true }, throws NotFoundException if not found

cancel(id: string): Promise<SubscriptionDocument>
  // Sets status to INACTIVE; preserves expiresAt

enforceClinicProfessionalLimit(clinicId: string, currentCount: number): Promise<void>
  // Finds subscription for clinicId (defaults to FREE if none found)
  // Gets limit from PLAN_PROFESSIONAL_LIMITS
  // If limit !== -1 AND currentCount >= limit → throws ForbiddenException
  //   Message: 'Professional limit reached for current subscription plan'
```

## Controller

```typescript
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController

POST  /subscriptions               @Roles(CLINIC)  → create()
GET   /subscriptions/clinic/:clinicId               → findByClinicId()
GET   /subscriptions/:id                            → findById()
PUT   /subscriptions/:id           @Roles(CLINIC)  → update()
POST  /subscriptions/:id/cancel    @Roles(CLINIC)  → cancel()
```

## Integration — Enforce Limit on Professional Assignment

Update `ClinicProfessionalsService.assignProfessionalToClinic`:

```typescript
// After existing validations, before saving:
const currentCount = await this.clinicProfessionalModel.countDocuments({
  clinicId: new Types.ObjectId(clinicId),
});
await this.subscriptionsService.enforceClinicProfessionalLimit(clinicId, currentCount);
```

This requires `ClinicProfessionalsModule` to import `SubscriptionsModule`.

## Tests — `subscriptions.service.spec.ts`

| Test | Description |
|---|---|
| create — success | Creates subscription for a clinic |
| create — duplicate | Throws ConflictException for duplicate clinicId |
| create — clinic not found | Throws NotFoundException |
| findByClinicId — found | Returns subscription |
| findByClinicId — not found | Returns null (no exception) |
| findById — not found | Throws NotFoundException |
| update — success | Updates plan and status |
| cancel | Sets status to INACTIVE |
| enforceClinicProfessionalLimit — under limit | Resolves without error |
| enforceClinicProfessionalLimit — at limit | Throws ForbiddenException |
| enforceClinicProfessionalLimit — PRO plan | Always resolves (unlimited) |
| enforceClinicProfessionalLimit — no subscription | Defaults to FREE limits |

## Files to Create

| File | Action |
|---|---|
| `subscriptions/schemas/subscription.schema.ts` | Create |
| `subscriptions/dto/create-subscription.dto.ts` | Create |
| `subscriptions/dto/update-subscription.dto.ts` | Create |
| `subscriptions/subscriptions.service.ts` | Create |
| `subscriptions/subscriptions.controller.ts` | Create |
| `subscriptions/subscriptions.module.ts` | Create |
| `subscriptions/tests/subscriptions.service.spec.ts` | Create |

## Files to Update

| File | Change |
|---|---|
| `app.module.ts` | Import `SubscriptionsModule` |
| `professionals/clinic-professionals.service.ts` | Inject `SubscriptionsService`, add limit check |
| `professionals/clinic-professionals.module.ts` | Import `SubscriptionsModule` |

## Definition of Done

- [ ] All 12 tests pass
- [ ] FREE plan blocks assignment when clinic already has 2 professionals
- [ ] PRO plan never blocks
- [ ] Existing clinic-professionals tests still pass
- [ ] `tsc --noEmit` passes
