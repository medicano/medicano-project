export interface IWeeklySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export interface IProfessionalAvailability {
  _id: string;
  professionalId: string;
  date: string;
  isUnavailable: boolean;
  customSlots: IWeeklySlot[];
  createdAt: string;
  updatedAt: string;
}

export interface ICreateProfessionalAvailabilityDto {
  date: string;
  isUnavailable?: boolean;
  customSlots?: IWeeklySlot[];
}

export interface IUpdateProfessionalAvailabilityDto {
  date?: string;
  isUnavailable?: boolean;
  customSlots?: IWeeklySlot[];
}

export interface IGetAvailabilityQueryDto {
  date: string;
}

/**
 * An available slot on a given date.
 */
export interface AvailableSlot {
  /** YYYY-MM-DD */
  date: string;
  /** ISO timestamp of slot start */
  startAt: string;
  /** ISO timestamp of slot end */
  endAt: string;
  /** Duration in minutes */
  durationMinutes: number;
}
