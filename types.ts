
export type StopwatchStatus = 'idle' | 'running' | 'paused';

export interface Lap {
  lapNumber: number;
  lapTime: number;
  overallTime: number;
}
