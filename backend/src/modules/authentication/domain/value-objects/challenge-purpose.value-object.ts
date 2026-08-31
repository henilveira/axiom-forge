import type { ChallengePurpose } from '../types/authentication.types';

export class ChallengePurposeValue {
  private constructor(public readonly value: ChallengePurpose) {}

  public static from(value: ChallengePurpose): ChallengePurposeValue {
    return new ChallengePurposeValue(value);
  }
}
