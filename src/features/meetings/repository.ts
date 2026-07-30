import type { Meeting, MeetingBrief } from "@/types";

export interface MeetingRepository {
  list(): Promise<Meeting[]>;
  findById(id: string): Promise<Meeting | null>;
  saveBrief(id: string, brief: MeetingBrief): Promise<Meeting | null>;
}
