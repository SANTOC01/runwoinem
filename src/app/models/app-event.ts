export interface AppEvent {
  name: string;
  dist: string;
  date: string;
  daysLeft: number;
  participants?: string[];
}