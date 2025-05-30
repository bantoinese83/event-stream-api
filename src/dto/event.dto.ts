import { z } from 'zod';
import {
  createEventSchema,
  createBatchEventsSchema,
  eventResponseSchema,
} from '../schemas/event.schema';

// DTO types
export type CreateEventDto = z.infer<typeof createEventSchema>;
export type CreateBatchEventsDto = z.infer<typeof createBatchEventsSchema>;
export type EventResponseDto = z.infer<typeof eventResponseSchema>;

// Validation and transformation helpers
export const EventDto = {
  parseCreate(input: unknown): CreateEventDto {
    return createEventSchema.parse(input);
  },
  parseBatch(input: unknown): CreateBatchEventsDto {
    return createBatchEventsSchema.parse(input);
  },
  parseResponse(input: unknown): EventResponseDto {
    return eventResponseSchema.parse(input);
  },
};
