export type FlowType = {
    id: string;
    method_id: string | null;
    method_name: string | null;
    start_time: string;
    end_time: string;
    capacity: number;
    spots_remaining: number;
    instructor: string | null;
    created_at: string;
}
