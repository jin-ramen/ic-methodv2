export interface Resource {
  id: string;
  name: string;
  capacity: number;
  duration_minutes: number;
  buffer_minutes: number;
  is_active: boolean;
}