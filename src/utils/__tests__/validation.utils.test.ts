import {
  validatePagination,
  validateDateRange,
  validateStringLength,
  validateArrayLength,
  validateBatchSize,
  CommonValidation,
  ValidationConstants,
} from '../validation.utils';
import { AppError, ErrorType } from '../error.utils';
import { ZodError } from 'zod';

describe('validatePagination', () => {
  it('should not throw for valid input', () => {
    expect(() => validatePagination(1, 10)).not.toThrow();
  });
  it('should throw for invalid page', () => {
    expect(() => validatePagination(0, 10)).toThrow(ZodError);
  });
  it('should throw for invalid pageSize', () => {
    expect(() => validatePagination(1, 0)).toThrow(ZodError);
  });
});

describe('validateDateRange', () => {
  it('should not throw for valid range', () => {
    expect(() => validateDateRange(new Date('2023-01-01'), new Date('2023-01-02'))).not.toThrow();
  });
  it('should throw if endTime <= startTime', () => {
    expect(() => validateDateRange(new Date('2023-01-02'), new Date('2023-01-01'))).toThrow(
      ZodError
    );
  });
  it('should throw if range exceeds max days', () => {
    const start = new Date('2023-01-01');
    const end = new Date(
      start.getTime() + (ValidationConstants.MAX_DATE_RANGE_DAYS + 1) * 24 * 60 * 60 * 1000
    );
    expect(() => validateDateRange(start, end)).toThrow(ZodError);
  });
});

describe('validateStringLength', () => {
  it('should not throw for valid string', () => {
    expect(() => validateStringLength('abc')).not.toThrow();
  });
  it('should throw for too long string', () => {
    expect(() =>
      validateStringLength('a'.repeat(ValidationConstants.MAX_STRING_LENGTH + 1))
    ).toThrow(ZodError);
  });
});

describe('validateArrayLength', () => {
  it('should not throw for valid array', () => {
    expect(() => validateArrayLength([1, 2])).not.toThrow();
  });
  it('should throw for too long array', () => {
    expect(() => validateArrayLength(Array(ValidationConstants.MAX_TAGS + 1).fill(1))).toThrow(
      AppError
    );
  });
});

describe('validateBatchSize', () => {
  it('should not throw for valid size', () => {
    expect(() => validateBatchSize(10)).not.toThrow();
  });
  it('should throw for invalid size', () => {
    expect(() => validateBatchSize(0)).toThrow(ZodError);
    expect(() => validateBatchSize(ValidationConstants.MAX_BATCH_SIZE + 1)).toThrow(ZodError);
  });
});

describe('CommonValidation', () => {
  it('should validate priority', () => {
    expect(() => CommonValidation.priority.parse(1)).not.toThrow();
    expect(() => CommonValidation.priority.parse(6)).toThrow(ZodError);
  });
  it('should validate status', () => {
    expect(() => CommonValidation.status.parse('pending')).not.toThrow();
    expect(() => CommonValidation.status.parse('bad')).toThrow(ZodError);
  });
  it('should validate stringLength', () => {
    expect(() =>
      CommonValidation.stringLength(ValidationConstants.MAX_STRING_LENGTH).parse(
        'a'.repeat(ValidationConstants.MAX_STRING_LENGTH)
      )
    ).not.toThrow();
    expect(() =>
      CommonValidation.stringLength(ValidationConstants.MAX_STRING_LENGTH).parse(
        'a'.repeat(ValidationConstants.MAX_STRING_LENGTH + 1)
      )
    ).toThrow(ZodError);
  });
  it('should validate arrayLength', () => {
    expect(() =>
      CommonValidation.arrayLength(ValidationConstants.MAX_TAGS).parse(
        Array(ValidationConstants.MAX_TAGS).fill(1)
      )
    ).not.toThrow();
    expect(() =>
      CommonValidation.arrayLength(ValidationConstants.MAX_TAGS).parse(
        Array(ValidationConstants.MAX_TAGS + 1).fill(1)
      )
    ).toThrow(ZodError);
  });
});
