# Sprint 03 — Appointments

## Objective

Build the appointments module — the core business feature of the platform. Includes full CRUD, conflict detection, and status lifecycle management.

## Dependencies

- Sprint 02 must be complete (requires `RolesGuard` and `@Roles`)

## Core Entity

### `Appointment`

| Field | Type | Rules |
|---|---|---|
| `clinicId` | `ObjectId` → Clinic | required |
| `professionalId` | `ObjectId` → Professional | required |
| `patientId` | `ObjectId` → User (role: patient) | required |
| `startAt` | `Date` | required |
| `endAt` | `Date` | computed: `startAt + durationMinutes * 60s`, stored for efficient conflict queries |
| `durationMinutes` | `number` | required, min: 15, max: 480 |
| `status` | `AppointmentStatus` | default: `SCHEDULED` |
| `notes` | `string` | optional |
| `timestamps` | — | `true` |

### `AppointmentStatus` enum

```
SCHEDULED → CONFIRMED → COMPLETED
          → CANCELLED
CONFIRMED → CANCELLED
```

Terminal states: `CANCELLED`, `COMPLETED` — no further transitions allowed.

### Indexes

```typescript
AppointmentSchema.index({ professionalId: 1, startAt: 1, endAt: 1 });
```

## Module Structure

```
appointments/
├── dto/
│   ├── create-appointment.dto.ts
│   ├── update-appointment.dto.ts
│   ├── update-appointment-status.dto.ts
│   └── get-appointments-query.dto.ts
├── schemas/
│   └── appointment.schema.ts
├── tests/
│   └── appointments.service.spec.ts
├── appointments.controller.ts
├── appointments.module.ts
└── appointments.service.ts
```

## DTOs

### `CreateAppointmentDto`

```typescript
clinicId: string         // @IsMongoId
professionalId: string   // @IsMongoId
patientId: string        // @IsMongoId
startAt: string          // @IsDateString
durationMinutes: number  // @IsInt @Min(15) @Max(480)
notes?: string           // @IsString @IsOptional
```

### `UpdateAppointmentDto`

```typescript
startAt?: string          // @IsDateString @IsOptional
durationMinutes?: number  // @IsInt @Min(15) @Max(480) @IsOptional
notes?: string            // @IsString @IsOptional
```

### `UpdateAppointmentStatusDto`

```typescript
status: AppointmentStatus  // @IsEnum(AppointmentStatus)
```

### `GetAppointmentsQueryDto`

```typescript
clinicId?: string        // @IsMongoId @IsOptional
professionalId?: string  // @IsMongoId @IsOptional
patientId?: string       // @IsMongoId @IsOptional
date?: string            // @IsDateString @IsOptional — filters appointments on that calendar day
status?: AppointmentStatus  // @IsEnum @IsOptional
```

## Service

### `AppointmentsService`

```typescript
create(dto: CreateAppointmentDto): Promise<AppointmentDocument>
  // Validates clinicId, professionalId, patientId as ObjectIds
  // Computes endAt = startAt + durationMinutes * 60 * 1000 ms
  // Calls checkConflict(professionalId, startAt, endAt)
  // Creates and saves the appointment

findAll(query: GetAppointmentsQueryDto): Promise<AppointmentDocument[]>
  // Builds filter from query params
  // If date provided: filters startAt >= date 00:00 AND startAt < date+1 00:00

findById(id: string): Promise<AppointmentDocument>
  // Validates ObjectId, throws NotFoundException if not found

update(id: string, dto: UpdateAppointmentDto): Promise<AppointmentDocument>
  // Validates id; fetches existing to get current startAt/durationMinutes
  // Recomputes endAt if startAt or durationMinutes changed
  // Calls checkConflict(..., excludeId: id)
  // Updates with findByIdAndUpdate({ new: true })

updateStatus(id: string, dto: UpdateAppointmentStatusDto): Promise<AppointmentDocument>
  // Fetches appointment; validates transition with VALID_STATUS_TRANSITIONS
  // Throws BadRequestException for invalid transitions
  // Updates status

cancel(id: string): Promise<{ success: boolean }>
  // Shorthand: updateStatus(id, { status: CANCELLED })

private checkConflict(
  professionalId: string,
  startAt: Date,
  endAt: Date,
  excludeId?: string,
): Promise<void>
  // Queries for overlapping appointment:
  //   { professionalId, status: { $nin: [CANCELLED] }, startAt: { $lt: endAt }, endAt: { $gt: startAt } }
  //   If excludeId provided: also filters _id: { $ne: excludeId }
  // Throws ConflictException if conflict found
```

## Controller

```typescript
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController

POST   /appointments                  @Roles(CLINIC, ATTENDANT)   → create()
GET    /appointments                  (all authenticated)          → findAll(@Query)
GET    /appointments/:id              (all authenticated)          → findById()
PUT    /appointments/:id              @Roles(CLINIC, ATTENDANT)   → update()
PATCH  /appointments/:id/status       @Roles(CLINIC, ATTENDANT, PROFESSIONAL) → updateStatus()
DELETE /appointments/:id              @Roles(CLINIC, ATTENDANT)   @HttpCode(204) → cancel()
```

## Tests — `appointments.service.spec.ts`

| Test | Description |
|---|---|
| create — success | Creates appointment, computes endAt correctly |
| create — conflict | Throws ConflictException when professional has overlapping appointment |
| create — invalid IDs | Throws NotFoundException for non-ObjectId |
| findAll — no filter | Returns all appointments |
| findAll — by clinicId | Returns only appointments for that clinic |
| findAll — by date | Returns only appointments on that calendar day |
| findById — found | Returns appointment |
| findById — not found | Throws NotFoundException |
| update — success | Updates and rechecks conflict excluding self |
| updateStatus — valid | Transitions SCHEDULED → CONFIRMED |
| updateStatus — invalid | Throws BadRequestException for COMPLETED → SCHEDULED |
| cancel — success | Sets status to CANCELLED |

## Files to Create

| File | Action |
|---|---|
| `appointments/schemas/appointment.schema.ts` | Create |
| `appointments/dto/create-appointment.dto.ts` | Create |
| `appointments/dto/update-appointment.dto.ts` | Create |
| `appointments/dto/update-appointment-status.dto.ts` | Create |
| `appointments/dto/get-appointments-query.dto.ts` | Create |
| `appointments/appointments.service.ts` | Create |
| `appointments/appointments.controller.ts` | Create |
| `appointments/appointments.module.ts` | Create |
| `appointments/tests/appointments.service.spec.ts` | Create |

## Files to Update

| File | Change |
|---|---|
| `app.module.ts` | Import `AppointmentsModule` |

## Definition of Done

- [ ] All 12+ tests pass
- [ ] Conflict detection works correctly for overlapping and adjacent appointments
- [ ] Status transitions enforce the allowed graph
- [ ] `tsc --noEmit` passes
