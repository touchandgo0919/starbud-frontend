<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowLeft, ArrowRight, Delete, FullScreen, Loading, Plus, QuestionFilled, Refresh, RefreshLeft, RefreshRight } from "@element-plus/icons-vue";
import { ArrowUpRight, Pencil, Play, Smile, Square, Type, Undo2, ZoomIn, ZoomOut } from "@lucide/vue";
import { completeTask, createTask, deleteTask, finalizeSubmissionReview, getChildren, getTaskSubmission, getTasks, remindTask, repairTaskStatus, submitSubmissionAudioReview, submitSubmissionReview, trackAccessEvent, updateTask } from "../services/api";
import { useAuthStore } from "../store/auth";
import type { Child, CreateTaskPayload, RepeatType, SubmissionAudio, SubmissionPhoto, SubmissionReviewRound, Task } from "../types/task";
import TaskCalendar from "../components/TaskCalendar.vue";

type CreateTaskForm = Omit<CreateTaskPayload, "childId"> & { childIds: string[] };
type ReviewPoint = { x: number; y: number };
type ReviewTextAnnotation = { id: string; type: "text" | "emoji"; text: string; x: number; y: number; color: string; backgroundColor?: string; fontSize: number; rotation: number };
type ReviewRectangleAnnotation = { id: string; type: "rectangle"; x: number; y: number; width: number; height: number; color: string; lineWidth: number };
type ReviewPathAnnotation = { id: string; type: "path"; points: ReviewPoint[]; color: string; lineWidth: number; arrow?: boolean };
type ReviewAnnotation = ReviewTextAnnotation | ReviewRectangleAnnotation | ReviewPathAnnotation;
type ReviewTextEditor = { x: number; y: number; value: string };
type ReviewResizeHandle = "top-left" | "top" | "top-right" | "left" | "right" | "bottom-left" | "bottom" | "bottom-right" | "start" | "end";
type ReviewSelectionHandle = { x: number; y: number; handle: ReviewResizeHandle };

const auth = useAuthStore();
const tasks = ref<Task[]>([]);
const allTasksForSelectedDate = ref<Task[]>([]);
const calendarTasks = ref<Task[]>([]);
const children = ref<Child[]>([]);
const loading = ref(false);
const calendarLoading = ref(false);
const dialogVisible = ref(false);
const detailVisible = ref(false);
const detailTask = ref<Task | null>(null);
const detailColumnCount = ref(window.innerWidth <= 620 ? 1 : 2);
const submissionPhotos = ref<SubmissionPhoto[]>([]);
const submissionAudio = ref<SubmissionAudio | null>(null);
const submissionAudioFeedback = ref("");
const submissionSubmittedAt = ref<string | null>(null);
const submissionNote = ref("");
const submissionReviewImageUrl = ref<string | null>(null);
const submissionReviewRounds = ref<SubmissionReviewRound[]>([]);
const orderedSubmissionReviewRounds = computed(() => [...submissionReviewRounds.value].sort((left, right) => left.sequence - right.sequence));
const taskPhotoPreviews = ref<Record<string, SubmissionPhoto[]>>({});
const taskAudioPreviews = ref<Record<string, boolean>>({});
const submissionPhotosLoading = ref(false);
const reviewResultVisible = ref(false);
const selectedReviewImageUrl = ref<string | null>(null);
const selectedReviewPhoto = ref<SubmissionPhoto | null>(null);
const reviewReplacementImageId = ref<string | null>(null);
const originalPreviewVisible = ref(false);
const originalPreviewUrl = ref<string | null>(null);
const reviewVisible = ref(false);
const audioReviewVisible = ref(false);
const audioReviewFeedback = ref("");
const audioReviewSubmitting = ref(false);
const reviewPhoto = ref<SubmissionPhoto | null>(null);
const reviewPhotos = ref<SubmissionPhoto[]>([]);
const reviewPhotoIndex = ref(0);
const reviewedPhotoBlobs = ref<Record<string, Blob>>({});
const canReviewPreviousPhoto = computed(() => reviewPhotoIndex.value > 0);
const canReviewNextPhoto = computed(() => reviewPhotoIndex.value < reviewPhotos.value.length - 1);
const reviewCanvas = ref<HTMLCanvasElement | null>(null);
const reviewCanvasShell = ref<HTMLElement | null>(null);
const reviewStage = ref<HTMLElement | null>(null);
const reviewColor = ref("#ff5a63");
const reviewLineWidth = ref(6);
const reviewZoom = ref(100);
const reviewRotation = ref(0);
const reviewTool = ref<"pen" | "text" | "rectangle" | "emoji" | "arrow" | null>(null);
const reviewFontSize = ref(42);
const reviewEmoji = ref("👍");
const reviewTextWithBackground = ref(false);
const reviewColorPalette = ["#20a8ee", "#9ad400", "#ffc400", "#55585e", "#ffffff", "#ff5a63"];
const reviewLineSizes = [
  { label: "小", value: 3 },
  { label: "中", value: 6 },
  { label: "大", value: 10 }
];
const reviewTextSizes = [
  { label: "小", value: 27 },
  { label: "中", value: 42 },
  { label: "大", value: 60 }
];
const reviewAnnotations = ref<ReviewAnnotation[]>([]);
const selectedReviewAnnotationId = ref<string | null>(null);
const reviewTextEditor = ref<ReviewTextEditor | null>(null);
const reviewTextInput = ref<HTMLInputElement | null>(null);
const reviewCanvasDisplay = ref({ width: 0, height: 0 });
const reviewCanvasSize = ref({ width: 0, height: 0 });
const reviewShapeAnnotations = computed(() => reviewAnnotations.value.filter((annotation): annotation is ReviewRectangleAnnotation | ReviewPathAnnotation => annotation.type === "rectangle" || annotation.type === "path"));
const reviewTextAnnotations = computed(() => reviewAnnotations.value.filter((annotation): annotation is ReviewTextAnnotation => annotation.type === "text" || annotation.type === "emoji"));
const selectedReviewAnnotation = computed(() => reviewAnnotations.value.find((annotation) => annotation.id === selectedReviewAnnotationId.value) || null);
let movingAnnotation: { id: string; startPoint: ReviewPoint; initial: ReviewAnnotation } | null = null;
let resizingAnnotation: { id: string; handle: ReviewResizeHandle; startPoint: ReviewPoint; initial: ReviewRectangleAnnotation | ReviewPathAnnotation } | null = null;
let drawingAnnotationId: string | null = null;
let drawingStartPoint: ReviewPoint | null = null;
const reviewPanning = ref(false);
let reviewPanStart: { x: number; y: number; scrollLeft: number; scrollTop: number } | null = null;
const reviewSubmitting = ref(false);
const selectedSubmissionId = ref<string | null>(null);
const statusRepairVisible = ref(false);
const statusRepairTask = ref<Task | null>(null);
const statusRepairValue = ref<"unclaimed" | "claimed" | "completed">("unclaimed");
const statusRepairing = ref(false);
const editingTaskId = ref("");
const saving = ref(false);
const filters = reactive({ childId: "" });
const selectedDate = ref(dateKey(new Date()));
const calendarRange = reactive(initialWeekRange());
const form = reactive<CreateTaskForm>({ childIds: [], title: "", startDate: selectedDate.value, scheduleTime: currentTime(), repeatType: "daily", requiresPhotoUpload: true, voiceEnabled: true, claimReminderEnabled: false, voiceContent: "", voiceReminderCount: 1 });
const repeatLabels: Record<RepeatType, string> = { once: "仅一次", daily: "每天", weekdays: "工作日", weekly: "每周" };
type CalendarDotStatus = "revision" | "review" | "pending" | "completed";

const calendarDotPriority: Record<CalendarDotStatus, number> = {
  revision: 5,
  review: 4,
  pending: 2,
  completed: 1
};

function calendarDotStatus(task: Task): CalendarDotStatus {
  if (task.reviewStatus === "needs_revision") return "revision";
  if (task.reviewStatus === "pending_review") return "review";
  if (task.status === "completed" || task.reviewStatus === "completed") return "completed";
  return "pending";
}

const calendarTaskDates = computed(() => calendarTasks.value.reduce<Record<string, CalendarDotStatus>>((dates, task) => {
  if (!task.occurrenceDate) return dates;
  const status = calendarDotStatus(task);
  const current = dates[task.occurrenceDate];
  if (!current || calendarDotPriority[status] > calendarDotPriority[current]) dates[task.occurrenceDate] = status;
  return dates;
}, {}));
const dialogTitle = computed(() => editingTaskId.value ? "编辑任务" : "新建任务");
const quickMemberOptions = computed(() => {
  const toProgress = (completed: number, total: number) => ({
    completed,
    total,
    label: `${completed}/${total}`,
    percent: total ? Math.round((completed / total) * 100) : 0
  });
  const progress = new Map<string, { completed: number; total: number }>();
  allTasksForSelectedDate.value.forEach((task) => {
    const current = progress.get(task.childId) || { completed: 0, total: 0 };
    current.total += 1;
    if (task.status === "completed") current.completed += 1;
    progress.set(task.childId, current);
  });
  const allProgress = allTasksForSelectedDate.value.reduce(
    (current, task) => ({
      total: current.total + 1,
      completed: current.completed + (task.status === "completed" ? 1 : 0)
    }),
    { completed: 0, total: 0 }
  );
  return [
    { id: "", name: "全部", progress: toProgress(allProgress.completed, allProgress.total) },
    ...children.value.map((child) => {
      const childProgress = progress.get(child.id) || { completed: 0, total: 0 };
      return { id: child.id, name: child.name, progress: toProgress(childProgress.completed, childProgress.total) };
    })
  ];
});

function dateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function initialWeekRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: dateKey(start), to: dateKey(end) };
}

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function childName(childId: string) {
  return children.value.find((child) => child.id === childId)?.name || "未知成员";
}

function taskRowKey(task: Task) {
  return `${task.id}-${task.occurrenceDate || "today"}`;
}

function canComplete(task: Task) {
  return task.status !== "completed" && task.occurrenceDate === dateKey(new Date());
}

function taskStatusLabel(task: Task) {
  if (task.reviewStatus === "needs_revision") return "待修改";
  if (task.reviewStatus === "pending_review") return "待批改";
  return task.status === "completed" ? "已完成" : "待完成";
}

function taskStateClass(task: Task) {
  if (task.reviewStatus === "needs_revision") return "task-state--revision";
  if (task.reviewStatus === "pending_review") return "task-state--review";
  if (task.status === "completed" || task.reviewStatus === "completed") return "task-state--completed";
  return "task-state--pending";
}

function hasSubmission(task: Task) {
  return Boolean(task.submissionId || task.submissionStatus);
}

function canReviewSubmission(task: Task | null) {
  return Boolean(task && task.reviewStatus === "pending_review" && auth.user?.role !== "child");
}

function canReReviewSubmission(task: Task | null) {
  return Boolean(task && task.submissionStatus === "submitted" && !task.finalizedAt && auth.user?.role !== "child");
}

