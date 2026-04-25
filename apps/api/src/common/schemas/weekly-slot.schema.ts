import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class WeeklySlot {
  /* 0 = Sunday … 6 = Saturday */
  @Prop({ type: Number, required: true, min: 0, max: 6 })
  dayOfWeek!: number;

  /* 24-h format HH:mm e.g. "09:30" */
  @Prop({ type: String, required: true })
  startTime!: string;

  /* 24-h format HH:mm e.g. "12:00" */
  @Prop({ type: String, required: true })
  endTime!: string;

  /* Length of an appointment slot that fits in this interval */
  @Prop({ type: Number, required: true, min: 15, max: 240 })
  slotDurationMinutes!: number;
}

export const WeeklySlotSchema = SchemaFactory.createForClass(WeeklySlot);
