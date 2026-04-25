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
