# Sprint 09 — Patient Scheduling & Business Rules

## Objective

Allow patients to create their own appointments (RF07, RF08, RF09) and to cancel their appointments respecting the minimum notice rule (RF12, RN08). Enforce the conflict and interval rules from the documentation (RN01, RN03, RN04). This sprint closes the most visible gaps between the documentation and the implementation.

## Dependencies

- Sprint 03 (Appointments)
- Sprint 06 (Schema enrichment)
- Sprint 08 (Availability slots)

## Scope

- Allow `PATIENT` role to call `POST /appointments` with their own `patientId`
- Add patient cancel endpoint with notice rule enforcement
- Add patient overlap check (RN01)
- Add cross-clinic interval rule (RN04: 30 minutes between appointments at different clinics)
- Add validation that appointment time matches an available slot
- Auto-set initial status based on prestador's `autoConfirm` config (RN06)

## Business Rules to Enforce

| Rule ID | Description | Where to enforce |
|---|---|---|
| RN01 | Patient cannot have overlapping appointments | `AppointmentsService.create` |
| RN04 | 30-min minimum interval between appointments at different clinics | `AppointmentsService.create` |
| RN06 | Initial status = CONFIRMED if `autoConfirm`, else SCHEDULED | `AppointmentsService.create` |
| RN08 | Patient cancel must respect `minCancelNoticeHours` | `AppointmentsService.cancelAsPatient` |
| RN09 | Provider can cancel anytime (no notice rule) | already supported |
| RN10 | Cancelled slot is freed | already supported via status filter |

## DTOs

### `CreatePatientAppointmentDto` (NEW — separate from clinic create DTO)

```typescript
clinicId: string         // @IsMongoId
professionalId: string   // @IsMongoId
startAt: string          // @IsDateString
durationMinutes: number  // @IsInt @Min(15) @Max(480)
notes?: string           // @IsString @IsOptional
// patientId is NOT in the DTO — taken from CurrentUser
```

### `CancelAppointmentDto` (optional, for cancel reason)

```typescript
reason?: string  // @IsString @IsOptional @MaxLength(500)
```

## Service Changes

### `AppointmentsService.createForPatient` (NEW method)

```typescript
async createForPatient(
  dto: CreatePatientAppointmentDto,
  patientUserId: string,
): Promise<AppointmentDocument> {
  const startAt = new Date(dto.startAt);
  const endAt = new Date(startAt.getTime() + dto.durationMinutes * 60_000);

  // Existing professional conflict check (already implemented)
  await this.checkConflict(dto.professionalId, startAt, endAt);

  // RN01: patient overlap check
  await this.checkPatientOverlap(patientUserId, startAt, endAt);

  // RN04: cross-clinic 30-min interval
  await this.checkCrossClinicInterval(patientUserId, dto.clinicId, startAt, endAt);

  // Validate that startAt matches an available slot
  await this.validateAgainstAvailability(dto.professionalId, startAt, endAt);

  // RN06: determine initial status
  const provider = await this.professionalsService.findById(dto.professionalId);
  const clinic = await this.clinicsService.findById(dto.clinicId);
  const autoConfirm = provider.autoConfirm || clinic.autoConfirm;
  const status = autoConfirm
    ? AppointmentStatus.CONFIRMED
    : AppointmentStatus.SCHEDULED;

  return this.appointmentModel.create({
    ...dto,
    patientId: patientUserId,
    endAt,
    status,
  });
}
```

### `AppointmentsService.cancelAsPatient` (NEW method)

```typescript
async cancelAsPatient(
  appointmentId: string,
  patientUserId: string,
): Promise<AppointmentDocument> {
  const appointment = await this.findById(appointmentId);

  // Patient can only cancel their own appointments
  if (appointment.patientId.toString() !== patientUserId) {
    throw new ForbiddenException('You can only cancel your own appointments');
  }

  // Already cancelled or completed — no action
  if ([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED].includes(appointment.status)) {
    throw new BadRequestException(`Cannot cancel an appointment in status ${appointment.status}`);
  }

  // RN08: enforce minimum notice
  const provider = await this.professionalsService.findById(appointment.professionalId.toString());
  const minNotice = provider.minCancelNoticeHours; // hours
  const hoursUntilStart = (appointment.startAt.getTime() - Date.now()) / 3_600_000;

  if (hoursUntilStart < minNotice) {
    throw new BadRequestException(
      `Cancellation requires at least ${minNotice} hours notice. Only ${hoursUntilStart.toFixed(1)} hours remain.`,
    );
  }

  // Cancel
  appointment.status = AppointmentStatus.CANCELLED;
  return appointment.save();
}
```

### Private helpers

