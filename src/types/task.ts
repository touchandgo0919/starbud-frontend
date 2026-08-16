export type RepeatType = "once" | "daily" | "weekdays" | "weekly";

export type TaskStatus = "pending" | "completed" | "missed";
export type TaskReviewStatus = "not_required" | "pending_submission" | "submitting" | "pending_review" | "needs_revision" | "completed";

export interface Task {
  id: string;
  childId: string;
  title: string;
  scheduleTime: string;
  repeatType: RepeatType;
  voiceEnabled: boolean;
  voiceContent: string;
  voiceReminderCount: number;
  claimReminderEnabled: boolean;
  revisionReminderEnabled: boolean;
  requiresPhotoUpload: boolean;
  status: TaskStatus;
  occurrenceDate: string | null;
  completedAt: string | null;
  claimedAt: string | null;
  submissionId: string | null;
  submissionStatus: "draft" | "submitted" | null;
  reviewedAt: string | null;
  finalizedAt: string | null;
  needsRevision: boolean;
  reviewStatus: TaskReviewStatus;
  submissionPhotoCount: number;
  attachmentPhotoCount?: number;
  attachmentPreviewUrl?: string | null;
  hasAudioAttachment?: boolean;
  startDate: string;
  endDate: string | null;
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
  claimReminderEnabled: boolean;
  revisionReminderEnabled: boolean;
  requiresPhotoUpload: boolean;
  startDate: string;
  endDate: string | null;
}

export type UpdateTaskPayload = Omit<CreateTaskPayload, "childId"> & {
  editScope: "single" | "future";
  effectiveDate: string;
};

export interface SubmissionPhoto {
  id: string;
  url: string;
  contentType: string;
  byteSize: number;
  createdAt: string;
}

export interface SubmissionAudio {
  id: string;
  url: string;
  contentType: string;
  byteSize: number;
  durationMs: number;
  createdAt: string;
}

export interface SubmissionReviewRound {
  id: string;
  sequence: number;
  note: string;
  feedback: string;
  photos: SubmissionPhoto[];
  audios: SubmissionAudio[];
  reviewImages: SubmissionPhoto[];
  reviewImageUrl: string;
  submittedAt: string | null;
  reviewedAt: string;
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
  audio: SubmissionAudio | null;
  audioFeedback: string;
  createdAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  finalizedAt: string | null;
  reviewImageUrl: string | null;
  reviewRounds: SubmissionReviewRound[];
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "parent" | "child";
}

export interface AccessEvent {
  id: string;
  eventName: string;
  clientType: string;
  route: string | null;
  resourceType: string | null;
  resourceId: string | null;
  outcome: "success" | "failure";
  metadata: Record<string, unknown>;
  occurredAt: string;
  user: { id: string; username: string; displayName: string } | null;
}

export interface ReminderRecord {
  id: string;
  notificationId: string | null;
  taskId: string | null;
  taskDate: string | null;
  submissionId: string | null;
  recipient: { id: string; username: string; displayName: string };
  reminderType: string;
  source: string;
  title: string;
  content: string;
  pushStatus: string;
  pushConnectionCount: number;
  pushedAt: string | null;
  pushError: string | null;
  receivedAt: string | null;
  reminderStatus: string;
  remindedAt: string | null;
  reminderError: string | null;
  createdAt: string;
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

export interface AiOverviewEvidence {
  taskId: string;
  childId: string;
  childName: string;
  taskTitle: string;
  occurrenceDate: string;
  detail: string;
}

export interface AiOverviewInsight {
  id: string;
  tone: "positive" | "attention" | "neutral";
  title: string;
  summary: string;
  evidence: AiOverviewEvidence[];
  action: null | {
    type: "reminder_shift" | "task_breakdown";
    title: string;
    description: string;
    changeMinutes?: number;
    trialDays: 7;
  };
}

export interface LearningIssueOverview {
  status: "ready" | "analyzing" | "empty";
  analyzedReviews: number;
  analyzingReviews: number;
  issueCount: number;
  summary: string;
  recurring: Array<{
    topic: string;
    category: "concept" | "calculation" | "comprehension" | "method" | "expression" | "pronunciation" | "completeness" | "other";
    count: number;
    lastSeenAt: string;
    childName: string;
  }>;
  recent: Array<{
    topic: string;
    category: "concept" | "calculation" | "comprehension" | "method" | "expression" | "pronunciation" | "completeness" | "other";
    summary: string;
    taskTitle: string;
    taskDate: string;
    childName: string;
    reviewedAt: string;
    resolved: boolean;
  }>;
  resolved: Array<{
    topic: string;
    taskTitle: string;
    taskDate: string;
    childName: string;
    resolvedAt: string;
  }>;
}

export interface AiHomeOverview {
  generatedAt: string;
  analysisMode: "deterministic";
  period: { days: number; from: string; to: string };
  scope: { childId: string | null; childName: string };
  dataStatus: "ready" | "insufficient";
  confidence: "high" | "medium" | "low";
  summary: { title: string; description: string };
  metrics: {
    totalTasks: number;
    completionRate: number;
    completionRateDelta: number | null;
    onTimeRate: number | null;
    averageClaimDelayMinutes: number | null;
    revisionRate: number | null;
  };
  weeklyReport: {
    completedTasks: number;
    totalTasks: number;
    completionStreakDays: number;
    reviewedTasks: number;
    pendingReviewTasks: number;
    needsRevisionTasks: number;
    nextWeekSuggestions: string[];
  };
  trend: Array<{ date: string; completed: number; total: number }>;
  insights: AiOverviewInsight[];
  learningIssues: LearningIssueOverview;
  modelAnalysis?: null | {
    childId: string;
    childName: string;
    analysisDate: string;
    periodDays: number;
    model: string;
    generatedAt: string;
    result: {
      parentSummary: { title: string; description: string };
      childNextStep: { title: string; description: string };
    };
  };
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

export interface RewardCenter {
  childId: string;
  balance: number;
  settings: { taskPoints: number; streakDays: number; streakBonusPoints: number; sameDayCompletionRequired: boolean };
  rewards: Array<{ id: string; title: string; pointCost: number; description: string; active: boolean }>;
  redemptions: Array<{ id: string; title: string; pointCost: number; status: "pending" | "approved" | "rejected"; requestedAt: string; confirmedAt: string | null; note: string; childName: string }>;
  entries: Array<{ type: "task_completed" | "streak_bonus" | "redemption"; points: number; description: string; createdAt: string }>;
}
