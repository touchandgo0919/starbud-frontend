export type RepeatType = "once" | "daily" | "weekdays" | "weekly";

export type TaskStatus = "pending" | "completed" | "missed";

export interface Task {
  id: string;
  childId: string;
  title: string;
  scheduleTime: string;
  repeatType: RepeatType;
  voiceEnabled: boolean;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateTaskPayload {
  childId: string;
  title: string;
  scheduleTime: string;
  repeatType: RepeatType;
  voiceEnabled: boolean;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: "parent" | "child";
}

export interface Child {
  id: string;
  name: string;
  deviceId: string | null;
}
