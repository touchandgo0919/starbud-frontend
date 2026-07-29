<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "@element-plus/icons-vue";

const props = defineProps<{
  selectedDate: string;
  taskDates: Record<string, "revision" | "review" | "active" | "pending" | "completed">;
  loading?: boolean;
}>();
const emit = defineEmits<{
  select: [date: string];
  rangeChange: [range: { from: string; to: string }];
}>();

const mode = ref<"week" | "month">("week");
const anchorDate = ref(parseDateKey(props.selectedDate) || new Date());
const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

const title = computed(() => `${anchorDate.value.getFullYear()}年${anchorDate.value.getMonth() + 1}月`);
const calendarDays = computed(() => {
  const start = mode.value === "week"
    ? startOfWeek(anchorDate.value)
    : startOfWeek(new Date(anchorDate.value.getFullYear(), anchorDate.value.getMonth(), 1));
  const count = mode.value === "week" ? 7 : 42;
  return Array.from({ length: count }, (_, index) => addDays(start, index));
});

function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function startOfWeek(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  return result;
}

function addMonths(date: Date, amount: number) {
  const result = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  result.setDate(Math.min(date.getDate(), new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
  return result;
}

function emitRange() {
  const days = calendarDays.value;
  emit("rangeChange", { from: dateKey(days[0]), to: dateKey(days[days.length - 1]) });
}

function selectDate(date: Date) {
  emit("select", dateKey(date));
}

function changePeriod(amount: number) {
  anchorDate.value = mode.value === "week"
    ? addDays(anchorDate.value, amount * 7)
    : addMonths(anchorDate.value, amount);
  emit("select", dateKey(anchorDate.value));
  emitRange();
}

function toggleMode() {
  mode.value = mode.value === "week" ? "month" : "week";
  emitRange();
}

function goToday() {
  anchorDate.value = new Date();
  emit("select", dateKey(anchorDate.value));
  emitRange();
}

function isToday(date: Date) {
  return dateKey(date) === dateKey(new Date());
}

function taskStatus(date: Date) {
  return props.taskDates[dateKey(date)] || null;
}

function dayLabel(date: Date) {
  const status = taskStatus(date);
  const labels = { revision: "有待修改任务", review: "有待批改任务", active: "有进行中任务", pending: "有待处理任务", completed: "任务已完成" };
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日${status ? `，${labels[status]}` : ""}`;
}

watch(
  () => props.selectedDate,
  (value) => {
    if (calendarDays.value.some((date) => dateKey(date) === value)) return;
    const next = parseDateKey(value);
    if (!next) return;
    anchorDate.value = next;
    emitRange();
  }
);

onMounted(emitRange);
</script>

<template>
  <section class="content-panel task-calendar-panel" :aria-busy="loading">
    <header class="task-calendar-header">
      <div class="calendar-period-nav">
        <button type="button" class="calendar-icon-button" aria-label="上一周期" @click="changePeriod(-1)">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <h2 aria-live="polite">{{ title }}</h2>
        <button type="button" class="calendar-icon-button" aria-label="下一周期" @click="changePeriod(1)">
          <el-icon><ArrowRight /></el-icon>
        </button>
      </div>
      <div class="calendar-view-actions">
        <button type="button" class="calendar-quick-button" data-testid="calendar-mode-button" @click="toggleMode">
          {{ mode === "week" ? "本月" : "本周" }}
        </button>
        <button type="button" class="calendar-quick-button" @click="goToday">今天</button>
        <button
          type="button"
          class="calendar-icon-button"
          data-testid="calendar-expand-button"
          :aria-label="mode === 'week' ? '展开月视图' : '收起为周视图'"
          :aria-expanded="mode === 'month'"
          @click="toggleMode"
        >
          <el-icon><ArrowUp v-if="mode === 'month'" /><ArrowDown v-else /></el-icon>
        </button>
      </div>
    </header>

    <div class="task-calendar-weekdays" aria-hidden="true">
      <span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span>
    </div>
    <div class="task-calendar-grid" :class="`task-calendar-grid--${mode}`">
      <button
        v-for="date in calendarDays"
        :key="dateKey(date)"
        type="button"
        class="task-calendar-day"
        :class="{
          'is-selected': dateKey(date) === selectedDate,
          'is-today': isToday(date),
          'is-outside': mode === 'month' && date.getMonth() !== anchorDate.getMonth(),
          'has-task': Boolean(taskStatus(date))
        }"
        :data-date="dateKey(date)"
        :aria-label="dayLabel(date)"
        :aria-pressed="dateKey(date) === selectedDate"
        @click="selectDate(date)"
      >
        <span>{{ date.getDate() }}</span>
        <i v-if="taskStatus(date)" :class="`task-calendar-dot--${taskStatus(date)}`" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>
