import { z } from 'zod';
import { AppError, ErrorType } from './error.utils';

/**
 * Common validation constants
 */
export const ValidationConstants = {
  MAX_STRING_LENGTH: 255,
  MAX_TAGS: 10,
  PASSWORD_MIN_LENGTH: 8,
  VALID_PRIORITIES: [1, 2, 3, 4, 5] as const,
  VALID_STATUSES: ['pending', 'processed', 'failed', 'archived'] as const,
  MAX_BATCH_SIZE: 1000,
  MAX_DATE_RANGE_DAYS: 90,
} as const;

/**
 * Common validation schemas
 */
export const CommonValidation = {
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
  }),

  dateRange: z
    .object({
      startTime: z.date(),
      endTime: z.date(),
    })
    .refine(({ startTime, endTime }) => endTime > startTime, {
      message: 'End time must be after start time',
    })
    .refine(
      ({ startTime, endTime }) => {
        const diffInDays = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
        return diffInDays <= ValidationConstants.MAX_DATE_RANGE_DAYS;
      },
      { message: `Date range cannot exceed ${ValidationConstants.MAX_DATE_RANGE_DAYS} days` }
    ),

  priority: z
    .number()
    .int()
    .min(1)
    .max(5)
    .refine(val => ValidationConstants.VALID_PRIORITIES.includes(val as 1 | 2 | 3 | 4 | 5), {
      message: `Priority must be one of: ${ValidationConstants.VALID_PRIORITIES.join(', ')}`,
    }),

  status: z.enum(ValidationConstants.VALID_STATUSES),

  stringLength: (maxLength = ValidationConstants.MAX_STRING_LENGTH) => z.string().max(maxLength),

  arrayLength: (maxLength = ValidationConstants.MAX_TAGS) => z.array(z.any()).max(maxLength),

  batchSize: z.number().int().min(1).max(ValidationConstants.MAX_BATCH_SIZE),
};

/**
 * Validation helper functions that use Zod schemas
 */
export function validatePagination(page: number, pageSize: number): void {
  CommonValidation.pagination.parse({ page, pageSize });
}

export function validateDateRange(startTime: Date, endTime: Date): void {
  CommonValidation.dateRange.parse({ startTime, endTime });
}

export function validateStringLength(
  value: string,
  maxLength = ValidationConstants.MAX_STRING_LENGTH
): void {
  CommonValidation.stringLength(maxLength).parse(value);
}

export function validateArrayLength(
  array: unknown[],
  maxLength = ValidationConstants.MAX_TAGS
): void {
  if (array.length > maxLength) {
    throw new AppError(ErrorType.VALIDATION, `Array length cannot exceed ${maxLength} items`, 400);
  }
}

export function validateBatchSize(size: number): void {
  CommonValidation.batchSize.parse(size);
}
