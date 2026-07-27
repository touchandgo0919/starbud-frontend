<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Refresh, Search } from "@element-plus/icons-vue";
import { completeTask, createTask, deleteTask, getChildren, getTaskSubmission, getTasks, remindTask, submitSubmissionReview, updateTask } from "../services/api";
import { useAuthStore } from "../store/auth";
import type { Child, CreateTaskPayload, RepeatType, SubmissionPhoto, Task } from "../types/task";
import TaskCalendar from "../components/TaskCalendar.vue";

type CreateTaskForm = Omit<CreateTaskPayload, "childId"> & { childIds: string[] };

const auth = useAuthStore();
const tasks = ref<Task[]>([]);
const calendarTasks = ref<Task[]>([]);
const children = ref<Child[]>([]);
const loading = ref(false);
const calendarLoading = ref(false);
const dialogVisible = ref(false);
const detailVisible = ref(false);
const detailTask = ref<Task | null>(null);
const detailColumnCount = ref(window.innerWidth <= 620 ? 1 : 2);
const submissionPhotos = ref<SubmissionPhoto[]>([]);
const submissionNote = ref("");
const submissionReviewImageUrl = ref<string | null>(null);
const taskPhotoPreviews = ref<Record<string, SubmissionPhoto[]>>({});
const taskReviewStates = ref<Record<string, { hasPhotos: boolean; reviewed: boolean }>>({});
const submissionPhotosLoading = ref(false);
const reviewResultVisible = ref(false);
const reviewVisible = ref(false);
const reviewPhoto = ref<SubmissionPhoto | null>(null);
const reviewCanvas = ref<HTMLCanvasElement | null>(null);
const reviewCanvasShell = ref<HTMLElement | null>(null);
const reviewColor = ref("#e5484d");
const reviewLineWidth = ref(6);
const reviewZoom = ref(100);
const reviewTool = ref<"pen" | "text" | "rectangle" | "emoji">("pen");
const reviewFontSize = ref(28);
const reviewEmoji = ref("👍");
const reviewTextAnnotations = ref<Array<{ id: string; text: string; x: number; y: number; color: string; fontSize: number }>>([]);
const reviewCanvasDisplay = ref({ width: 0, height: 0 });
let movingAnnotation: { id: string; offsetX: number; offsetY: number } | null = null;
const reviewSubmitting = ref(false);
const selectedSubmissionId = ref<string | null>(null);
const editingTaskId = ref("");
const saving = ref(false);
const filters = reactive({ keyword: "", childId: "", status: "", repeatType: "" });
const selectedDate = ref(dateKey(new Date()));
const calendarRange = reactive(initialWeekRange());
const form = reactive<CreateTaskForm>({ childIds: [], title: "", scheduleTime: currentTime(), repeatType: "daily", voiceEnabled: true, voiceContent: "", voiceReminderCount: 1 });
const repeatLabels: Record<RepeatType, string> = { once: "仅一次", daily: "每天", weekdays: "工作日", weekly: "每周" };
const calendarTaskDates = computed(() => calendarTasks.value.reduce<Record<string, number>>((dates, task) => {
  if (task.occurrenceDate) dates[task.occurrenceDate] = (dates[task.occurrenceDate] || 0) + 1;
  return dates;
}, {}));
const selectedDateLabel = computed(() => {
  const [year, month, day] = selectedDate.value.split("-").map(Number);
  return `${year}年${month}月${day}日`;
});
const dialogTitle = computed(() => editingTaskId.value ? "编辑任务" : "新建任务");

function dateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function initialWeekRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
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

function hasSubmission(task: Task) {
  return Boolean(task.submissionId || task.submissionStatus);
}

