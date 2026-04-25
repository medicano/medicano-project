import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false, versionKey: false })
export class Address {
  @Prop({ type: String, required: true })
  street!: string;

  @Prop({ type: String, required: true })
  number!: string;

  @Prop({ type: String })
  complement?: string;

  @Prop({ type: String, required: true })
  neighborhood!: string;

  @Prop({ type: String, required: true })
  city!: string;

  @Prop({ type: String, required: true, minlength: 2, maxlength: 2 })
  state!: string;

  @Prop({ type: String, required: true, match: /^\d{8}$/ })
  zipCode!: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