```typescript
private async checkPatientOverlap(
  patientId: string,
  startAt: Date,
  endAt: Date,
): Promise<void> {
  const overlap = await this.appointmentModel.findOne({
    patientId: new Types.ObjectId(patientId),
    status: { $nin: [AppointmentStatus.CANCELLED] },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  });
  if (overlap) {
    throw new ConflictException('You already have an appointment overlapping this time slot');
  }
}

private async checkCrossClinicInterval(
  patientId: string,
  clinicId: string,
  startAt: Date,
  endAt: Date,
): Promise<void> {
  const intervalMs = 30 * 60_000;
  const windowStart = new Date(startAt.getTime() - intervalMs);
  const windowEnd = new Date(endAt.getTime() + intervalMs);

  const conflict = await this.appointmentModel.findOne({
    patientId: new Types.ObjectId(patientId),
    clinicId: { $ne: new Types.ObjectId(clinicId) },
    status: { $nin: [AppointmentStatus.CANCELLED] },
    startAt: { $lt: windowEnd },
    endAt: { $gt: windowStart },
  });
  if (conflict) {
    throw new ConflictException(
      'You already have an appointment at another clinic within 30 minutes of this time',
    );
  }
}

private async validateAgainstAvailability(
  professionalId: string,
  startAt: Date,
  endAt: Date,
): Promise<void> {
  const dateStr = startAt.toISOString().slice(0, 10);
  const slots = await this.availabilityService.getAvailableSlots(professionalId, {
    fromDate: dateStr,
    toDate: dateStr,
  });

  const matches = slots.some(s =>
    s.startAt.getTime() === startAt.getTime() &&
    s.endAt.getTime() === endAt.getTime(),
  );

  if (!matches) {
    throw new BadRequestException('Selected time does not match an available slot');
  }
}
```

## Controller Changes

```typescript
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController

// EXISTING — keep
@Post()
@Roles(Role.CLINIC, Role.ATTENDANT)
create(@Body() dto: CreateAppointmentDto)

// NEW
@Post('book')
@Roles(Role.PATIENT)
createForPatient(
  @Body() dto: CreatePatientAppointmentDto,
  @CurrentUser() userId: string,
) {
  return this.appointmentsService.createForPatient(dto, userId);
}

// NEW — patient cancel
@Patch(':id/cancel-as-patient')
@Roles(Role.PATIENT)
cancelAsPatient(
  @Param('id', ParseMongoIdPipe) id: string,
  @CurrentUser() userId: string,
) {
  return this.appointmentsService.cancelAsPatient(id, userId);
}

// EXISTING — keep (provider cancellation, no notice rule)
@Delete(':id')
@Roles(Role.CLINIC, Role.ATTENDANT)
@HttpCode(204)
cancel()
```

## Important: ATTENDANT and CLINIC creating appointments

The existing `POST /appointments` endpoint stays unchanged. CLINIC and ATTENDANT continue to use it. The validation rules (RN01, RN04, slot match, RN06) should ALSO apply when CLINIC/ATTENDANT create appointments — extract the common logic into a private method and call from both `create` and `createForPatient`.

```typescript
async create(dto: CreateAppointmentDto): Promise<AppointmentDocument> {
  // ... existing validation
  await this.checkConflict(dto.professionalId, startAt, endAt);
  await this.checkPatientOverlap(dto.patientId, startAt, endAt);
  await this.checkCrossClinicInterval(dto.patientId, dto.clinicId, startAt, endAt);
  await this.validateAgainstAvailability(dto.professionalId, startAt, endAt);
  // ... existing status logic
}
```

## Tests — `appointments.service.spec.ts` (extend)

Add the following tests on top of the existing 12:

| Test | Description |
|---|---|
| createForPatient — success with autoConfirm=false | Status=SCHEDULED |
| createForPatient — success with autoConfirm=true | Status=CONFIRMED |
| createForPatient — patient overlap throws ConflictException | RN01 |
| createForPatient — cross-clinic <30min throws ConflictException | RN04 |
| createForPatient — cross-clinic >=30min succeeds | RN04 boundary |
| createForPatient — same clinic adjacent succeeds | Allowed by RN03 |
| createForPatient — slot does not match availability throws BadRequest | Validation against slots |
| cancelAsPatient — owner cancels with enough notice succeeds | RN08 satisfied |
| cancelAsPatient — owner cancels with insufficient notice throws BadRequest | RN08 violated |
| cancelAsPatient — non-owner throws ForbiddenException | Not the patient |
| cancelAsPatient — already cancelled throws BadRequest | Status check |
| cancelAsPatient — minNoticeHours=0 always allows | Edge case |

## Files to Create

| File | Action |
|---|---|
| `appointments/dto/create-patient-appointment.dto.ts` | Create |

## Files to Update

| File | Change |
|---|---|
| `appointments/appointments.service.ts` | Add `createForPatient`, `cancelAsPatient`, `checkPatientOverlap`, `checkCrossClinicInterval`, `validateAgainstAvailability`. Inject `AvailabilityService`, `ProfessionalsService`, `ClinicsService`. Update `create` to use new private helpers. |
| `appointments/appointments.controller.ts` | Add `POST /appointments/book` and `PATCH /:id/cancel-as-patient` endpoints |
| `appointments/appointments.module.ts` | Import `AvailabilityModule`, `ProfessionalsModule`, `ClinicsModule` |
| `appointments/tests/appointments.service.spec.ts` | Add 12 new tests |
| `packages/types/src/auth.ts` | Add `ICreatePatientAppointmentDto` interface |

## Definition of Done

- [ ] All existing 12 appointment tests still pass
- [ ] All 12 new tests pass
- [ ] `POST /appointments/book` works for PATIENT role only (returns 403 for others)
- [ ] `PATCH /:id/cancel-as-patient` enforces `minCancelNoticeHours` correctly
- [ ] Patient cannot create overlapping appointments (RN01)
- [ ] Cross-clinic 30-min rule enforced (RN04)
- [ ] Initial status follows `autoConfirm` config (RN06)
- [ ] `tsc --noEmit` passes
