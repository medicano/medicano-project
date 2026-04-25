import { WeeklySlot } from '../../common/schemas/weekly-slot.schema';

export interface AvailableSlot {
  date: string;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
}

/**
 * Computes all available time slots for a single calendar date,
 * given professional's weekly configuration and existing appointments.
 */
export function computeSlotsForDay(
  date: Date,
  weeklySlots: WeeklySlot[],
  appointments: { startAt: Date; endAt: Date }[],
): AvailableSlot[] {
  const dayOfWeek = date.getUTCDay();
  const dateStr = formatDateAsYYYYMMDD(date);

  // Filter weekly slots for this day of week
  const relevantSlots = weeklySlots.filter(
    (slot) => slot.dayOfWeek === dayOfWeek,
  );

  if (relevantSlots.length === 0) {
    return [];
  }

  const allSlots: AvailableSlot[] = [];

  // Process each time window for this day
  for (const weeklySlot of relevantSlots) {
    const slots = computeSlotsForWindow(
      date,
      dateStr,
      weeklySlot,
      appointments,
    );
    allSlots.push(...slots);
  }

  // Sort by startAt
  return allSlots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

function computeSlotsForWindow(
  date: Date,
  dateStr: string,
  weeklySlot: WeeklySlot,
  appointments: { startAt: Date; endAt: Date }[],
): AvailableSlot[] {
  const { startTime, endTime, slotDurationMinutes } = weeklySlot;

  const windowStart = parseTimeOnDate(date, startTime);
  const windowEnd = parseTimeOnDate(date, endTime);

  const slots: AvailableSlot[] = [];
  let cursor = new Date(windowStart);

  while (
    cursor.getTime() + slotDurationMinutes * 60 * 1000 <=
    windowEnd.getTime()
  ) {
    const slotEnd = new Date(
      cursor.getTime() + slotDurationMinutes * 60 * 1000,
    );

    // Check if this slot conflicts with any appointment
    // Slot is blocked if appointment overlaps (exclusive boundaries):
    // appointment.startAt < slotEnd && appointment.endAt > cursor
    const isBlocked = appointments.some((appt) => {
      return (
        appt.startAt.getTime() < slotEnd.getTime() &&
        appt.endAt.getTime() > cursor.getTime()
      );
    });

    if (!isBlocked) {
      slots.push({
        date: dateStr,
        startAt: new Date(cursor),
        endAt: new Date(slotEnd),
        durationMinutes: slotDurationMinutes,
      });
    }

    // Move cursor forward by slot duration
    cursor = new Date(cursor.getTime() + slotDurationMinutes * 60 * 1000);
  }

  return slots;
}

function parseTimeOnDate(date: Date, timeStr: string): Date {
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

function formatDateAsYYYYMMDD(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
