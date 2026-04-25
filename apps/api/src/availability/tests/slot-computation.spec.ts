import { computeSlotsForDay } from '../utils/compute-slots';
import { WeeklySlot } from '../../common/schemas/weekly-slot.schema';

describe('computeSlotsForDay', () => {
  describe('basic slot generation', () => {
    it('should generate 6 slots for Monday 09:00-12:00 with 30-minute duration and no appointments', () => {
      const date = new Date('2026-01-05T00:00:00.000Z'); // Monday
      const weeklySlots: WeeklySlot[] = [
        {
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 30,
        },
      ];
      const appointments: { startAt: Date; endAt: Date }[] = [];

      const result = computeSlotsForDay(date, weeklySlots, appointments);

      expect(result).toHaveLength(6);
      expect(result[0].startAt).toEqual(new Date('2026-01-05T09:00:00.000Z'));
      expect(result[1].startAt).toEqual(new Date('2026-01-05T09:30:00.000Z'));
      expect(result[2].startAt).toEqual(new Date('2026-01-05T10:00:00.000Z'));
      expect(result[3].startAt).toEqual(new Date('2026-01-05T10:30:00.000Z'));
      expect(result[4].startAt).toEqual(new Date('2026-01-05T11:00:00.000Z'));
      expect(result[5].startAt).toEqual(new Date('2026-01-05T11:30:00.000Z'));

      result.forEach((slot) => {
        expect(slot.date).toBe('2026-01-05');
        expect(slot.durationMinutes).toBe(30);
      });
    });
  });

  describe('appointment blocking', () => {
    it('should skip slot that matches appointment exactly', () => {
      const date = new Date('2026-01-05T00:00:00.000Z'); // Monday
      const weeklySlots: WeeklySlot[] = [
        {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 30,
        },
      ];
      const appointments = [
        {
          startAt: new Date('2026-01-05T10:00:00.000Z'),
          endAt: new Date('2026-01-05T10:30:00.000Z'),
        },
      ];

      const result = computeSlotsForDay(date, weeklySlots, appointments);

      expect(result).toHaveLength(5);
      const startTimes = result.map((s) => s.startAt.toISOString());
      expect(startTimes).toContain('2026-01-05T09:00:00.000Z');
      expect(startTimes).toContain('2026-01-05T09:30:00.000Z');
      expect(startTimes).not.toContain('2026-01-05T10:00:00.000Z');
      expect(startTimes).toContain('2026-01-05T10:30:00.000Z');
      expect(startTimes).toContain('2026-01-05T11:00:00.000Z');
      expect(startTimes).toContain('2026-01-05T11:30:00.000Z');
    });

    it('should allow adjacent slot when appointment ends exactly at slot start', () => {
      const date = new Date('2026-01-05T00:00:00.000Z');
      const weeklySlots: WeeklySlot[] = [
        {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 30,
        },
      ];
      const appointments = [
        {
          startAt: new Date('2026-01-05T10:00:00.000Z'),
          endAt: new Date('2026-01-05T10:30:00.000Z'),
        },
      ];

      const result = computeSlotsForDay(date, weeklySlots, appointments);

      const startTimes = result.map((s) => s.startAt.toISOString());
      // 10:30 slot should be available because appointment ends exactly at 10:30
      expect(startTimes).toContain('2026-01-05T10:30:00.000Z');
    });

    it('should allow adjacent slot when appointment starts exactly at slot end', () => {
      const date = new Date('2026-01-05T00:00:00.000Z');
      const weeklySlots: WeeklySlot[] = [
        {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 30,
        },
      ];
      const appointments = [
        {
          startAt: new Date('2026-01-05T10:30:00.000Z'),
          endAt: new Date('2026-01-05T11:00:00.000Z'),
        },
      ];

      const result = computeSlotsForDay(date, weeklySlots, appointments);

      const startTimes = result.map((s) => s.startAt.toISOString());
      // 10:00 slot (ends at 10:30) should be available
      expect(startTimes).toContain('2026-01-05T10:00:00.000Z');
    });
  });

  describe('day of week filtering', () => {
    it('should return empty array for Sunday when only Monday config exists', () => {
      const date = new Date('2026-01-04T00:00:00.000Z'); // Sunday
      const weeklySlots: WeeklySlot[] = [
        {
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 30,
        },
      ];
      const appointments: { startAt: Date; endAt: Date }[] = [];

      const result = computeSlotsForDay(date, weeklySlots, appointments);

      expect(result).toHaveLength(0);
    });
  });

  describe('multiple time windows', () => {
    it('should generate slots for two separate windows on the same day', () => {
      const date = new Date('2026-01-05T00:00:00.000Z'); // Monday
      const weeklySlots: WeeklySlot[] = [
        {
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '12:00',
          slotDurationMinutes: 60,
        },
        {
          dayOfWeek: 1,
          startTime: '14:00',
          endTime: '18:00',
          slotDurationMinutes: 60,
        },
      ];
      const appointments: { startAt: Date; endAt: Date }[] = [];

      const result = computeSlotsForDay(date, weeklySlots, appointments);

      expect(result).toHaveLength(8);

      // Morning slots: 08:00, 09:00, 10:00, 11:00
      expect(result[0].startAt).toEqual(new Date('2026-01-05T08:00:00.000Z'));
      expect(result[1].startAt).toEqual(new Date('2026-01-05T09:00:00.000Z'));
      expect(result[2].startAt).toEqual(new Date('2026-01-05T10:00:00.000Z'));
      expect(result[3].startAt).toEqual(new Date('2026-01-05T11:00:00.000Z'));

      // Afternoon slots: 14:00, 15:00, 16:00, 17:00
      expect(result[4].startAt).toEqual(new Date('2026-01-05T14:00:00.000Z'));
      expect(result[5].startAt).toEqual(new Date('2026-01-05T15:00:00.000Z'));
      expect(result[6].startAt).toEqual(new Date('2026-01-05T16:00:00.000Z'));
      expect(result[7].startAt).toEqual(new Date('2026-01-05T17:00:00.000Z'));
    });
  });

  describe('appointment filtering expectations', () => {
    it('should block slot if appointment is passed (utility does not filter by status)', () => {
      const date = new Date('2026-01-05T00:00:00.000Z');
      const weeklySlots: WeeklySlot[] = [
        {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 30,
        },
      ];
      // Utility receives appointments as-is from caller
      // Caller must pre-filter cancelled appointments
      const appointments = [
        {
          startAt: new Date('2026-01-05T10:00:00.000Z'),
          endAt: new Date('2026-01-05T10:30:00.000Z'),
        },
      ];

      const result = computeSlotsForDay(date, weeklySlots, appointments);

      // Slot at 10:00 should be blocked
      const startTimes = result.map((s) => s.startAt.toISOString());
      expect(startTimes).not.toContain('2026-01-05T10:00:00.000Z');
    });
  });

  describe('edge cases', () => {
    it('should return empty array when no weekly slots configured', () => {
      const date = new Date('2026-01-05T00:00:00.000Z');
      const weeklySlots: WeeklySlot[] = [];
      const appointments: { startAt: Date; endAt: Date }[] = [];

      const result = computeSlotsForDay(date, weeklySlots, appointments);

      expect(result).toHaveLength(0);
    });

    it('should handle slot duration that does not divide window evenly', () => {
      const date = new Date('2026-01-05T00:00:00.000Z');
      const weeklySlots: WeeklySlot[] = [
        {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '10:00',
          slotDurationMinutes: 45, // Only one 45-min slot fits
        },
      ];
      const appointments: { startAt: Date; endAt: Date }[] = [];

      const result = computeSlotsForDay(date, weeklySlots, appointments);

      expect(result).toHaveLength(1);
      expect(result[0].startAt).toEqual(new Date('2026-01-05T09:00:00.000Z'));
      expect(result[0].endAt).toEqual(new Date('2026-01-05T09:45:00.000Z'));
    });
  });
});