async function loadTasks() {
  loading.value = true;
  taskPhotoPreviews.value = {};
  taskAudioPreviews.value = {};
  try {
    const allTasksRequest = getTasks({ date: selectedDate.value });
    const filteredTasksRequest = filters.childId
      ? getTasks({ childId: filters.childId, date: selectedDate.value })
      : allTasksRequest;
    const [allTasks, visibleTasks] = await Promise.all([allTasksRequest, filteredTasksRequest]);
    allTasksForSelectedDate.value = allTasks;
    tasks.value = visibleTasks;
    const previews = await Promise.all(tasks.value.map(async (task) => {
      if (!hasSubmission(task)) return [taskRowKey(task), { photos: [] as SubmissionPhoto[], hasAudio: false }] as const;
      try {
        const submission = await getTaskSubmission(task.id, task.occurrenceDate || selectedDate.value);
        // 当前提交的照片与已进入批改记录的照片可能是同一批，按照片 ID 去重。
        // 因此这里既能累计多轮提交的所有作业照片，也不会把同一轮重复计算两次。
        const photoById = new Map<string, SubmissionPhoto>();
        [...submission.reviewRounds.flatMap((round) => round.photos), ...submission.photos]
          .forEach((photo) => photoById.set(photo.id, photo));
        const previewPhotos = [...photoById.values()];
        const hasAudio = Boolean(submission.audio || submission.reviewRounds.some((round) => round.audios.length));
        return [taskRowKey(task), { photos: previewPhotos, hasAudio }] as const;
      } catch { return [taskRowKey(task), { photos: [] as SubmissionPhoto[], hasAudio: false }] as const; }
    }));
    taskPhotoPreviews.value = Object.fromEntries(previews.map(([key, preview]) => [key, preview.photos]));
    taskAudioPreviews.value = Object.fromEntries(previews.map(([key, preview]) => [key, preview.hasAudio]));
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "任务加载失败。");
  } finally {
    loading.value = false;
  }
}

async function loadCalendar() {
  calendarLoading.value = true;
  try {
    calendarTasks.value = await getTasks({
      childId: filters.childId,
      dateFrom: calendarRange.from,
      dateTo: calendarRange.to
    });
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "任务日历加载失败。");
  } finally {
    calendarLoading.value = false;
  }
}

async function refreshTaskData() {
  await Promise.all([loadTasks(), loadCalendar()]);
}

function selectCalendarDate(date: string) {
  selectedDate.value = date;
  void loadTasks();
}

function changeCalendarRange(range: { from: string; to: string }) {
  Object.assign(calendarRange, range);
  void loadCalendar();
}

function selectQuickMember(childId: string) {
  if (filters.childId === childId) return;
  filters.childId = childId;
  void refreshTaskData();
}

function openCreate() {
  editingTaskId.value = "";
  Object.assign(form, {
    childIds: children.value.map((child) => child.id),
    title: "",
    startDate: selectedDate.value,
    scheduleTime: currentTime(),
    repeatType: "daily",
    requiresPhotoUpload: true,
    voiceEnabled: true,
    claimReminderEnabled: false,
    voiceContent: "",
    voiceReminderCount: 1
  });
  dialogVisible.value = true;
}

function openEdit(task: Task) {
  editingTaskId.value = task.id;
  Object.assign(form, {
    childIds: [task.childId],
    title: task.title,
    startDate: task.startDate || task.occurrenceDate || selectedDate.value,
    scheduleTime: task.scheduleTime,
    repeatType: task.repeatType,
    requiresPhotoUpload: task.requiresPhotoUpload,
    voiceEnabled: task.voiceEnabled,
    claimReminderEnabled: task.claimReminderEnabled,
    voiceContent: task.voiceContent === task.title ? "" : task.voiceContent,
    voiceReminderCount: task.voiceReminderCount
  });
  dialogVisible.value = true;
}

let reviewSourceImage: HTMLImageElement | null = null;
let reviewImageLoadVersion = 0;
let reviewZoomAnchorJob = 0;

function trackTaskDetail(task: Task) {
  void trackAccessEvent({
    eventName: "task_detail_viewed",
    route: "/tasks",
    resourceType: "task",
    resourceId: task.id
  });
}

function selectReviewTool(tool: "pen" | "text" | "rectangle" | "emoji" | "arrow") {
  reviewTool.value = tool;
}

async function openDetail(task: Task) {
  detailTask.value = task;
  submissionPhotos.value = [];
  submissionAudio.value = null;
  submissionAudioFeedback.value = "";
  submissionSubmittedAt.value = null;
  submissionNote.value = "";
  submissionReviewImageUrl.value = null;
  selectedReviewImageUrl.value = null;
  selectedReviewPhoto.value = null;
  reviewReplacementImageId.value = null;
  submissionReviewRounds.value = [];
  detailVisible.value = true;
  trackTaskDetail(task);

  if (!hasSubmission(task)) return;

  submissionPhotosLoading.value = true;
  try {
    const submission = await getTaskSubmission(task.id, task.occurrenceDate || selectedDate.value);
    submissionPhotos.value = submission.photos;
    submissionAudio.value = submission.audio;
    submissionAudioFeedback.value = submission.audioFeedback;
    submissionSubmittedAt.value = submission.submittedAt;
    submissionNote.value = submission.note.trim();
    submissionReviewImageUrl.value = submission.reviewImageUrl;
    submissionReviewRounds.value = submission.reviewRounds;
    selectedSubmissionId.value = submission.id;
  } catch (cause) {
    if (!(cause instanceof Error) || !cause.message.includes("404")) ElMessage.error(cause instanceof Error ? cause.message : "提交照片加载失败。");
  } finally {
    submissionPhotosLoading.value = false;
  }
}

async function openTaskReview(task: Task) {
  if (!canReviewSubmission(task)) {
    ElMessage.info(task.submissionStatus === "draft" ? "小朋友尚未提交作业，暂不能批改。" : "当前作业暂不能批改。");
    return;
  }
  await openDetail(task);
  const original = submissionPhotos.value[0];
  if (!original) {
    if (submissionAudio.value) openAudioReview();
    return;
  }
  await openReview(
    submissionReviewImageUrl.value ? { ...original, url: submissionReviewImageUrl.value } : original,
    submissionReviewImageUrl.value ? undefined : submissionPhotos.value
  );
}

function openAudioReview() {
  if (!selectedSubmissionId.value || !submissionAudio.value || !canReviewSubmission(detailTask.value)) {
    ElMessage.info("当前录音暂不能评价。");
    return;
  }
  audioReviewFeedback.value = submissionAudioFeedback.value;
  audioReviewVisible.value = true;
}

async function submitAudioFeedback() {
  if (!selectedSubmissionId.value) return;
  const feedback = audioReviewFeedback.value.trim();
  if (!feedback) {
    ElMessage.warning("请填写录音评价。");
    return;
  }
  audioReviewSubmitting.value = true;
  try {
    const submission = await submitSubmissionAudioReview(selectedSubmissionId.value, feedback);
    submissionAudioFeedback.value = submission.audioFeedback;
    submissionReviewImageUrl.value = submission.reviewImageUrl;
    submissionReviewRounds.value = submission.reviewRounds;
    audioReviewVisible.value = false;
    ElMessage.success("录音评价已提交，已通知小朋友。");
    await refreshTaskData();
    const currentDetail = detailTask.value;
    if (currentDetail) {
      const refreshed = tasks.value.find((task) => taskRowKey(task) === taskRowKey(currentDetail));
      if (refreshed) await openDetail(refreshed);
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "提交录音评价失败。");
  } finally {
    audioReviewSubmitting.value = false;
  }
}

async function openReviewEntry(task: Task) {
  await openDetail(task);
  if (task.finalizedAt && !submissionReviewImageUrl.value) return;
  if (submissionReviewImageUrl.value) {
    selectedReviewImageUrl.value = null;
    reviewResultVisible.value = true;
    return;
  }
  await openTaskReview(task);
}

async function restartReview() {
  const task = detailTask.value;
  if (task?.finalizedAt) return;
  reviewResultVisible.value = false;
  selectedReviewImageUrl.value = null;
  const reviewedPhoto = selectedReviewPhoto.value;
  selectedReviewPhoto.value = null;
  if (reviewedPhoto) {
    reviewReplacementImageId.value = reviewedPhoto.id;
    await openReview(reviewedPhoto);
    return;
  }
  if (task) await openTaskReview(task);
}

async function reviewRoundOriginal(photo: SubmissionPhoto, photos: SubmissionPhoto[] = [photo]) {
  if (!canReviewSubmission(detailTask.value)) {
    originalPreviewUrl.value = photo.url;
    originalPreviewVisible.value = true;
    return;
  }
  reviewReplacementImageId.value = null;
  await openReview(photo, photos);
}

function viewRoundReview(image: SubmissionPhoto) {
  selectedReviewPhoto.value = image;
  selectedReviewImageUrl.value = image.url;
  reviewResultVisible.value = true;
}

async function reReviewImage(image: SubmissionPhoto) {
  if (!canReReviewSubmission(detailTask.value)) {
    viewRoundReview(image);
    return;
  }
  selectedReviewPhoto.value = image;
  selectedReviewImageUrl.value = null;
  reviewReplacementImageId.value = image.id;
  reviewResultVisible.value = false;
  await openReview(image);
}

async function finalizeCurrentReview() {
  if (!selectedSubmissionId.value) return;
  try {
    await finalizeSubmissionReview(selectedSubmissionId.value);
    ElMessage.success("任务已关闭，不再要求儿童重新提交");
    await refreshTaskData();
    const currentDetail = detailTask.value;
    if (currentDetail) {
      const refreshed = tasks.value.find((task) => taskRowKey(task) === taskRowKey(currentDetail));
      if (refreshed) await openDetail(refreshed);
    }
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "结束任务失败。");
  }
}

function formatDateTime(value: string | null) {
  return value || "—";
}

function updateDetailColumns() {
  detailColumnCount.value = window.innerWidth <= 620 ? 1 : 2;
  fitReviewCanvas();
}

