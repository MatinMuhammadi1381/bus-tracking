export class PassengerEntity {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<PassengerEntity>) {
    Object.assign(this, partial);
  }
}
