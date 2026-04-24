export type SessionType = {
    id: string;
    method_id: string | null;
    method_name: string | null;
    start_time: Date;
    end_time: Date;
    capacity: number;
    spots_remaining: number;
    instructor: string | null;
    created_at: string;
}
