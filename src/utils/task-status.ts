import type { Task } from "../types/task";

type TaskStatusSource = Pick<Task, "status" | "reviewStatus" | "claimedAt" | "requiresPhotoUpload" | "finalizedAt">;

export type TaskStateTone = "pending" | "active" | "review" | "revision" | "completed";

/**
 * 网页、首页和任务表共用的任务状态：与小程序任务卡保持同一套顺序和颜色，
 * 区分“待领取”和已领取后的“待提交”，不再统一显示为“待完成”。
 */
export function taskStateTone(task: TaskStatusSource): TaskStateTone {
  if (task.reviewStatus === "needs_revision") return "revision";
  if (task.reviewStatus === "pending_review") return "review";
  if (task.status === "completed" || task.reviewStatus === "completed" || task.finalizedAt) return "completed";
  if (task.claimedAt) return "active";
  return "pending";
}

export function taskStatusLabel(task: TaskStatusSource) {
  const tone = taskStateTone(task);
  if (tone === "revision") return "待修改";
  if (tone === "review") return "待批改";
  if (tone === "completed") return "已完成";
  if (tone === "pending") return "待领取";
  if (!task.requiresPhotoUpload) return "待完成";
  return task.reviewStatus === "submitting" ? "提交中" : "待提交";
}

export function taskStateClass(task: TaskStatusSource) {
  return `task-state--${taskStateTone(task)}`;
}