function formatBytes(byteSize: number) {
  return byteSize < 1024 * 1024
    ? `${Math.max(1, Math.round(byteSize / 1024))} KB`
    : `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}

function resetReviewCanvas() {
  reviewImageLoadVersion += 1;
  reviewSourceImage = null;
  stopReviewDrawing();
  reviewAnnotations.value = [];
  selectedReviewAnnotationId.value = null;
  reviewTextEditor.value = null;
  reviewCanvasDisplay.value = { width: 0, height: 0 };
  reviewCanvasSize.value = { width: 0, height: 0 };
  const canvas = reviewCanvas.value;
  const context = canvas?.getContext("2d");
  if (canvas && context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 1;
    canvas.height = 1;
  }
}

async function openReview(photo: SubmissionPhoto, photos: SubmissionPhoto[] = [photo], preserveStagedReviews = false) {
  const photoIndex = photos.findIndex((item) => item.id === photo.id);
  if (!preserveStagedReviews) reviewedPhotoBlobs.value = {};
  reviewPhotos.value = photos;
  reviewPhotoIndex.value = photoIndex >= 0 ? photoIndex : 0;
  reviewPhoto.value = photo;
  reviewZoom.value = 100;
  reviewRotation.value = 0;
  reviewTool.value = null;
  resetReviewCanvas();
  reviewVisible.value = true;
  await nextTick();
  loadReviewCanvas();
}

async function switchReviewPhoto(offset: number) {
  const nextIndex = reviewPhotoIndex.value + offset;
  const photo = reviewPhotos.value[nextIndex];
  if (!photo) return;
  try {
    await stashCurrentReviewedImage();
    await openReview(photo, reviewPhotos.value, true);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "暂存当前批改图片失败。");
  }
}

function loadReviewCanvas() {
  const canvas = reviewCanvas.value;
  const photo = reviewPhoto.value;
  if (!canvas || !photo) return;

  const loadVersion = ++reviewImageLoadVersion;
  const image = new Image();
  const stagedImage = reviewedPhotoBlobs.value[photo.id];
  const sourceUrl = stagedImage ? URL.createObjectURL(stagedImage) : photo.url;
  const releaseSourceUrl = () => {
    if (stagedImage) URL.revokeObjectURL(sourceUrl);
  };
  image.crossOrigin = "anonymous";
  image.onload = () => {
    releaseSourceUrl();
    if (loadVersion !== reviewImageLoadVersion || reviewPhoto.value?.id !== photo.id) return;
    reviewSourceImage = image;
    renderReviewSourceImage();
  };
  image.onerror = () => {
    releaseSourceUrl();
    ElMessage.error("批改图片加载失败。");
  };
  image.src = sourceUrl;
}

function renderReviewSourceImage() {
  const canvas = reviewCanvas.value;
  const image = reviewSourceImage;
  if (!canvas || !image) return;
  const normalizedRotation = ((reviewRotation.value % 360) + 360) % 360;
  const isSideways = normalizedRotation === 90 || normalizedRotation === 270;
  canvas.width = isSideways ? image.naturalHeight : image.naturalWidth;
  canvas.height = isSideways ? image.naturalWidth : image.naturalHeight;
  reviewCanvasSize.value = { width: canvas.width, height: canvas.height };
  const context = canvas.getContext("2d");
  if (!context) return;
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((normalizedRotation * Math.PI) / 180);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  context.restore();
  fitReviewCanvas();
}

function rotateReviewImage(degrees: number) {
  const canvas = reviewCanvas.value;
  if (!reviewSourceImage || !canvas) return;
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;
  commitReviewText();
  const clockwise = degrees > 0;
  reviewAnnotations.value = reviewAnnotations.value.map((annotation) => rotateReviewAnnotation(annotation, oldWidth, oldHeight, clockwise));
  reviewRotation.value = (reviewRotation.value + degrees + 360) % 360;
  stopReviewDrawing();
  renderReviewSourceImage();
}

function fitReviewCanvas() {
  const canvas = reviewCanvas.value;
  const shell = reviewCanvasShell.value;
  if (!canvas || !shell || !canvas.width || !canvas.height) return;
  const bounds = shell.getBoundingClientRect();
  const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height, 1) * (reviewZoom.value / 100);
  canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
  canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
  reviewCanvasDisplay.value = { width: Math.floor(canvas.width * scale), height: Math.floor(canvas.height * scale) };
}

function showWholeReviewImage() {
  reviewZoom.value = 100;
  fitReviewCanvas();
}

function changeReviewZoom(delta: number) {
  reviewZoom.value = Math.max(25, Math.min(250, reviewZoom.value + delta));
  fitReviewCanvas();
}

function handleReviewZoomWheel(event: WheelEvent) {
  if (!event.deltaY) return;
  const shell = reviewCanvasShell.value;
  const stage = reviewStage.value;
  if (!shell || !stage) {
    changeReviewZoom(event.deltaY < 0 ? 10 : -10);
    return;
  }

  const before = stage.getBoundingClientRect();
  if (!before.width || !before.height) return;
  const anchorX = Math.max(0, Math.min(1, (event.clientX - before.left) / before.width));
  const anchorY = Math.max(0, Math.min(1, (event.clientY - before.top) / before.height));
  const nextZoom = Math.max(25, Math.min(250, reviewZoom.value + (event.deltaY < 0 ? 10 : -10)));
  if (nextZoom === reviewZoom.value) return;

  reviewZoom.value = nextZoom;
  fitReviewCanvas();
  const job = ++reviewZoomAnchorJob;
  void nextTick().then(() => {
    if (job !== reviewZoomAnchorJob) return;
    const after = stage.getBoundingClientRect();
    // 缩放后把鼠标下的同一像素点移回原来的屏幕位置。
    shell.scrollLeft += after.left + (after.width * anchorX) - event.clientX;
    shell.scrollTop += after.top + (after.height * anchorY) - event.clientY;
  });
}

function reviewPoint(event: MouseEvent): ReviewPoint | null {
  const canvas = reviewCanvas.value;
  if (!canvas) return null;
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
    y: (event.clientY - bounds.top) * (canvas.height / bounds.height)
  };
}

function reviewAnnotationId() {
  return `${Date.now()}-${Math.random()}`;
}

function translateReviewAnnotation(annotation: ReviewAnnotation, deltaX: number, deltaY: number, maxWidth: number, maxHeight: number): ReviewAnnotation {
  if (annotation.type === "path") {
    return {
      ...annotation,
      points: annotation.points.map((point) => ({
        x: Math.max(0, Math.min(maxWidth, point.x + deltaX)),
        y: Math.max(0, Math.min(maxHeight, point.y + deltaY))
      }))
    };
  }
  if (annotation.type === "rectangle") {
    return {
      ...annotation,
      x: Math.max(0, Math.min(maxWidth - annotation.width, annotation.x + deltaX)),
      y: Math.max(0, Math.min(maxHeight - annotation.height, annotation.y + deltaY))
    };
  }
  return {
    ...annotation,
    x: Math.max(0, Math.min(maxWidth, annotation.x + deltaX)),
    y: Math.max(0, Math.min(maxHeight, annotation.y + deltaY))
  };
}

function copyReviewAnnotation(annotation: ReviewAnnotation): ReviewAnnotation {
  if (annotation.type === "path") {
    return { ...annotation, points: annotation.points.map((point) => ({ ...point })) };
  }
  return { ...annotation };
}

function rotateReviewPoint(point: ReviewPoint, width: number, height: number, clockwise: boolean): ReviewPoint {
  return clockwise ? { x: height - point.y, y: point.x } : { x: point.y, y: width - point.x };
}

function rotateReviewAnnotation(annotation: ReviewAnnotation, width: number, height: number, clockwise: boolean): ReviewAnnotation {
  if (annotation.type === "path") {
    return { ...annotation, points: annotation.points.map((point) => rotateReviewPoint(point, width, height, clockwise)) };
  }
  if (annotation.type === "text" || annotation.type === "emoji") {
    return {
      ...annotation,
      ...rotateReviewPoint(annotation, width, height, clockwise),
      rotation: ((annotation.rotation || 0) + (clockwise ? 90 : -90) + 360) % 360
    };
  }
  if (annotation.type !== "rectangle") return annotation;
  const corners = [
    rotateReviewPoint({ x: annotation.x, y: annotation.y }, width, height, clockwise),
    rotateReviewPoint({ x: annotation.x + annotation.width, y: annotation.y }, width, height, clockwise),
    rotateReviewPoint({ x: annotation.x, y: annotation.y + annotation.height }, width, height, clockwise),
    rotateReviewPoint({ x: annotation.x + annotation.width, y: annotation.y + annotation.height }, width, height, clockwise)
  ];
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  return { ...annotation, x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

function reviewPathData(annotation: ReviewPathAnnotation) {
  if (annotation.points.length === 1) {
    const [point] = annotation.points;
    return `M${point.x} ${point.y}L${point.x + 0.01} ${point.y + 0.01}`;
  }
  return annotation.points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ");
}

function reviewArrowHeadData(annotation: ReviewPathAnnotation) {
  const geometry = reviewArrowGeometry(annotation);
  if (!geometry) return "";
  const { end, left, right } = geometry;
  return `M${end.x} ${end.y}L${left.x} ${left.y}L${right.x} ${right.y}Z`;
}

function reviewArrowGeometry(annotation: ReviewPathAnnotation) {
  if (!annotation.arrow || annotation.points.length < 2) return null;
  const end = annotation.points.at(-1)!;
  const start = annotation.points.at(-2)!;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return null;
  const angle = Math.atan2(dy, dx);
  // 加大、加宽箭头尖端；短箭头仍保留足够的箭杆，避免箭头被箭尖完全覆盖。
  const headLength = Math.min(Math.max(24, annotation.lineWidth * 4), distance * 0.7);
  const spread = Math.PI / 6;
  const left = { x: end.x - headLength * Math.cos(angle - spread), y: end.y - headLength * Math.sin(angle - spread) };
  const right = { x: end.x - headLength * Math.cos(angle + spread), y: end.y - headLength * Math.sin(angle + spread) };
  const base = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  return { end, left, right, base };
}

function reviewArrowShaftData(annotation: ReviewPathAnnotation) {
  const geometry = reviewArrowGeometry(annotation);
  if (!geometry) return reviewPathData(annotation);
  return [...annotation.points.slice(0, -1), geometry.base].map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ");
}

function reviewSelectionHandles(annotation: ReviewRectangleAnnotation | ReviewPathAnnotation): ReviewSelectionHandle[] {
  if (annotation.type === "path") {
    // 手绘线条只可移动；仅箭头展示端点，用于调整方向与长度。
    if (!annotation.arrow) return [];
    const first = annotation.points[0];
    const last = annotation.points.at(-1);
    return first && last && first !== last
      ? [{ ...first, handle: "start" }, { ...last, handle: "end" }]
      : [];
  }
  const { x, y, width, height } = annotation;
  return [
    { x, y, handle: "top-left" },
    { x: x + width / 2, y, handle: "top" },
    { x: x + width, y, handle: "top-right" },
    { x, y: y + height / 2, handle: "left" },
    { x: x + width, y: y + height / 2, handle: "right" },
    { x, y: y + height, handle: "bottom-left" },
    { x: x + width / 2, y: y + height, handle: "bottom" },
    { x: x + width, y: y + height, handle: "bottom-right" }
  ];
}

function startReviewDrawing(event: MouseEvent) {
  if (event.button !== 0) return;
  const point = reviewPoint(event);
  if (!point) return;
  commitReviewText();
  if (!reviewTool.value) return;
  if (reviewTool.value === "text") {
    startReviewTextEditor(point);
    return;
  }
  if (reviewTool.value === "emoji") {
    insertReviewEmoji(point);
    return;
  }
  const annotation: ReviewAnnotation = reviewTool.value === "rectangle"
    ? { id: reviewAnnotationId(), type: "rectangle", x: point.x, y: point.y, width: 0, height: 0, color: reviewColor.value, lineWidth: reviewLineWidth.value }
    : { id: reviewAnnotationId(), type: "path", points: [point], color: reviewColor.value, lineWidth: reviewLineWidth.value, arrow: reviewTool.value === "arrow" };
  reviewAnnotations.value.push(annotation);
  // 新绘制的批注不进入选中态；需要编辑时由用户再次点击它。
  selectedReviewAnnotationId.value = null;
  drawingAnnotationId = annotation.id;
  drawingStartPoint = point;
}

function startReviewPan(event: MouseEvent) {
  if (event.button !== 2) return;
  const shell = reviewCanvasShell.value;
  if (!shell) return;
  reviewPanning.value = true;
  reviewPanStart = {
    x: event.clientX,
    y: event.clientY,
    scrollLeft: shell.scrollLeft,
    scrollTop: shell.scrollTop
  };
  event.preventDefault();
}

function startReviewTextEditor(point: ReviewPoint) {
  reviewTextEditor.value = { x: point.x, y: point.y, value: "" };
  selectedReviewAnnotationId.value = null;
  nextTick(() => {
    // 等输入框进入布局后的下一帧再聚焦，避免画布点击事件抢走焦点。
    requestAnimationFrame(() => {
      const input = reviewTextInput.value;
      if (!input) return;
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    });
  });
}

function commitReviewText() {
  const editor = reviewTextEditor.value;
  if (!editor) return;
  const text = editor.value.trim();
  if (text) {
    const annotation: ReviewTextAnnotation = {
      id: reviewAnnotationId(),
      type: "text",
      text,
      x: editor.x,
      y: editor.y,
      color: reviewTextWithBackground.value ? "#ffffff" : reviewColor.value,
      backgroundColor: reviewTextWithBackground.value ? reviewColor.value : undefined,
      fontSize: reviewFontSize.value,
      rotation: 0
    };
    reviewAnnotations.value.push(annotation);
    // 文字确认后直接回到未选中状态，避免误移动或误删除。
    selectedReviewAnnotationId.value = null;
  }
  reviewTextEditor.value = null;
}

function cancelReviewText() {
  reviewTextEditor.value = null;
}

function handleReviewTextEditorKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    event.preventDefault();
    commitReviewText();
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancelReviewText();
  }
}

function syncReviewTextEditor(event: Event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !reviewTextEditor.value) return;
  // v-model 在中文输入法组合阶段可能延后同步；这里直接同步，确保输入框实时增宽。
  reviewTextEditor.value.value = input.value;
}

function closeReviewTextEditorOutsideImage(event: PointerEvent) {
  if (!reviewVisible.value || !reviewTextEditor.value) return;
  const target = event.target;
  if (target instanceof Node && reviewStage.value?.contains(target)) return;
  commitReviewText();
}

function replaceSelectedReviewAnnotation(annotation: ReviewAnnotation) {
  const index = reviewAnnotations.value.findIndex((item) => item.id === annotation.id);
  if (index >= 0) reviewAnnotations.value.splice(index, 1, annotation);
}

function selectReviewAnnotation(annotation: ReviewAnnotation) {
  selectedReviewAnnotationId.value = annotation.id;
  if (annotation.type === "text" || annotation.type === "emoji") {
    reviewTool.value = annotation.type;
    if (annotation.type === "text") {
      reviewFontSize.value = annotation.fontSize;
      reviewTextWithBackground.value = Boolean(annotation.backgroundColor);
      reviewColor.value = annotation.backgroundColor || annotation.color;
    }
    return;
  }
  if (annotation.type === "rectangle") {
    reviewTool.value = "rectangle";
    reviewLineWidth.value = annotation.lineWidth;
    reviewColor.value = annotation.color;
    return;
  }
  if (annotation.type === "path") {
    reviewTool.value = annotation.arrow ? "arrow" : "pen";
    reviewLineWidth.value = annotation.lineWidth;
    reviewColor.value = annotation.color;
  }
}

function setReviewColor(color: string) {
  reviewColor.value = color;
  const annotation = selectedReviewAnnotation.value;
  if (!annotation) return;
  if (annotation.type === "text") {
    replaceSelectedReviewAnnotation(annotation.backgroundColor
      ? { ...annotation, backgroundColor: color, color: "#ffffff" }
      : { ...annotation, color });
    return;
  }
  if (annotation.type !== "emoji") replaceSelectedReviewAnnotation({ ...annotation, color });
}

function setReviewLineWidth(value: number) {
  reviewLineWidth.value = value;
  const annotation = selectedReviewAnnotation.value;
  if (annotation && (annotation.type === "rectangle" || annotation.type === "path")) {
    replaceSelectedReviewAnnotation({ ...annotation, lineWidth: value });
  }
}

function setReviewFontSize(value: number) {
  reviewFontSize.value = value;
  const annotation = selectedReviewAnnotation.value;
  if (annotation?.type === "text") replaceSelectedReviewAnnotation({ ...annotation, fontSize: value });
}

function toggleReviewTextBackground() {
  reviewTextWithBackground.value = !reviewTextWithBackground.value;
  const annotation = selectedReviewAnnotation.value;
  if (annotation?.type !== "text") return;
  replaceSelectedReviewAnnotation(reviewTextWithBackground.value
    ? { ...annotation, backgroundColor: reviewColor.value, color: "#ffffff" }
    : { ...annotation, backgroundColor: undefined, color: reviewColor.value });
}

function startMoveAnnotation(event: MouseEvent | PointerEvent, annotation: ReviewAnnotation) {
  commitReviewText();
  const point = reviewPoint(event);
  if (!point) return;
  selectReviewAnnotation(annotation);
  movingAnnotation = { id: annotation.id, startPoint: point, initial: copyReviewAnnotation(annotation) };
  if (event instanceof PointerEvent && event.currentTarget instanceof Element) event.currentTarget.setPointerCapture?.(event.pointerId);
  window.addEventListener("pointermove", moveAnnotation);
  window.addEventListener("mousemove", moveAnnotation);
  window.addEventListener("pointerup", stopMoveAnnotation, { once: true });
  window.addEventListener("mouseup", stopMoveAnnotation, { once: true });
  window.addEventListener("pointercancel", stopMoveAnnotation, { once: true });
}

function startResizeAnnotation(event: MouseEvent | PointerEvent, annotation: ReviewRectangleAnnotation | ReviewPathAnnotation, handle: ReviewResizeHandle) {
  commitReviewText();
  const point = reviewPoint(event);
  if (!point) return;
  selectReviewAnnotation(annotation);
  resizingAnnotation = { id: annotation.id, handle, startPoint: point, initial: copyReviewAnnotation(annotation) as ReviewRectangleAnnotation | ReviewPathAnnotation };
  if (event instanceof PointerEvent && event.currentTarget instanceof Element) event.currentTarget.setPointerCapture?.(event.pointerId);
  window.addEventListener("pointermove", resizeAnnotation);
  window.addEventListener("mousemove", resizeAnnotation);
  window.addEventListener("pointerup", stopResizeAnnotation, { once: true });
  window.addEventListener("mouseup", stopResizeAnnotation, { once: true });
  window.addEventListener("pointercancel", stopResizeAnnotation, { once: true });
}

function resizeAnnotation(event: MouseEvent | PointerEvent) {
  if (!resizingAnnotation || !reviewCanvas.value) return;
  const point = reviewPoint(event);
  if (!point) return;
  const index = reviewAnnotations.value.findIndex((item) => item.id === resizingAnnotation?.id);
  if (index < 0) return;
  const { initial, handle } = resizingAnnotation;
  const maxWidth = reviewCanvas.value.width;
  const maxHeight = reviewCanvas.value.height;

  if (initial.type === "path") {
    const points = initial.points.map((item) => ({ ...item }));
    if (handle === "start") points[0] = { x: Math.max(0, Math.min(maxWidth, point.x)), y: Math.max(0, Math.min(maxHeight, point.y)) };
    if (handle === "end") points[points.length - 1] = { x: Math.max(0, Math.min(maxWidth, point.x)), y: Math.max(0, Math.min(maxHeight, point.y)) };
    reviewAnnotations.value.splice(index, 1, { ...initial, points });
    return;
  }

  const initialLeft = initial.x;
  const initialRight = initial.x + initial.width;
  const initialTop = initial.y;
  const initialBottom = initial.y + initial.height;
  let left = initialLeft;
  let right = initialRight;
  let top = initialTop;
  let bottom = initialBottom;
  const clampedX = Math.max(0, Math.min(maxWidth, point.x));
  const clampedY = Math.max(0, Math.min(maxHeight, point.y));
  if (handle.includes("left")) left = clampedX;
  if (handle.includes("right")) right = clampedX;
  if (handle.includes("top")) top = clampedY;
  if (handle.includes("bottom")) bottom = clampedY;
  if (handle === "left") left = clampedX;
  if (handle === "right") right = clampedX;
  if (handle === "top") top = clampedY;
  if (handle === "bottom") bottom = clampedY;
  reviewAnnotations.value.splice(index, 1, {
    ...initial,
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    width: Math.abs(right - left),
    height: Math.abs(bottom - top)
  });
}

function stopResizeAnnotation() {
  resizingAnnotation = null;
  window.removeEventListener("pointermove", resizeAnnotation);
  window.removeEventListener("mousemove", resizeAnnotation);
  window.removeEventListener("pointerup", stopResizeAnnotation);
  window.removeEventListener("mouseup", stopResizeAnnotation);
  window.removeEventListener("pointercancel", stopResizeAnnotation);
}

function moveAnnotation(event: MouseEvent | PointerEvent) {
  if (!movingAnnotation || !reviewCanvas.value) return;
  const point = reviewPoint(event);
  if (!point) return;
  const index = reviewAnnotations.value.findIndex((item) => item.id === movingAnnotation?.id);
  if (index < 0) return;
  const { initial, startPoint } = movingAnnotation;
  const deltaX = point.x - startPoint.x;
  const deltaY = point.y - startPoint.y;
  const moved = translateReviewAnnotation(initial, deltaX, deltaY, reviewCanvas.value.width, reviewCanvas.value.height);
  reviewAnnotations.value.splice(index, 1, moved);
}

function stopMoveAnnotation() {
  movingAnnotation = null;
  window.removeEventListener("pointermove", moveAnnotation);
  window.removeEventListener("mousemove", moveAnnotation);
  window.removeEventListener("pointerup", stopMoveAnnotation);
  window.removeEventListener("mouseup", stopMoveAnnotation);
  window.removeEventListener("pointercancel", stopMoveAnnotation);
}

function annotationStyle(annotation: ReviewTextAnnotation) {
  const canvas = reviewCanvas.value;
  const display = reviewCanvasDisplay.value;
  if (!canvas || !canvas.width || !canvas.height || !display.width) return {};
  const scale = display.width / canvas.width;
  const layout = reviewTextLayout(annotation.fontSize, Boolean(annotation.backgroundColor));
  return {
    // Text annotations use their visible glyph's top-left corner as the saved anchor.
    // Subtract background padding only from the wrapper, so the glyph remains at x/y.
    left: `${(annotation.x - layout.paddingX) * scale}px`,
    top: `${(annotation.y - layout.paddingY) * scale}px`,
    color: annotation.color,
    backgroundColor: annotation.backgroundColor || "transparent",
    fontSize: `${annotation.fontSize * scale}px`,
    padding: `${layout.paddingY * scale}px ${layout.paddingX * scale}px`,
    transform: `rotate(${annotation.rotation || 0}deg)`,
    transformOrigin: "0 0"
  };
}

function reviewTextLayout(fontSize: number, withBackground: boolean) {
  const paddingX = withBackground ? Math.round(fontSize * .28) : 0;
  const paddingY = withBackground ? Math.round(fontSize * .16) : 0;
  return {
    paddingX,
    paddingY,
    contentHeight: Math.ceil(fontSize * 1.2)
  };
}

function reviewTextEditorFrameStyle() {
  const editor = reviewTextEditor.value;
  const canvas = reviewCanvas.value;
  const display = reviewCanvasDisplay.value;
  if (!editor || !canvas || !canvas.width || !canvas.height || !display.width) return {};
  const scale = display.width / canvas.width;
  const fontSize = reviewFontSize.value;
  const layout = reviewTextLayout(fontSize, reviewTextWithBackground.value);
  // 左边缘保持不动，宽度取输入元素的真实内容宽度，中文输入法组合阶段也不会裁字。
  const measuredWidth = reviewTextInput.value ? Math.ceil(reviewTextInput.value.scrollWidth / scale) : 0;
  const estimatedWidth = 18 + editor.value.length * fontSize * .78;
  const contentWidth = Math.min(420, Math.max(42, estimatedWidth, measuredWidth + 2));
  return {
    left: `${(editor.x - layout.paddingX) * scale}px`,
    top: `${(editor.y - layout.paddingY) * scale}px`,
    color: reviewTextWithBackground.value ? "#ffffff" : reviewColor.value,
    backgroundColor: reviewTextWithBackground.value ? reviewColor.value : "transparent",
    fontSize: `${fontSize * scale}px`,
    padding: `${layout.paddingY * scale}px ${layout.paddingX * scale}px`,
    width: `${(contentWidth + layout.paddingX * 2) * scale}px`,
    height: `${(layout.contentHeight + layout.paddingY * 2) * scale}px`
  };
}

function insertReviewEmoji(point: { x: number; y: number }) {
  const annotation: ReviewTextAnnotation = { id: reviewAnnotationId(), type: "emoji", text: reviewEmoji.value, x: point.x, y: point.y, color: reviewColor.value, fontSize: 48, rotation: 0 };
  reviewAnnotations.value.push(annotation);
  selectedReviewAnnotationId.value = null;
  reviewTool.value = null;
}

function continueReviewDrawing(event: MouseEvent | PointerEvent) {
  if (reviewPanning.value && reviewPanStart) {
    const shell = reviewCanvasShell.value;
    if (shell) {
      shell.scrollLeft = reviewPanStart.scrollLeft - (event.clientX - reviewPanStart.x);
      shell.scrollTop = reviewPanStart.scrollTop - (event.clientY - reviewPanStart.y);
    }
    return;
  }
  if (movingAnnotation) {
    moveAnnotation(event);
    return;
  }
  if (resizingAnnotation) {
    resizeAnnotation(event);
    return;
  }
  const point = reviewPoint(event);
  if (!point) return;
  const annotation = reviewAnnotations.value.find((item) => item.id === drawingAnnotationId);
  if (!annotation) return;
  if (annotation.type === "path") {
    annotation.points = annotation.arrow ? [annotation.points[0], point] : [...annotation.points, point];
  } else if (annotation.type === "rectangle" && drawingStartPoint) {
    annotation.x = Math.min(drawingStartPoint.x, point.x);
    annotation.y = Math.min(drawingStartPoint.y, point.y);
    annotation.width = Math.abs(point.x - drawingStartPoint.x);
    annotation.height = Math.abs(point.y - drawingStartPoint.y);
  }
}

function stopReviewDrawing() {
  reviewPanning.value = false;
  reviewPanStart = null;
  drawingAnnotationId = null;
  drawingStartPoint = null;
}

function undoReviewAction() {
  const annotation = reviewAnnotations.value.pop();
  if (!annotation) {
    ElMessage.info("没有可撤销的批注。");
    return;
  }
  if (selectedReviewAnnotationId.value === annotation.id) selectedReviewAnnotationId.value = null;
}

function deleteSelectedReviewAnnotation() {
  const id = selectedReviewAnnotationId.value;
  if (!id) {
    ElMessage.info("请先点击要删除的批改内容。");
    return;
  }
  reviewAnnotations.value = reviewAnnotations.value.filter((annotation) => annotation.id !== id);
  selectedReviewAnnotationId.value = null;
}

function clearAllReviewAnnotations() {
  if (!reviewAnnotations.value.length && !reviewTextEditor.value) {
    ElMessage.info("当前没有可清除的批改。");
    return;
  }
  reviewAnnotations.value = [];
  reviewTextEditor.value = null;
  selectedReviewAnnotationId.value = null;
  stopReviewDrawing();
  stopMoveAnnotation();
  stopResizeAnnotation();
}

function handleReviewDeleteKey(event: KeyboardEvent) {
  if (!reviewVisible.value || (event.key !== "Delete" && event.key !== "Backspace")) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
  if (!selectedReviewAnnotationId.value) return;
  event.preventDefault();
  deleteSelectedReviewAnnotation();
}

function createReviewedExportCanvas(canvas: HTMLCanvasElement) {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const context = exportCanvas.getContext("2d");
  if (!context) return null;
  context.drawImage(canvas, 0, 0);
  context.textBaseline = "top";
  for (const annotation of reviewAnnotations.value) {
    if (annotation.type === "path") {
      if (annotation.points.length < 2) continue;
      context.strokeStyle = annotation.color;
      context.lineWidth = annotation.lineWidth;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      const pathPoints = annotation.arrow
        ? [...annotation.points.slice(0, -1), reviewArrowGeometry(annotation)?.base ?? annotation.points.at(-1)!]
        : annotation.points;
      context.moveTo(pathPoints[0].x, pathPoints[0].y);
      pathPoints.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
      const arrowGeometry = reviewArrowGeometry(annotation);
      if (arrowGeometry) {
        context.fillStyle = annotation.color;
        context.beginPath();
        context.moveTo(arrowGeometry.end.x, arrowGeometry.end.y);
        context.lineTo(arrowGeometry.left.x, arrowGeometry.left.y);
        context.lineTo(arrowGeometry.right.x, arrowGeometry.right.y);
        context.closePath();
        context.fill();
      }
    } else if (annotation.type === "rectangle") {
      context.strokeStyle = annotation.color;
      context.lineWidth = annotation.lineWidth;
      context.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
    } else {
      context.font = `${annotation.type === "text" ? "700 " : ""}${annotation.fontSize}px sans-serif`;
      context.save();
      context.translate(annotation.x, annotation.y);
      context.rotate(((annotation.rotation || 0) * Math.PI) / 180);
      if (annotation.backgroundColor) {
        const layout = reviewTextLayout(annotation.fontSize, true);
        const width = Math.ceil(context.measureText(annotation.text).width) + layout.paddingX * 2;
        const height = layout.contentHeight + layout.paddingY * 2;
        context.fillStyle = annotation.backgroundColor;
        context.beginPath();
        context.roundRect(-layout.paddingX, -layout.paddingY, width, height, Math.max(4, Math.round(annotation.fontSize * .2)));
        context.fill();
      }
      context.fillStyle = annotation.type === "emoji" ? "#111" : annotation.color;
      context.fillText(annotation.text, 0, 0);
      context.restore();
    }
  }
  return exportCanvas;
}

async function reviewedImageBlob() {
  commitReviewText();
  const canvas = reviewCanvas.value;
  if (!canvas) return null;
  const exportCanvas = createReviewedExportCanvas(canvas);
  if (!exportCanvas) return null;
  return new Promise<Blob | null>((resolve) => exportCanvas.toBlob(resolve, "image/png"));
}

async function stashCurrentReviewedImage() {
  const photo = reviewPhoto.value;
  if (!photo) return;
  const image = await reviewedImageBlob();
  if (!image) throw new Error("生成批改图片失败。");
  reviewedPhotoBlobs.value = { ...reviewedPhotoBlobs.value, [photo.id]: image };
}

async function submitReviewedImage() {
  if (!selectedSubmissionId.value) {
    ElMessage.error("未找到对应的作业提交。");
    return;
  }
  reviewSubmitting.value = true;
  try {
    await stashCurrentReviewedImage();
    const images = reviewPhotos.value
      .map((photo) => reviewedPhotoBlobs.value[photo.id])
      .filter((image): image is Blob => Boolean(image));
    if (!images.length) throw new Error("请至少批改一张图片。");
    const replacementImageId = reviewReplacementImageId.value;
    const submission = await submitSubmissionReview(selectedSubmissionId.value, images, replacementImageId);
    submissionPhotos.value = submission.photos;
    submissionSubmittedAt.value = submission.submittedAt;
    submissionNote.value = submission.note.trim();
    submissionReviewImageUrl.value = submission.reviewImageUrl;
    submissionReviewRounds.value = submission.reviewRounds;
    reviewReplacementImageId.value = null;
    reviewVisible.value = false;
    ElMessage.success(replacementImageId ? "已更新这张批改图片，已通知小朋友。" : `已提交 ${images.length} 张批改图片，已通知小朋友。`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "提交批改失败。");
  } finally {
    reviewSubmitting.value = false;
  }
}

async function submitTask() {
  const title = form.title.trim();
  if (!title) {
    ElMessage.warning("请输入任务名称");
    return;
  }
  if (!form.childIds.length) {
    ElMessage.warning("请至少选择一位小朋友");
    return;
  }
  if (!form.startDate) {
    ElMessage.warning("请选择执行日期");
    return;
  }

  saving.value = true;
  try {
    const { childIds, ...taskPayload } = form;
    if (editingTaskId.value) {
      await updateTask(editingTaskId.value, { ...taskPayload, title });
      await refreshTaskData();
      dialogVisible.value = false;
      ElMessage.success("任务已更新");
      return;
    }

    const results = await Promise.allSettled(
      childIds.map((childId) => createTask({ ...taskPayload, childId, title }))
    );
    const successCount = results.filter((result) => result.status === "fulfilled").length;
    const failedNames = results
      .map((result, index) => result.status === "rejected" ? childName(childIds[index]) : "")
      .filter(Boolean);

    if (successCount) await refreshTaskData();
    if (!failedNames.length) {
      dialogVisible.value = false;
      ElMessage.success(`已为 ${successCount} 位小朋友创建任务`);
    } else if (successCount) {
      dialogVisible.value = false;
      ElMessage.warning(`已创建 ${successCount} 项，${failedNames.join("、")}创建失败`);
    } else {
      ElMessage.error("任务创建失败，请稍后重试。");
    }
  } finally {
    saving.value = false;
  }
}

async function markComplete(task: Task) {
  try {
    await completeTask(task.id);
    ElMessage.success("已完成打卡");
    await refreshTaskData();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "打卡失败。");
  }
}

function repairStatusFor(task: Task): "unclaimed" | "claimed" | "completed" {
  // 以任务当前的真实状态为准，避免上一次打开弹窗的单选状态残留。
  if (task.status === "completed" || task.completedAt) return "completed";
  return task.claimedAt ? "claimed" : "unclaimed";
}

function openStatusRepair(task: Task) {
  statusRepairTask.value = task;
  statusRepairValue.value = repairStatusFor(task);
  statusRepairVisible.value = true;
}

async function saveStatusRepair() {
  const task = statusRepairTask.value;
  if (!task) return;
  try {
    await ElMessageBox.confirm(`确认将“${task.title}”修正为该状态吗？`, "修正任务状态", {
      type: "warning",
      confirmButtonText: "确认修正",
      cancelButtonText: "取消"
    });
    statusRepairing.value = true;
    const updated = await repairTaskStatus(task.id, task.occurrenceDate, statusRepairValue.value);
    statusRepairVisible.value = false;
    await refreshTaskData();
    if (detailTask.value && taskRowKey(detailTask.value) === taskRowKey(task)) await openDetail(updated);
    ElMessage.success("任务状态已修正");
  } catch (cause) {
    if (cause !== "cancel" && cause !== "close") ElMessage.error(cause instanceof Error ? cause.message : "任务状态修正失败。");
  } finally {
    statusRepairing.value = false;
  }
}

async function sendReminder(task: Task) {
  try {
    await remindTask(task.id);
    ElMessage.success(`已向${childName(task.childId)}发起一次语音提醒`);
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "提醒发送失败。");
  }
}

async function removeTask(task: Task) {
  try {
    await ElMessageBox.confirm(`删除“${task.title}”后，儿童端将不再显示该任务。`, "删除任务", { type: "warning", confirmButtonText: "确认删除", cancelButtonText: "取消" });
    await deleteTask(task.id);
    ElMessage.success("任务已删除");
    await refreshTaskData();
  } catch (cause) {
    if (cause !== "cancel" && cause !== "close") ElMessage.error(cause instanceof Error ? cause.message : "任务删除失败。");
  }
}

onMounted(async () => {
  window.addEventListener("resize", updateDetailColumns);
  window.addEventListener("keydown", handleReviewDeleteKey);
  window.addEventListener("pointerdown", closeReviewTextEditorOutsideImage, true);
  try {
    children.value = await getChildren();
    await refreshTaskData();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "任务数据加载失败。");
  }
});

onBeforeUnmount(() => {
  stopMoveAnnotation();
  stopResizeAnnotation();
  window.removeEventListener("resize", updateDetailColumns);
  window.removeEventListener("keydown", handleReviewDeleteKey);
  window.removeEventListener("pointerdown", closeReviewTextEditorOutsideImage, true);
});
</script>

<template>
  <div class="page-stack">
    <TaskCalendar
      :selected-date="selectedDate"
      :task-dates="calendarTaskDates"
      :loading="calendarLoading"
      @select="selectCalendarDate"
      @range-change="changeCalendarRange"
    />

    <section class="content-panel table-panel">
      <div class="panel-heading task-panel-heading">
        <div class="task-quick-switch-list task-quick-switch-list--embedded" role="list" aria-label="任务对象快速切换">
          <button
            v-for="member in quickMemberOptions"
            :key="member.id || 'all'"
            type="button"
            class="task-quick-switch-item"
            :class="{ 'is-active': filters.childId === member.id }"
            role="listitem"
            @click="selectQuickMember(member.id)"
          >
            <span class="task-quick-switch-name">{{ member.name }}</span>
            <b>{{ member.progress.label }}</b>
            <span class="task-quick-switch-progress" :aria-label="`${member.name} 已完成 ${member.progress.completed} 项，共 ${member.progress.total} 项`"><i :style="{ width: `${member.progress.percent}%` }" /></span>
          </button>
        </div>
        <div v-if="auth.user?.role !== 'child'" class="panel-heading-actions">
          <el-button type="primary" :icon="Plus" @click="openCreate">新建任务</el-button>
          <el-button :icon="Refresh" :loading="loading" @click="refreshTaskData">刷新</el-button>
        </div>
      </div>
      <el-table v-loading="loading" :data="tasks" :row-key="taskRowKey" class="data-table desktop-table" empty-text="没有符合条件的任务">
        <el-table-column prop="occurrenceDate" label="执行日期" width="108" />
        <el-table-column label="时间" width="72"><template #default="scope"><strong class="time-cell">{{ scope.row.scheduleTime }}</strong></template></el-table-column>
        <el-table-column label="任务名称" min-width="160"><template #default="scope"><button type="button" class="task-title-link" @click="openDetail(scope.row)">{{ scope.row.title }}</button></template></el-table-column>
        <el-table-column label="任务对象" width="78"><template #default="scope">{{ childName(scope.row.childId) }}</template></el-table-column>
        <el-table-column label="重复" width="72"><template #default="scope">{{ repeatLabels[scope.row.repeatType as RepeatType] }}</template></el-table-column>
        <el-table-column label="提醒" width="82"><template #default="scope">{{ scope.row.voiceEnabled ? `语音 ${scope.row.voiceReminderCount} 次` : "静默" }}</template></el-table-column>
        <el-table-column label="状态" width="82"><template #default="scope"><span class="status-dot task-state" :class="taskStateClass(scope.row)">{{ taskStatusLabel(scope.row) }}</span></template></el-table-column>
        <el-table-column label="附件" width="78"><template #default="scope"><span v-if="loading" class="task-attachment-loading" aria-label="正在加载附件"><el-icon class="is-loading"><Loading /></el-icon></span><button v-else-if="taskPhotoPreviews[taskRowKey(scope.row)]?.length" type="button" class="task-photo-preview" :title="`已上传 ${taskPhotoPreviews[taskRowKey(scope.row)].length} 张照片`" @click="openDetail(scope.row)"><img :src="taskPhotoPreviews[taskRowKey(scope.row)][0].url" alt="作业缩略图" /><span>{{ taskPhotoPreviews[taskRowKey(scope.row)].length }}</span></button><button v-else-if="taskAudioPreviews[taskRowKey(scope.row)]" type="button" class="task-photo-preview task-audio-preview" title="播放录音附件" aria-label="播放录音附件" @click="openDetail(scope.row)"><Play :size="19" fill="currentColor" aria-hidden="true" /></button><span v-else class="task-photo-empty">—</span></template></el-table-column>
        <el-table-column v-if="auth.user?.role !== 'child'" label="批改" width="88"><template #default="scope"><span v-if="scope.row.reviewStatus === 'not_required'" class="task-photo-empty">—</span><span v-else-if="scope.row.reviewStatus === 'completed'" class="task-photo-empty">已完成</span><span v-else-if="scope.row.reviewStatus === 'needs_revision'" class="task-photo-empty">待修改</span><el-button v-else-if="scope.row.reviewStatus === 'pending_review'" type="success" size="small" @click="openTaskReview(scope.row)">去批改</el-button><span v-else-if="scope.row.reviewStatus === 'submitting'" class="task-photo-empty">提交中</span><span v-else class="task-photo-empty">待提交</span></template></el-table-column>
        <el-table-column label="操作" width="92" fixed="right"><template #default="scope"><div v-if="auth.user?.role === 'child'" class="task-table-actions"><div class="task-table-actions__row"><el-button link type="primary" :disabled="!canComplete(scope.row)" @click="markComplete(scope.row)">完成</el-button></div></div><div v-else class="task-table-actions"><div class="task-table-actions__row"><el-button link type="primary" @click="openEdit(scope.row)">编辑</el-button><el-button link type="danger" @click="removeTask(scope.row)">删除</el-button></div><div class="task-table-actions__row"><el-button link type="primary" @click="sendReminder(scope.row)">提醒</el-button><el-button link @click="openDetail(scope.row)">详情</el-button></div></div></template></el-table-column>
      </el-table>
      <div v-loading="loading" class="mobile-data-list">
        <article v-for="task in tasks" :key="taskRowKey(task)" class="mobile-data-card">
          <div class="mobile-card-head">
            <div><time class="time-cell">{{ task.occurrenceDate }} {{ task.scheduleTime }}</time><h3><button type="button" class="task-title-link" @click="openDetail(task)">{{ task.title }}</button></h3></div>
            <span class="status-dot task-state" :class="taskStateClass(task)">{{ taskStatusLabel(task) }}</span>
          </div>
          <p>{{ childName(task.childId) }} · {{ repeatLabels[task.repeatType] }} · {{ task.voiceEnabled ? `语音 ${task.voiceReminderCount} 次：${task.voiceContent}` : "静默提醒" }}</p>
          <div class="mobile-card-actions"><template v-if="auth.user?.role === 'child'"><el-button link type="primary" :disabled="!canComplete(task)" @click="markComplete(task)">完成</el-button></template><template v-else><el-button link type="primary" @click="openEdit(task)">编辑</el-button><el-button link type="danger" @click="removeTask(task)">删除</el-button><el-button link type="primary" @click="sendReminder(task)">提醒</el-button><el-button link @click="openDetail(task)">详情</el-button></template></div>
        </article>
        <div v-if="!tasks.length && !loading" class="empty-state">没有符合条件的任务</div>
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" class="form-dialog">
      <el-form label-position="top">
        <el-form-item label="任务名称" required><el-input v-model="form.title" maxlength="40" show-word-limit placeholder="例如：完成数学作业" /></el-form-item>
        <div class="dialog-form-row">
          <el-form-item label="任务对象" required>
            <el-select v-model="form.childIds" multiple clearable :disabled="Boolean(editingTaskId)" placeholder="请选择一个或多个小朋友" style="width: 100%">
              <el-option v-for="child in children" :key="child.id" :label="child.name" :value="child.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="执行日期" required><el-date-picker v-model="form.startDate" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD" :clearable="false" /></el-form-item>
        </div>
        <div class="dialog-form-row">
          <el-form-item label="提醒时间" required><el-time-picker v-model="form.scheduleTime" format="HH:mm" value-format="HH:mm" :clearable="false" /></el-form-item>
          <el-form-item label="重复方式"><el-select v-model="form.repeatType"><el-option v-for="(label, value) in repeatLabels" :key="value" :label="label" :value="value" /></el-select></el-form-item>
        </div>
        <div class="task-options-row">
          <div class="task-checkbox-options">
            <el-form-item>
              <template #label>
                <span class="task-option-label">附件
                  <el-tooltip placement="top" :show-after="200">
                    <template #content>不勾选是领取型任务：儿童领取后，家长可直接关闭。<br>勾选后是附件任务：儿童领取后必须提交照片或录音，家长才能批改或关闭。</template>
                    <el-icon class="task-option-help"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-checkbox v-model="form.requiresPhotoUpload">必须</el-checkbox>
            </el-form-item>
            <el-form-item>
              <template #label>
                <span class="task-option-label">语音
                  <el-tooltip placement="top" :show-after="200">
                    <template #content>请让小朋友在设备上安装并登录星星芽 AI 助手 App，才能正常收到语音提醒。</template>
                    <el-icon class="task-option-help"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-checkbox v-model="form.voiceEnabled">开启</el-checkbox>
            </el-form-item>
            <el-form-item>
              <template #label>
                <span class="task-option-label">催领
                  <el-tooltip placement="top" :show-after="200">
                    <template #content>默认关闭。开启后，最后一次语音提醒播放结束 5 分钟仍未领取时，服务端每隔 5 分钟催领一次，最多 3 次（15 分钟）；领取后自动停止。</template>
                    <el-icon class="task-option-help"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-checkbox v-model="form.claimReminderEnabled" :disabled="!form.voiceEnabled">开启</el-checkbox>
            </el-form-item>
          </div>
          <el-form-item label="提醒次数">
            <el-input-number v-model="form.voiceReminderCount" :disabled="!form.voiceEnabled" :min="1" :max="3" :step="1" :precision="0" controls-position="right" />
          </el-form-item>
        </div>
        <el-form-item v-if="form.voiceEnabled" label="提醒语音内容">
          <el-input
            v-model="form.voiceContent"
            type="textarea"
            :rows="2"
            maxlength="120"
            show-word-limit
            placeholder="例如：小朋友，该写数学作业啦（留空则使用任务名称）"
          />
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitTask">{{ editingTaskId ? "保存修改" : "保存任务" }}</el-button></template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="任务详情" width="560px" class="form-dialog">
      <el-descriptions v-if="detailTask" :column="detailColumnCount" border class="task-detail-descriptions">
        <el-descriptions-item label="任务名称" :span="2">{{ detailTask.title }}</el-descriptions-item>
        <el-descriptions-item label="任务对象">{{ childName(detailTask.childId) }}</el-descriptions-item>
        <el-descriptions-item label="执行日期">{{ detailTask.occurrenceDate || "—" }}</el-descriptions-item>
        <el-descriptions-item label="提醒时间">{{ detailTask.scheduleTime }}</el-descriptions-item>
        <el-descriptions-item label="重复方式">{{ repeatLabels[detailTask.repeatType] }}</el-descriptions-item>
        <el-descriptions-item label="任务状态">{{ taskStatusLabel(detailTask) }}</el-descriptions-item>
        <el-descriptions-item label="提醒方式">{{ detailTask.voiceEnabled ? `语音提醒 ${detailTask.voiceReminderCount} 次` : "静默提醒" }}</el-descriptions-item>
        <el-descriptions-item label="附件">{{ detailTask.requiresPhotoUpload ? "照片或录音至少一项" : "无需提交" }}</el-descriptions-item>
        <el-descriptions-item label="领取状态">{{ detailTask.claimedAt ? "已领取" : "未领取" }}</el-descriptions-item>
        <el-descriptions-item label="提交状态">{{ detailTask.submissionStatus === "submitted" ? "已提交" : detailTask.submissionStatus === "draft" ? "提交中" : "未提交" }}</el-descriptions-item>
        <el-descriptions-item label="完成时间">{{ formatDateTime(detailTask.completedAt) }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">{{ formatDateTime(detailTask.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="提醒语音内容" :span="2">{{ detailTask.voiceEnabled ? detailTask.voiceContent : "未开启语音提醒" }}</el-descriptions-item>
      </el-descriptions>
      <section v-if="detailTask && (detailTask.submissionStatus === 'submitted' || submissionPhotos.length || submissionAudio || submissionReviewRounds.length)" v-loading="submissionPhotosLoading" class="task-submission-section">
        <section v-if="orderedSubmissionReviewRounds.length || submissionPhotos.length || submissionAudio" class="review-rounds">
          <h3>批改记录</h3>
          <article v-for="round in orderedSubmissionReviewRounds" :key="round.id" class="review-round">
            <h4>第 {{ round.sequence }} 次批改</h4>
            <div v-if="round.photos.length" class="review-round-row">
              <strong>批改前图片</strong>
              <div class="round-images round-originals"><button v-for="photo in round.photos" :key="photo.id" type="button" class="round-image-action" :title="canReviewSubmission(detailTask) ? '批改这张' : '查看原图'" @click="reviewRoundOriginal(photo, round.photos)"><small class="round-image-time">{{ formatDateTime(round.submittedAt) }}</small><img :src="photo.url" alt="批改前图片" /><span>{{ canReviewSubmission(detailTask) ? '批改这张' : '查看原图' }}</span></button></div>
            </div>
            <div v-if="round.audios.length" class="review-round-row">
              <strong>提交录音</strong>
              <div class="submission-audio-list">
                <div v-for="audio in round.audios" :key="audio.id" class="submission-audio-card">
                  <audio controls preload="metadata" :src="audio.url">当前浏览器不支持播放录音。</audio>
                </div>
              </div>
            </div>
            <div v-if="round.reviewImages.length" class="review-round-row">
              <strong>批改后图片</strong>
              <div class="round-images"><button v-for="image in round.reviewImages" :key="image.id" type="button" class="round-image-action" :title="canReReviewSubmission(detailTask) ? '重新批改这张' : '查看批改'" @click="reReviewImage(image)"><small class="round-image-time">{{ formatDateTime(image.createdAt) }}</small><img class="round-reviewed-image" :src="image.url" alt="批改后图片" /><span>{{ canReReviewSubmission(detailTask) ? '重新批改' : '查看批改' }}</span></button></div>
            </div>
            <div v-if="round.feedback" class="review-round-note"><strong>录音评价</strong><p>{{ round.feedback }}</p></div>
            <div class="review-round-note"><strong>提交备注</strong><p>{{ round.note || "未填写" }}</p></div>
          </article>
          <article v-if="(submissionPhotos.length || submissionAudio) && !submissionReviewImageUrl && !submissionAudioFeedback" class="review-round review-round--pending">
            <h4>第 {{ orderedSubmissionReviewRounds.length + 1 }} 次提交</h4>
            <div class="review-round-row">
              <strong>批改前图片</strong>
              <div class="round-images"><button v-for="photo in submissionPhotos" :key="photo.id" type="button" class="round-image-action" :title="canReviewSubmission(detailTask) ? '批改这张' : '查看原图'" @click="reviewRoundOriginal(photo, submissionPhotos)"><small class="round-image-time">{{ formatDateTime(submissionSubmittedAt) }}</small><img :src="photo.url" alt="本次提交图片" /><span>{{ canReviewSubmission(detailTask) ? '批改这张' : '查看原图' }}</span></button></div>
            </div>
            <div v-if="submissionAudio" class="review-round-row">
              <strong>提交录音</strong>
              <div class="submission-audio-card">
                <audio controls preload="metadata" :src="submissionAudio.url">当前浏览器不支持播放录音。</audio>
                <button v-if="canReviewSubmission(detailTask)" type="button" class="submission-audio-action" @click="openAudioReview">评价录音</button>
              </div>
            </div>
            <div v-if="submissionAudioFeedback" class="review-round-note"><strong>录音评价</strong><p>{{ submissionAudioFeedback }}</p></div>
            <div class="review-round-row review-round-pending-result"><strong>批改后图片</strong><span>{{ submissionAudioFeedback ? "已完成录音评价" : "家长未批改" }}</span></div>
            <div class="review-round-note"><strong>提交备注</strong><p>{{ submissionNote || "未填写" }}</p></div>
          </article>
        </section>
      </section>
      <template #footer><el-button v-if="detailTask && auth.user?.role !== 'child'" @click="openStatusRepair(detailTask)">修正状态</el-button><el-button v-if="detailTask?.submissionStatus === 'submitted' && !detailTask.finalizedAt && auth.user?.role !== 'child'" type="success" @click="finalizeCurrentReview">完成任务</el-button><el-button type="primary" @click="detailVisible = false">关闭</el-button></template>
    </el-dialog>

    <el-dialog v-model="statusRepairVisible" title="修正任务状态" width="420px" class="form-dialog">
      <p class="dialog-hint">状态修正会同步到家长网页、儿童小程序和日历。</p>
      <el-radio-group :key="statusRepairTask ? taskRowKey(statusRepairTask) : 'none'" v-model="statusRepairValue" class="status-repair-options">
        <el-radio value="unclaimed">待领取</el-radio>
        <el-radio value="claimed">已领取／待完成</el-radio>
        <el-radio value="completed">已完成</el-radio>
      </el-radio-group>
      <p v-if="statusRepairValue === 'unclaimed'" class="dialog-hint">已有作业提交的附件任务不能恢复为待领取，避免误删提交数据。</p>
      <p v-if="statusRepairTask?.requiresPhotoUpload && statusRepairValue === 'completed'" class="dialog-hint">附件任务已提交照片或录音后，可直接标记为已完成，无需先上传批改图。</p>
      <template #footer><el-button @click="statusRepairVisible = false">取消</el-button><el-button type="primary" :loading="statusRepairing" @click="saveStatusRepair">确认修正</el-button></template>
    </el-dialog>

    <el-dialog v-model="audioReviewVisible" title="评价录音" width="480px" class="form-dialog">
      <div class="audio-review-dialog">
        <audio v-if="submissionAudio" controls preload="metadata" :src="submissionAudio.url">当前浏览器不支持播放录音。</audio>
        <el-input v-model="audioReviewFeedback" type="textarea" :rows="5" maxlength="500" show-word-limit placeholder="写下对内容、表达或完成情况的评价" aria-label="录音评价" />
      </div>
      <template #footer><el-button @click="audioReviewVisible = false">取消</el-button><el-button type="primary" :loading="audioReviewSubmitting" @click="submitAudioFeedback">提交评价</el-button></template>
    </el-dialog>

    <el-dialog v-model="reviewResultVisible" title="批改后照片" width="min(860px, 92vw)" class="form-dialog">
      <img v-if="selectedReviewImageUrl || submissionReviewImageUrl" class="review-result-image" :src="selectedReviewImageUrl || submissionReviewImageUrl || ''" alt="批改后照片" />
      <template #footer><el-button @click="reviewResultVisible = false">关闭</el-button><el-button v-if="canReReviewSubmission(detailTask)" type="success" @click="restartReview">重新批改</el-button></template>
    </el-dialog>

    <el-dialog v-model="originalPreviewVisible" title="原图" width="min(860px, 92vw)" class="form-dialog">
      <img v-if="originalPreviewUrl" class="review-result-image" :src="originalPreviewUrl" alt="作业原图" />
      <template #footer><el-button type="primary" @click="originalPreviewVisible = false">关闭</el-button></template>
    </el-dialog>

    <el-dialog v-model="reviewVisible" title="图片批改" fullscreen class="review-dialog" @opened="loadReviewCanvas" @closed="stopReviewDrawing">
      <template #header="{ titleId, titleClass }">
        <div class="review-dialog-header">
          <div class="review-dialog-title">
            <span :id="titleId" :class="titleClass">图片批改</span>
            <el-tooltip content="画笔可直接书写；选择文字、表情或矩形框后，在图片上点击或拖动即可批注。" placement="bottom"><el-icon class="review-help" aria-label="批改说明"><QuestionFilled /></el-icon></el-tooltip>
          </div>
          <div class="review-toolbar">
            <div class="review-tool-group">
              <el-popover placement="bottom-start" :width="310" trigger="click" popper-class="review-tool-popper">
                <template #reference><el-button class="review-tool-button" :class="{ 'is-active': reviewTool === 'rectangle' }" aria-label="矩形框" title="矩形框" @click="selectReviewTool('rectangle')"><Square :size="18" :stroke-width="1.6" /></el-button></template>
                <div class="review-tool-options" aria-label="矩形框粗细和颜色"><div class="review-option-sizes"><button v-for="size in reviewLineSizes" :key="size.value" type="button" :class="{ 'is-active': reviewLineWidth === size.value }" :title="`粗细：${size.label}`" :aria-label="`粗细：${size.label}`" @click="setReviewLineWidth(size.value)"><i :style="{ width: `${size.value + 2}px`, height: `${size.value + 2}px` }"></i></button></div><span class="review-option-divider"></span><div class="review-option-colors"><button v-for="color in reviewColorPalette" :key="color" type="button" :class="{ 'is-active': reviewColor === color }" :style="{ backgroundColor: color }" :title="color" @click="setReviewColor(color)"></button></div></div>
              </el-popover>
              <el-popover placement="bottom-start" :width="260" trigger="click" popper-class="review-tool-popper">
                <template #reference><el-button class="review-tool-button" :class="{ 'is-active': reviewTool === 'emoji' }" aria-label="表情" title="表情" @click="selectReviewTool('emoji')"><Smile :size="19" :stroke-width="1.6" /></el-button></template>
                <div class="review-emoji-options" aria-label="常用表情"><button v-for="emoji in ['👍', '👏', '😊', '😠', '⭐', '🎉', '💯']" :key="emoji" type="button" :class="{ 'is-active': reviewEmoji === emoji }" :title="`使用表情 ${emoji}`" @click="reviewEmoji = emoji; selectReviewTool('emoji')">{{ emoji }}</button></div>
              </el-popover>
              <el-popover placement="bottom-start" :width="310" trigger="click" popper-class="review-tool-popper">
                <template #reference><el-button class="review-tool-button" :class="{ 'is-active': reviewTool === 'arrow' }" aria-label="箭头" title="箭头" @click="selectReviewTool('arrow')"><ArrowUpRight class="review-arrow-tool-icon" :size="26" :stroke-width="1.3" /></el-button></template>
                <div class="review-tool-options" aria-label="箭头粗细和颜色"><div class="review-option-sizes"><button v-for="size in reviewLineSizes" :key="size.value" type="button" :class="{ 'is-active': reviewLineWidth === size.value }" :title="`粗细：${size.label}`" :aria-label="`粗细：${size.label}`" @click="setReviewLineWidth(size.value)"><i :style="{ width: `${size.value + 2}px`, height: `${size.value + 2}px` }"></i></button></div><span class="review-option-divider"></span><div class="review-option-colors"><button v-for="color in reviewColorPalette" :key="color" type="button" :class="{ 'is-active': reviewColor === color }" :style="{ backgroundColor: color }" :title="color" @click="setReviewColor(color)"></button></div></div>
              </el-popover>
              <el-popover placement="bottom-start" :width="310" trigger="click" popper-class="review-tool-popper">
                <template #reference><el-button class="review-tool-button" :class="{ 'is-active': reviewTool === 'pen' }" aria-label="画笔" title="画笔" @click="selectReviewTool('pen')"><Pencil :size="19" :stroke-width="1.6" /></el-button></template>
                <div class="review-tool-options" aria-label="画笔粗细和颜色"><div class="review-option-sizes"><button v-for="size in reviewLineSizes" :key="size.value" type="button" :class="{ 'is-active': reviewLineWidth === size.value }" :title="`粗细：${size.label}`" :aria-label="`粗细：${size.label}`" @click="setReviewLineWidth(size.value)"><i :style="{ width: `${size.value + 2}px`, height: `${size.value + 2}px` }"></i></button></div><span class="review-option-divider"></span><div class="review-option-colors"><button v-for="color in reviewColorPalette" :key="color" type="button" :class="{ 'is-active': reviewColor === color }" :style="{ backgroundColor: color }" :title="color" @click="setReviewColor(color)"></button></div></div>
              </el-popover>
              <el-popover placement="bottom-start" :width="360" trigger="click" popper-class="review-tool-popper">
                <template #reference><el-button class="review-tool-button" :class="{ 'is-active': reviewTool === 'text' }" aria-label="插入文字" title="插入文字" @click="selectReviewTool('text')"><Type :size="19" :stroke-width="1.6" /></el-button></template>
                <div class="review-tool-options" aria-label="字体大小、颜色和底色"><div class="review-option-sizes review-option-font-sizes"><button v-for="size in reviewTextSizes" :key="size.value" type="button" :class="{ 'is-active': reviewFontSize === size.value }" @click="setReviewFontSize(size.value)">{{ size.label }}</button></div><span class="review-option-divider"></span><button type="button" class="review-text-background-toggle" :class="{ 'is-active': reviewTextWithBackground }" title="文字底色" aria-label="文字底色" @click="toggleReviewTextBackground"><span>T</span></button><div class="review-option-colors"><button v-for="color in reviewColorPalette" :key="color" type="button" :class="{ 'is-active': reviewColor === color }" :style="{ backgroundColor: color }" :title="color" @click="setReviewColor(color)"></button></div></div>
              </el-popover>
              <el-tooltip content="左转 90°" placement="bottom"><el-button class="review-tool-button" aria-label="左转 90°" @click="rotateReviewImage(-90)"><el-icon><RefreshLeft /></el-icon></el-button></el-tooltip>
              <el-tooltip content="右转 90°" placement="bottom"><el-button class="review-tool-button" aria-label="右转 90°" @click="rotateReviewImage(90)"><el-icon><RefreshRight /></el-icon></el-button></el-tooltip>
              <el-tooltip content="缩小图片" placement="bottom"><el-button class="review-tool-button" aria-label="缩小图片" :disabled="reviewZoom <= 25" @click="changeReviewZoom(-10)"><ZoomOut :size="19" :stroke-width="1.6" /></el-button></el-tooltip>
              <el-tooltip content="放大图片" placement="bottom"><el-button class="review-tool-button" aria-label="放大图片" :disabled="reviewZoom >= 250" @click="changeReviewZoom(10)"><ZoomIn :size="19" :stroke-width="1.6" /></el-button></el-tooltip>
              <el-tooltip content="全图" placement="bottom"><el-button class="review-tool-button" aria-label="全图" @click="showWholeReviewImage"><el-icon><FullScreen /></el-icon></el-button></el-tooltip>
              <el-tooltip content="撤销上一步" placement="bottom"><el-button class="review-tool-button" aria-label="撤销上一步" @click="undoReviewAction"><Undo2 :size="20" :stroke-width="1.5" /></el-button></el-tooltip>
              <el-tooltip content="清除所有批改" placement="bottom"><el-button class="review-tool-button" aria-label="清除所有批改" @click="clearAllReviewAnnotations"><el-icon><Delete /></el-icon></el-button></el-tooltip>
            </div>
          </div>
          <el-button class="review-submit-button" type="primary" :loading="reviewSubmitting" @click="submitReviewedImage">提交批改</el-button>
        </div>
      </template>
      <div ref="reviewCanvasShell" class="review-canvas-shell">
        <div ref="reviewStage" class="review-stage" :class="{ 'is-panning': reviewPanning }" :style="{ width: `${reviewCanvasDisplay.width}px`, height: `${reviewCanvasDisplay.height}px` }" @wheel.prevent="handleReviewZoomWheel" @mousedown.capture="startReviewPan" @mousedown="startReviewDrawing" @mousemove="continueReviewDrawing" @pointermove="continueReviewDrawing" @mouseup="stopReviewDrawing" @mouseleave="stopReviewDrawing" @contextmenu.prevent>
          <canvas ref="reviewCanvas" class="review-canvas" />
          <svg v-if="reviewCanvasSize.width" class="review-annotation-layer" :viewBox="`0 0 ${reviewCanvasSize.width} ${reviewCanvasSize.height}`" aria-label="可拖动的图片批改">
            <template v-for="annotation in reviewShapeAnnotations" :key="annotation.id">
              <path v-if="annotation.type === 'path'" class="review-shape-annotation review-shape-annotation--path" :class="{ 'is-selected': selectedReviewAnnotationId === annotation.id }" :d="annotation.arrow ? reviewArrowShaftData(annotation) : reviewPathData(annotation)" :stroke="annotation.color" :stroke-width="annotation.lineWidth" title="拖动调整位置；按 Delete 删除" @pointerdown.stop.prevent="startMoveAnnotation($event, annotation)" @mousedown.stop.prevent="startMoveAnnotation($event, annotation)" />
              <path v-if="annotation.type === 'path' && annotation.arrow" class="review-arrowhead" :d="reviewArrowHeadData(annotation)" :fill="annotation.color" title="拖动调整位置；按 Delete 删除" @pointerdown.stop.prevent="startMoveAnnotation($event, annotation)" @mousedown.stop.prevent="startMoveAnnotation($event, annotation)" />
              <rect v-if="annotation.type === 'rectangle'" class="review-shape-annotation review-shape-annotation--rectangle" :class="{ 'is-selected': selectedReviewAnnotationId === annotation.id }" :x="annotation.x" :y="annotation.y" :width="annotation.width" :height="annotation.height" :stroke="annotation.color" :stroke-width="annotation.lineWidth" title="拖动调整位置；按 Delete 删除" @pointerdown.stop.prevent="startMoveAnnotation($event, annotation)" @mousedown.stop.prevent="startMoveAnnotation($event, annotation)" />
              <circle v-for="(node, index) in selectedReviewAnnotationId === annotation.id ? reviewSelectionHandles(annotation) : []" :key="`${annotation.id}-node-${index}`" class="review-selection-node" :class="`review-selection-node--${node.handle}`" :cx="node.x" :cy="node.y" r="4" title="拖动调整形状" @pointerdown.stop.prevent="startResizeAnnotation($event, annotation, node.handle)" @mousedown.stop.prevent="startResizeAnnotation($event, annotation, node.handle)" />
            </template>
          </svg>
          <div v-if="reviewTextEditor" class="review-text-editor-frame" :style="reviewTextEditorFrameStyle()" @mousedown.stop @click.stop>
            <input ref="reviewTextInput" v-model="reviewTextEditor.value" class="review-text-editor" aria-label="图片批注文字" @input="syncReviewTextEditor" @compositionupdate="syncReviewTextEditor" @keydown.stop="handleReviewTextEditorKeydown" />
            <span v-for="corner in ['top-left', 'top-right', 'bottom-left', 'bottom-right']" :key="corner" class="review-text-editor-node" :class="`review-text-editor-node--${corner}`"></span>
          </div>
          <button v-for="annotation in reviewTextAnnotations" :key="annotation.id" type="button" class="review-text-annotation" :class="{ 'is-selected': selectedReviewAnnotationId === annotation.id, 'review-text-annotation--emoji': annotation.type === 'emoji', 'review-text-annotation--with-background': !!annotation.backgroundColor }" :style="annotationStyle(annotation)" title="拖动调整位置；按 Delete 删除" @pointerdown.stop.prevent="startMoveAnnotation($event, annotation)" @mousedown.stop.prevent="startMoveAnnotation($event, annotation)">{{ annotation.text }}</button>
        </div>
      </div>
      <div v-if="reviewPhotos.length > 1" class="review-photo-navigation">
        <el-button class="review-page-button" :disabled="!canReviewPreviousPhoto" @click="switchReviewPhoto(-1)"><el-icon><ArrowLeft /></el-icon>上一张</el-button>
        <span class="review-photo-position">{{ reviewPhotoIndex + 1 }} / {{ reviewPhotos.length }}</span>
        <el-button class="review-page-button" :disabled="!canReviewNextPhoto" @click="switchReviewPhoto(1)">下一张<el-icon><ArrowRight /></el-icon></el-button>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.audio-review-dialog {
  display: grid;
  gap: 16px;
}

.audio-review-dialog audio {
  display: block;
  max-width: 100%;
  width: 100%;
}

.submission-audio-card {
  display: grid;
  width: min(320px, 100%);
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: #353535;
}

.submission-audio-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.submission-audio-card audio {
  display: block;
  width: 100%;
  height: 54px;
}

.submission-audio-action {
  min-height: 30px;
  padding: 6px 10px;
  border: 0;
  background: var(--green);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  text-align: left;
}

.submission-audio-action:hover {
  filter: brightness(1.06);
}
</style>
