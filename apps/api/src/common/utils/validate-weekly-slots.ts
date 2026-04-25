import { BadRequestException } from '@nestjs/common';
import { WeeklySlotDto } from '../dto/weekly-slot.dto';

/**
 * Validates a collection of weekly slots:
 *  - each slot's startTime must be strictly before its endTime
 *  - slots on the same dayOfWeek must not overlap
 *
 * Throws BadRequestException on the first violation.
 */
export function validateWeeklySlots(slots: WeeklySlotDto[]): void {
  if (slots.length === 0) {
    return;
  }

  for (const slot of slots) {
    if (slot.startTime >= slot.endTime) {
      throw new BadRequestException(
        `Invalid time range: startTime (${slot.startTime}) must be before endTime (${slot.endTime})`,
      );
    }
  }

  const sorted = [...slots].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek - b.dayOfWeek;
    }
    return a.startTime.localeCompare(b.startTime);
  });

  for (let index = 0; index < sorted.length - 1; index++) {
    const current = sorted[index];
    const next = sorted[index + 1];
    if (
      current.dayOfWeek === next.dayOfWeek &&
      current.endTime > next.startTime
    ) {
      throw new BadRequestException(
        `Overlapping slots detected on day ${current.dayOfWeek}: ${current.startTime}-${current.endTime} and ${next.startTime}-${next.endTime}`,
      );
    }
  }
}
