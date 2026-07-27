export type RepeatType = "once" | "daily" | "weekdays" | "weekly";

export type TaskStatus = "pending" | "completed" | "missed";

export interface Task {
  id: string;
  childId: string;
  title: string;
  scheduleTime: string;
  repeatType: RepeatType;
  voiceEnabled: boolean;
  voiceContent: string;
  voiceReminderCount: number;
  status: TaskStatus;
  occurrenceDate: string | null;
  completedAt: string | null;
  claimedAt: string | null;
  submissionId: string | null;
  submissionStatus: "draft" | "submitted" | null;
  submissionPhotoCount: number;
  createdAt: string;
}

export interface CreateTaskPayload {
  childId: string;
  title: string;
  scheduleTime: string;
  repeatType: RepeatType;
  voiceEnabled: boolean;
  voiceContent: string;
  voiceReminderCount: number;
}

export type UpdateTaskPayload = Omit<CreateTaskPayload, "childId">;

export interface SubmissionPhoto {
  id: string;
  url: string;
  contentType: string;
  byteSize: number;
}

export interface Submission {
  id: string;
  taskId: string;
  childId: string;
  taskDate: string;
  taskTitle: string;
  scheduleTime: string;
  note: string;
  status: "draft" | "submitted";
  photoCount: number;
  photos: SubmissionPhoto[];
  createdAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewImageUrl: string | null;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "parent" | "child";
}

export interface ManagedUser extends User {
  active: boolean;
  createdAt: string;
}

export interface SaveUserPayload {
  username: string;
  displayName: string;
  role: User["role"];
  active?: boolean;
  password?: string;
}

export interface RegisterPayload {
  username: string;
  displayName: string;
  password: string;
}

export interface CreateChildPayload {
  username: string;
  displayName: string;
  password: string;
  relationship: string;
}

export interface Child {
  id: string;
  name: string;
  deviceId: string | null;
}

export interface FamilyMember {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "parent" | "child";
  relationship: string;
  isOwner: boolean;
}

export interface Family {
  id: string;
  name: string;
  isOwner: boolean;
  canManage: boolean;
  canDelete: boolean;
  members: FamilyMember[];
  createdAt: string;
}
