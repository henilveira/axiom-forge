export interface Argon2idParameters {
  readonly memoryCost: number;
  readonly timeCost: number;
  readonly parallelism: number;
  readonly saltLength: number;
  readonly hashLength: number;
}