async function loadTasks() {
  loading.value = true;
  try {
    tasks.value = await getTasks({ ...filters, date: selectedDate.value });
    const previews = await Promise.all(tasks.value.map(async (task) => {
      if (!hasSubmission(task)) return [taskRowKey(task), [] as SubmissionPhoto[], false] as const;
      try {
        const submission = await getTaskSubmission(task.id, task.occurrenceDate || selectedDate.value);
        return [taskRowKey(task), submission.photos, Boolean(submission.reviewedAt)] as const;
      } catch { return [taskRowKey(task), [] as SubmissionPhoto[], false] as const; }
    }));
    taskPhotoPreviews.value = Object.fromEntries(previews.map(([key, photos]) => [key, photos]));
    taskReviewStates.value = Object.fromEntries(previews.map(([key, photos, reviewed]) => [key, { hasPhotos: photos.length > 0, reviewed }]));
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
      keyword: filters.keyword,
      repeatType: filters.repeatType,
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

function applyFilters() {
  void refreshTaskData();
}

function resetFilters() {
  Object.assign(filters, { keyword: "", childId: "", status: "", repeatType: "" });
  selectedDate.value = dateKey(new Date());
  void refreshTaskData();
}

function openCreate() {
  editingTaskId.value = "";
  Object.assign(form, {
    childIds: children.value.map((child) => child.id),
    title: "",
    scheduleTime: currentTime(),
    repeatType: "daily",
    voiceEnabled: true,
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
    scheduleTime: task.scheduleTime,
    repeatType: task.repeatType,
    voiceEnabled: task.voiceEnabled,
    voiceContent: task.voiceContent === task.title ? "" : task.voiceContent,
    voiceReminderCount: task.voiceReminderCount
  });
  dialogVisible.value = true;
}

let reviewSourceImage: HTMLImageElement | null = null;
let isReviewDrawing = false;
let previousReviewPoint: { x: number; y: number } | null = null;
let rectangleStart: { x: number; y: number } | null = null;
let rectangleBase: ImageData | null = null;
const reviewHistory: ImageData[] = [];

async function openDetail(task: Task) {
  detailTask.value = task;
  submissionPhotos.value = [];
  submissionNote.value = "";
  submissionReviewImageUrl.value = null;
  detailVisible.value = true;

  if (!hasSubmission(task)) return;

  submissionPhotosLoading.value = true;
  try {
    const submission = await getTaskSubmission(task.id, task.occurrenceDate || selectedDate.value);
    submissionPhotos.value = submission.photos;
    submissionNote.value = submission.note.trim();
    submissionReviewImageUrl.value = submission.reviewImageUrl;
    selectedSubmissionId.value = submission.id;
  } catch (cause) {
    if (!(cause instanceof Error) || !cause.message.includes("404")) ElMessage.error(cause instanceof Error ? cause.message : "提交照片加载失败。");
  } finally {
    submissionPhotosLoading.value = false;
  }
}

async function openTaskReview(task: Task) {
  await openDetail(task);
  const original = submissionPhotos.value[0];
  if (!original) return;
  await openReview(submissionReviewImageUrl.value ? { ...original, url: submissionReviewImageUrl.value } : original);
}

async function openReviewEntry(task: Task) {
  await openDetail(task);
  if (submissionReviewImageUrl.value) {
    reviewResultVisible.value = true;
    return;
  }
  await openTaskReview(task);
}

async function restartReview() {
  const task = detailTask.value;
  reviewResultVisible.value = false;
  if (task) await openTaskReview(task);
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("zh-CN", { hour12: false });
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

async function openReview(photo: SubmissionPhoto) {
  reviewPhoto.value = photo;
  reviewZoom.value = 100;
  reviewTool.value = "pen";
  reviewHistory.length = 0;
  reviewTextAnnotations.value = [];
  reviewVisible.value = true;
  await nextTick();
}

function loadReviewCanvas() {
  const canvas = reviewCanvas.value;
  const photo = reviewPhoto.value;
  if (!canvas || !photo) return;

  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => {
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    fitReviewCanvas();
    context.drawImage(image, 0, 0);
    reviewSourceImage = image;
  };
  image.onerror = () => ElMessage.error("批改图片加载失败。");
  image.src = photo.url;
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

function reviewPoint(event: MouseEvent) {
  const canvas = reviewCanvas.value;
  if (!canvas) return null;
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
    y: (event.clientY - bounds.top) * (canvas.height / bounds.height)
  };
}

function drawReviewLine(from: { x: number; y: number }, to: { x: number; y: number }) {
  const context = reviewCanvas.value?.getContext("2d");
  if (!context) return;
  context.strokeStyle = reviewColor.value;
  context.lineWidth = reviewLineWidth.value;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
}

function startReviewDrawing(event: MouseEvent) {
  if (event.button !== 0) return;
  const point = reviewPoint(event);
  if (!point) return;
  if (reviewTool.value === "text") {
    void insertReviewText(point);
    return;
  }
  if (reviewTool.value === "emoji") {
    insertReviewEmoji(point);
    return;
  }
  if (reviewTool.value === "rectangle") {
    const canvas = reviewCanvas.value;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    rectangleStart = point;
    rectangleBase = context.getImageData(0, 0, canvas.width, canvas.height);
    reviewHistory.push(rectangleBase);
    return;
  }
  saveReviewHistory();
  isReviewDrawing = true;
  previousReviewPoint = point;
  drawReviewLine(point, { x: point.x + 0.01, y: point.y + 0.01 });
}

async function insertReviewText(point: { x: number; y: number }) {
  try {
    const { value } = await ElMessageBox.prompt("请输入要添加到图片上的批注文字。", "插入文字", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：这里需要修改",
      inputValidator: (value) => value.trim().length > 0 || "请输入文字"
    });
    reviewTextAnnotations.value.push({ id: `${Date.now()}-${Math.random()}`, text: value.trim(), x: point.x, y: point.y, color: reviewColor.value, fontSize: reviewFontSize.value });
  } catch {
    // 取消文字输入时不修改图片。
  } finally {
    reviewTool.value = "pen";
  }
}

function startMoveAnnotation(event: MouseEvent, annotation: { id: string; x: number; y: number }) {
  const canvas = reviewCanvas.value;
  if (!canvas) return;
  const bounds = canvas.getBoundingClientRect();
  movingAnnotation = { id: annotation.id, offsetX: event.clientX - bounds.left - annotation.x * (bounds.width / canvas.width), offsetY: event.clientY - bounds.top - annotation.y * (bounds.height / canvas.height) };
  window.addEventListener("mousemove", moveAnnotation);
  window.addEventListener("mouseup", stopMoveAnnotation, { once: true });
}

function moveAnnotation(event: MouseEvent) {
  if (!movingAnnotation || !reviewCanvas.value) return;
  const canvas = reviewCanvas.value;
  const bounds = canvas.getBoundingClientRect();
  const annotation = reviewTextAnnotations.value.find((item) => item.id === movingAnnotation?.id);
  if (!annotation) return;
  annotation.x = Math.max(0, Math.min(canvas.width, (event.clientX - bounds.left - movingAnnotation.offsetX) * (canvas.width / bounds.width)));
  annotation.y = Math.max(0, Math.min(canvas.height, (event.clientY - bounds.top - movingAnnotation.offsetY) * (canvas.height / bounds.height)));
}

function stopMoveAnnotation() {
  movingAnnotation = null;
  window.removeEventListener("mousemove", moveAnnotation);
}

function annotationStyle(annotation: { x: number; y: number; color: string; fontSize: number }) {
  const canvas = reviewCanvas.value;
  const display = reviewCanvasDisplay.value;
  if (!canvas || !canvas.width || !canvas.height || !display.width) return {};
  const scale = display.width / canvas.width;
  return {
    left: `${annotation.x * scale}px`,
    top: `${annotation.y * scale}px`,
    color: annotation.color,
    fontSize: `${annotation.fontSize * scale}px`
  };
}

function insertReviewEmoji(point: { x: number; y: number }) {
  const context = reviewCanvas.value?.getContext("2d");
  if (!context) return;
  saveReviewHistory();
  context.font = `48px sans-serif`;
  context.textBaseline = "top";
  context.fillText(reviewEmoji.value, point.x, point.y);
  reviewTool.value = "pen";
}

function continueReviewDrawing(event: MouseEvent) {
  if (reviewTool.value === "rectangle" && rectangleStart && rectangleBase) {
    const point = reviewPoint(event);
    const context = reviewCanvas.value?.getContext("2d");
    if (!point || !context) return;
    context.putImageData(rectangleBase, 0, 0);
    context.strokeStyle = reviewColor.value;
    context.lineWidth = reviewLineWidth.value;
    context.strokeRect(rectangleStart.x, rectangleStart.y, point.x - rectangleStart.x, point.y - rectangleStart.y);
    return;
  }
  if (!isReviewDrawing || !previousReviewPoint) return;
  const point = reviewPoint(event);
  if (!point) return;
  drawReviewLine(previousReviewPoint, point);
  previousReviewPoint = point;
}

function stopReviewDrawing() {
  isReviewDrawing = false;
  previousReviewPoint = null;
  rectangleStart = null;
  rectangleBase = null;
}

function clearReviewDrawing() {
  const canvas = reviewCanvas.value;
  const context = canvas?.getContext("2d");
  if (!canvas || !context || !reviewSourceImage) return;
  saveReviewHistory();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(reviewSourceImage, 0, 0);
  reviewTextAnnotations.value = [];
}

function saveReviewHistory() {
  const canvas = reviewCanvas.value;
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;
  reviewHistory.push(context.getImageData(0, 0, canvas.width, canvas.height));
  if (reviewHistory.length > 30) reviewHistory.shift();
}

function undoReviewAction() {
  const snapshot = reviewHistory.pop();
  const context = reviewCanvas.value?.getContext("2d");
  if (!snapshot || !context) {
    ElMessage.info("没有可撤销的批注。");
    return;
  }
  context.putImageData(snapshot, 0, 0);
}

function createReviewedExportCanvas(canvas: HTMLCanvasElement) {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const context = exportCanvas.getContext("2d");
  if (!context) return null;
  context.drawImage(canvas, 0, 0);
  context.textBaseline = "top";
  for (const annotation of reviewTextAnnotations.value) {
    context.fillStyle = annotation.color;
    context.font = `700 ${annotation.fontSize}px sans-serif`;
    context.fillText(annotation.text, annotation.x, annotation.y);
  }
  return exportCanvas;
}

function submitReviewedImage() {
  const canvas = reviewCanvas.value;
  if (!canvas || !selectedSubmissionId.value) {
    ElMessage.error("未找到对应的作业提交。");
    return;
  }
  const exportCanvas = createReviewedExportCanvas(canvas);
  if (!exportCanvas) {
    ElMessage.error("生成批改图片失败。");
    return;
  }
  reviewSubmitting.value = true;
  exportCanvas.toBlob(async (image) => {
    if (!image) {
      reviewSubmitting.value = false;
      ElMessage.error("生成批改图片失败。");
      return;
    }
    try {
      await submitSubmissionReview(selectedSubmissionId.value!, image);
      reviewVisible.value = false;
      ElMessage.success("批改已提交，已通知小朋友。");
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : "提交批改失败。");
    } finally {
      reviewSubmitting.value = false;
    }
  }, "image/png");
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
  try {
    children.value = await getChildren();
    await refreshTaskData();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "任务数据加载失败。");
  }
});

