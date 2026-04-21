export interface Booking {
  id: string;
  resource_id: string;
  customer_email: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  created_at: string;
}

export interface BookingCreatePayload {
  resource_id: string;
  customer_email: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  idempotency_key?: string;
}