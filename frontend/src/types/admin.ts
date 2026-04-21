import type { Booking } from './booking';
import type { Resource } from './resource'

export type BookingListItem = Booking & {
  resource_name: string;
};

export type { Booking, Resource };

export type AvailabilityRule = {
  id: string;
  resource_id: string;
  day_of_week: number;  // 0 = Monday
  start_time: string;   // "HH:MM:SS"
  end_time: string;
};

export type BookingFilters = {
  resource_id?: string;
  status?: string;
  from?: string;  // YYYY-MM-DD
  to?: string;
};