onBeforeUnmount(() => {
  stopMoveAnnotation();
  window.removeEventListener("resize", updateDetailColumns);
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

    <section class="content-panel filter-panel">
      <form class="filter-grid" @submit.prevent="applyFilters">
        <label class="field"><span>关键词</span><el-input v-model="filters.keyword" clearable placeholder="搜索任务名称" /></label>
        <label class="field"><span>任务对象</span><el-select v-model="filters.childId" clearable placeholder="全部成员"><el-option v-for="child in children" :key="child.id" :label="child.name" :value="child.id" /></el-select></label>
        <label class="field"><span>任务状态</span><el-select v-model="filters.status" clearable placeholder="全部状态"><el-option label="待完成" value="pending" /><el-option label="已完成" value="completed" /></el-select></label>
        <label class="field"><span>重复方式</span><el-select v-model="filters.repeatType" clearable placeholder="全部方式"><el-option v-for="(label, value) in repeatLabels" :key="value" :label="label" :value="value" /></el-select></label>
        <div class="filter-actions">
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
          <el-button type="primary" :icon="Search" native-type="submit">查询</el-button>
        </div>
      </form>
    </section>

    <section class="content-panel table-panel">
      <div class="panel-heading">
        <div><h2>我的任务</h2><p>{{ selectedDateLabel }} · 共 {{ tasks.length }} 项任务</p></div>
        <div v-if="auth.user?.role !== 'child'" class="panel-heading-actions">
          <el-button type="primary" :icon="Plus" @click="openCreate">新建任务</el-button>
          <el-button :icon="Refresh" :loading="loading" @click="refreshTaskData">刷新</el-button>
        </div>
      </div>
      <el-table v-loading="loading" :data="tasks" :row-key="taskRowKey" class="data-table desktop-table" empty-text="没有符合条件的任务">
        <el-table-column prop="occurrenceDate" label="执行日期" width="120" />
        <el-table-column label="时间" width="96"><template #default="scope"><strong class="time-cell">{{ scope.row.scheduleTime }}</strong></template></el-table-column>
        <el-table-column prop="title" label="任务名称" min-width="160" />
        <el-table-column label="任务对象" min-width="100"><template #default="scope">{{ childName(scope.row.childId) }}</template></el-table-column>
        <el-table-column label="重复" width="90"><template #default="scope">{{ repeatLabels[scope.row.repeatType as RepeatType] }}</template></el-table-column>
        <el-table-column label="提醒" width="90"><template #default="scope">{{ scope.row.voiceEnabled ? `语音 ${scope.row.voiceReminderCount} 次` : "静默" }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="scope"><span class="status-dot" :class="`status-dot--${scope.row.status}`">{{ scope.row.status === "completed" ? "已完成" : "待完成" }}</span></template></el-table-column>
        <el-table-column label="作业照片" width="116"><template #default="scope"><button v-if="taskPhotoPreviews[taskRowKey(scope.row)]?.length" type="button" class="task-photo-preview" :title="`已上传 ${taskPhotoPreviews[taskRowKey(scope.row)].length} 张照片`" @click="openDetail(scope.row)"><img :src="taskPhotoPreviews[taskRowKey(scope.row)][0].url" alt="作业缩略图" /><span>{{ taskPhotoPreviews[taskRowKey(scope.row)].length }}</span></button><span v-else class="task-photo-empty">—</span></template></el-table-column>
        <el-table-column v-if="auth.user?.role !== 'child'" label="批改" width="104"><template #default="scope"><el-button v-if="taskReviewStates[taskRowKey(scope.row)]?.hasPhotos && !taskReviewStates[taskRowKey(scope.row)]?.reviewed" type="success" size="small" @click="openTaskReview(scope.row)">去批改</el-button><span v-else-if="taskReviewStates[taskRowKey(scope.row)]?.reviewed" class="reviewed-label">已批改</span><span v-else class="task-photo-empty">待提交</span></template></el-table-column>
        <el-table-column label="操作" width="160" fixed="right"><template #default="scope"><div v-if="auth.user?.role === 'child'" class="task-table-actions"><div class="task-table-actions__row"><el-button link type="primary" :disabled="!canComplete(scope.row)" @click="markComplete(scope.row)">完成</el-button></div></div><div v-else class="task-table-actions"><div class="task-table-actions__row"><el-button link type="primary" @click="openEdit(scope.row)">编辑</el-button><el-button link type="danger" @click="removeTask(scope.row)">删除</el-button></div><div class="task-table-actions__row"><el-button link type="primary" @click="sendReminder(scope.row)">提醒</el-button><el-button link @click="openDetail(scope.row)">详情</el-button></div></div></template></el-table-column>
      </el-table>
      <div v-loading="loading" class="mobile-data-list">
        <article v-for="task in tasks" :key="taskRowKey(task)" class="mobile-data-card">
          <div class="mobile-card-head">
            <div><time class="time-cell">{{ task.occurrenceDate }} {{ task.scheduleTime }}</time><h3>{{ task.title }}</h3></div>
            <span class="status-dot" :class="`status-dot--${task.status}`">{{ task.status === "completed" ? "已完成" : "待完成" }}</span>
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
        <el-form-item label="任务对象" required>
          <el-select v-model="form.childIds" multiple clearable :disabled="Boolean(editingTaskId)" placeholder="请选择一个或多个小朋友" style="width: 100%">
            <el-option v-for="child in children" :key="child.id" :label="child.name" :value="child.id" />
          </el-select>
        </el-form-item>
        <div class="dialog-form-row">
          <el-form-item label="提醒时间" required><el-time-picker v-model="form.scheduleTime" format="HH:mm" value-format="HH:mm" :clearable="false" /></el-form-item>
          <el-form-item label="重复方式"><el-select v-model="form.repeatType"><el-option v-for="(label, value) in repeatLabels" :key="value" :label="label" :value="value" /></el-select></el-form-item>
        </div>
        <div class="dialog-form-row voice-reminder-row">
          <el-form-item label="语音提醒"><el-checkbox v-model="form.voiceEnabled">开启语音提醒</el-checkbox></el-form-item>
          <el-form-item v-if="form.voiceEnabled" label="提醒次数">
            <el-input-number v-model="form.voiceReminderCount" :min="1" :max="3" :step="1" :precision="0" controls-position="right" />
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
        <el-descriptions-item label="任务状态">{{ detailTask.status === "completed" ? "已完成" : "待完成" }}</el-descriptions-item>
        <el-descriptions-item label="提醒方式">{{ detailTask.voiceEnabled ? `语音提醒 ${detailTask.voiceReminderCount} 次` : "静默提醒" }}</el-descriptions-item>
        <el-descriptions-item label="领取状态">{{ detailTask.claimedAt ? "已领取" : "未领取" }}</el-descriptions-item>
        <el-descriptions-item label="提交状态">{{ detailTask.submissionStatus === "submitted" ? `已提交（${detailTask.submissionPhotoCount} 张照片）` : detailTask.submissionStatus === "draft" ? "提交中" : "未提交" }}</el-descriptions-item>
        <el-descriptions-item label="完成时间">{{ formatDateTime(detailTask.completedAt) }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">{{ formatDateTime(detailTask.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="提醒语音内容" :span="2">{{ detailTask.voiceEnabled ? detailTask.voiceContent : "未开启语音提醒" }}</el-descriptions-item>
      </el-descriptions>
      <section v-if="detailTask" v-loading="submissionPhotosLoading" class="task-submission-section">
        <div class="task-submission-heading"><div><h3>作业照片</h3><p>{{ submissionPhotos.length ? `已提交 ${submissionPhotos.length} 张照片，可在批改页面查看原图。` : detailTask.submissionStatus === "submitted" ? "本次提交暂未包含可查看的照片。" : "暂未提交作业。" }}</p></div></div>
        <div v-if="submissionNote" class="submission-note"><strong>提交备注</strong><p>{{ submissionNote }}</p></div>
        <button v-if="submissionPhotos.length" type="button" class="submission-photo-card review-entry" :title="submissionReviewImageUrl ? '查看最后批改版本' : '批改这张'" @click="openReviewEntry(detailTask)">
          <img :src="submissionReviewImageUrl || submissionPhotos[0].url" :alt="submissionReviewImageUrl ? '最后批改版本' : '批改前原图'" />
          <span><strong>{{ submissionReviewImageUrl ? "查看批改" : "批改这张" }}</strong><small>{{ submissionReviewImageUrl ? "最后批改版本" : "批改前原图" }}</small></span>
        </button>
      </section>
      <template #footer><el-button type="primary" @click="detailVisible = false">关闭</el-button></template>
    </el-dialog>

    <el-dialog v-model="reviewResultVisible" title="批改后照片" width="min(860px, 92vw)" class="form-dialog">
      <img v-if="submissionReviewImageUrl" class="review-result-image" :src="submissionReviewImageUrl" alt="最后批改版本" />
      <template #footer><el-button @click="reviewResultVisible = false">关闭</el-button><el-button type="success" @click="restartReview">重新批改</el-button></template>
    </el-dialog>

    <el-dialog v-model="reviewVisible" title="图片批改" fullscreen class="review-dialog" @opened="loadReviewCanvas" @closed="stopReviewDrawing">
      <div class="review-toolbar">
        <label>笔色 <input v-model="reviewColor" type="color" aria-label="批改笔色" /></label>
        <label>粗细 <input v-model.number="reviewLineWidth" type="range" min="2" max="24" step="1" aria-label="批改笔粗细" /><span>{{ reviewLineWidth }} px</span></label>
        <label>字号 <input v-model.number="reviewFontSize" type="range" min="16" max="56" step="2" aria-label="文字字号" /><span>{{ reviewFontSize }} px</span></label>
        <el-button :type="reviewTool === 'text' ? 'success' : 'default'" @click="reviewTool = 'text'">插入文字</el-button>
        <el-dropdown trigger="click" @command="(emoji: string) => { reviewEmoji = emoji; reviewTool = 'emoji'; }"><el-button :type="reviewTool === 'emoji' ? 'success' : 'default'">😊 表情</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item v-for="emoji in ['👍', '😊', '😠', '⭐', '🎉']" :key="emoji" :command="emoji">{{ emoji }}</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
        <el-button :type="reviewTool === 'rectangle' ? 'success' : 'default'" @click="reviewTool = 'rectangle'">矩形框</el-button>
        <label>缩放 <input v-model.number="reviewZoom" type="range" min="50" max="200" step="10" aria-label="图片缩放" @input="fitReviewCanvas" /><span>{{ reviewZoom }}%</span></label>
        <el-button @click="showWholeReviewImage">全图</el-button><el-button @click="undoReviewAction">撤销上一步</el-button><el-button @click="clearReviewDrawing">清空笔迹</el-button>
      </div>
      <div ref="reviewCanvasShell" class="review-canvas-shell">
        <div class="review-stage" :style="{ width: `${reviewCanvasDisplay.width}px`, height: `${reviewCanvasDisplay.height}px` }">
          <canvas ref="reviewCanvas" class="review-canvas" @mousedown="startReviewDrawing" @mousemove="continueReviewDrawing" @mouseup="stopReviewDrawing" @mouseleave="stopReviewDrawing" />
          <button v-for="annotation in reviewTextAnnotations" :key="annotation.id" type="button" class="review-text-annotation" :style="annotationStyle(annotation)" title="拖动调整文字位置" @mousedown.stop.prevent="startMoveAnnotation($event, annotation)">{{ annotation.text }}</button>
        </div>
      </div>
      <p class="review-hint">画笔模式可直接书写；文字批注输入后可直接拖动调整位置；表情和矩形框工具选择后，点击或拖动图片即可完成批注。</p>
      <template #footer><el-button :disabled="reviewSubmitting" @click="reviewVisible = false">取消</el-button><el-button type="primary" :loading="reviewSubmitting" @click="submitReviewedImage">提交批改</el-button></template>
    </el-dialog>
  </div>
</template>
