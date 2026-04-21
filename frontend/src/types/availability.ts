export interface AvailabilitySlot {
  start_time: string;  // ISO 8601
  end_time: string;
}

export interface AvailabilityResponse {
  resource_id: string;
  slots: AvailabilitySlot[];
}