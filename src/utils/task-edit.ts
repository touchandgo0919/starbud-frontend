import type { RepeatType } from "../types/task";

type EditableTaskSchedule = {
  repeatType: RepeatType;
  startDate: string;
  endDate: string | null;
};

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function runsOnDate(task: EditableTaskSchedule, candidate: Date) {
  const candidateKey = dateKey(candidate);
  if (candidateKey < task.startDate || (task.endDate && candidateKey > task.endDate)) return false;
  if (task.repeatType === "once") return candidateKey === task.startDate;
  if (task.repeatType === "weekdays") return candidate.getDay() >= 1 && candidate.getDay() <= 5;
  if (task.repeatType === "weekly") return candidate.getDay() === parseDateKey(task.startDate).getDay();
  return true;
}

export function nextEditableOccurrence(task: EditableTaskSchedule, fromDate: string) {
  if (task.repeatType === "once" && task.startDate < fromDate) return null;
  const candidate = parseDateKey(fromDate);
  for (let offset = 0; offset < 370; offset += 1) {
    if (runsOnDate(task, candidate)) return dateKey(candidate);
    candidate.setDate(candidate.getDate() + 1);
  }
  return null;
}
