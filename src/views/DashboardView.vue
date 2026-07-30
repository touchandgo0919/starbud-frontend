<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ArrowRight, Check, Clock, House, List, Refresh } from "@element-plus/icons-vue";
import { getChildren, getFamilies, getTasks, getTodayTasks, getUsers } from "../services/api";
import { useAuthStore } from "../store/auth";
import TaskTrendChart from "../components/TaskTrendChart.vue";
import type { Child, Family, ManagedUser, Task } from "../types/task";

type TrendPeriod = "week" | "month";

interface TrendPoint {
  date: string;
  label: string;
  completed: number;
  unfinished: number;
  total: number;
}

const auth = useAuthStore();
const loading = ref(true);
const refreshing = ref(false);
const error = ref("");
const todayTasks = ref<Task[]>([]);
const trendTasks = ref<Task[]>([]);
const children = ref<Child[]>([]);
const families = ref<Family[]>([]);
const users = ref<ManagedUser[]>([]);
const selectedChildId = ref("");
const trendPeriod = ref<TrendPeriod>("week");

const todayDate = dateKey(new Date());
const completed = computed(() => todayTasks.value.filter(isCompleted).length);
const pending = computed(() => todayTasks.value.length - completed.value);
const completionRate = computed(() => todayTasks.value.length ? Math.round((completed.value / todayTasks.value.length) * 100) : 0);
const nextTask = computed(() => todayTasks.value.find((task) => !isCompleted(task)));
const trendRange = computed(() => getTrendRange(trendPeriod.value));
const periodLabel = computed(() => trendPeriod.value === "week" ? "本周" : "本月");
const trendPoints = computed<TrendPoint[]>(() => {
  const taskMap = new Map<string, Task[]>();
  trendTasks.value.forEach((task) => {
    const date = task.occurrenceDate;
    if (!date) return;
    const tasks = taskMap.get(date) || [];
    tasks.push(task);
    taskMap.set(date, tasks);
  });

  return dateKeysBetween(trendRange.value.from, trendRange.value.to).map((date) => {
    const tasks = taskMap.get(date) || [];
    const completedCount = tasks.filter(isCompleted).length;
    return {
      date,
      label: `${date.slice(5).replace("-", "/")}\n${weekdayLabel(date)}`,
      completed: completedCount,
      unfinished: tasks.length - completedCount,
      total: tasks.length
    };
  });
});
const trendTotal = computed(() => trendPoints.value.reduce((sum, item) => sum + item.total, 0));
const trendCompleted = computed(() => trendPoints.value.reduce((sum, item) => sum + item.completed, 0));
const trendUnfinished = computed(() => trendTotal.value - trendCompleted.value);
const trendCompletionRate = computed(() => trendTotal.value ? Math.round((trendCompleted.value / trendTotal.value) * 100) : 0);

function isCompleted(task: Task) {
  return task.status === "completed" || task.reviewStatus === "completed";
}

function childName(childId: string) {
  return children.value.find((child) => child.id === childId)?.name || "未关联成员";
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function weekdayLabel(value: string) {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][parseDateKey(value).getDay()];
}

function dateKeysBetween(from: string, to: string) {
  const keys: string[] = [];
  const end = parseDateKey(to).getTime();
  for (const cursor = parseDateKey(from); cursor.getTime() <= end; cursor.setDate(cursor.getDate() + 1)) {
    keys.push(dateKey(cursor));
  }
  return keys;
}

function getTrendRange(period: TrendPeriod) {
  const current = parseDateKey(todayDate);
  if (period === "month") {
    return {
      from: dateKey(new Date(current.getFullYear(), current.getMonth(), 1)),
      to: dateKey(new Date(current.getFullYear(), current.getMonth() + 1, 0))
    };
  }

  const sunday = new Date(current);
  sunday.setDate(current.getDate() - current.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return { from: dateKey(sunday), to: dateKey(saturday) };
}

async function load(options: { preserveLoading?: boolean } = {}) {
  if (options.preserveLoading) refreshing.value = true;
  else loading.value = true;
  error.value = "";
  try {
    const [loadedTodayTasks, loadedTrendTasks, loadedChildren, loadedFamilies] = await Promise.all([
      getTodayTasks(selectedChildId.value || undefined),
      getTasks({
        childId: selectedChildId.value || undefined,
        dateFrom: trendRange.value.from,
        dateTo: trendRange.value.to
      }),
      getChildren(),
      auth.user?.role === "child" ? Promise.resolve([]) : getFamilies()
    ]);
    todayTasks.value = loadedTodayTasks;
    trendTasks.value = loadedTrendTasks;
    children.value = loadedChildren;
    families.value = loadedFamilies;
    if (auth.user?.role === "admin") users.value = await getUsers();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "总览加载失败。";
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

function updateTrendPeriod(period: TrendPeriod) {
  if (trendPeriod.value === period) return;
  trendPeriod.value = period;
  load({ preserveLoading: true });
}

function selectChild(childId: string) {
  if (selectedChildId.value === childId) return;
  selectedChildId.value = childId;
  load({ preserveLoading: true });
}

onMounted(load);
</script>

<template>
  <div class="page-stack dashboard-page" v-loading="loading">
    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="metric-grid" aria-label="今日任务概览">
      <article class="metric-card metric-card--primary">
        <div class="metric-icon"><el-icon><List /></el-icon></div>
        <div><span>今日任务</span><strong>{{ todayTasks.length }}</strong><small>{{ selectedChildId ? childName(selectedChildId) : "全部家庭成员" }}</small></div>
      </article>
      <article class="metric-card">
        <div class="metric-icon metric-icon--amber"><el-icon><Clock /></el-icon></div>
        <div><span>待完成</span><strong>{{ pending }}</strong><small>{{ nextTask ? `下一项 ${nextTask.scheduleTime}` : "今日已清空" }}</small></div>
      </article>
      <article class="metric-card">
        <div class="metric-icon metric-icon--green"><el-icon><Check /></el-icon></div>
        <div><span>完成率</span><strong>{{ completionRate }}%</strong><small>已完成 {{ completed }} 项</small></div>
      </article>
      <article class="metric-card">
        <div class="metric-icon metric-icon--blue"><el-icon><House /></el-icon></div>
        <div>
          <span>{{ auth.user?.role === "admin" ? "系统用户" : "家庭成员" }}</span>
          <strong>{{ auth.user?.role === "admin" ? users.length : children.length }}</strong>
          <small>{{ auth.user?.role === "admin" ? `${users.filter((user) => user.active).length} 个账号启用` : `${families.length} 个家庭` }}</small>
        </div>
      </article>
    </section>

    <section class="content-panel trend-panel" aria-label="任务变化趋势" :aria-busy="refreshing">
      <div class="panel-heading trend-heading">
        <div><h2>任务变化趋势</h2><p>按执行日期查看完成与未完成任务的变化</p></div>
        <div class="trend-controls">
          <div class="trend-member-switch" aria-label="筛选任务成员">
            <button :class="{ 'is-active': !selectedChildId }" type="button" @click="selectChild('')">全部</button>
            <button v-for="child in children" :key="child.id" :class="{ 'is-active': selectedChildId === child.id }" type="button" @click="selectChild(child.id)">{{ child.name }}</button>
          </div>
          <div class="trend-period-switch" aria-label="统计周期">
            <button :class="{ 'is-active': trendPeriod === 'week' }" type="button" @click="updateTrendPeriod('week')">本周</button>
            <button :class="{ 'is-active': trendPeriod === 'month' }" type="button" @click="updateTrendPeriod('month')">本月</button>
          </div>
          <el-button plain :loading="refreshing" @click="load({ preserveLoading: true })"><el-icon><Refresh /></el-icon>刷新</el-button>
        </div>
      </div>

      <div class="trend-summary-grid">
        <div><span>{{ periodLabel }}任务</span><strong>{{ trendTotal }}</strong></div>
        <div><span>已完成</span><strong class="trend-number--green">{{ trendCompleted }}</strong></div>
        <div><span>未完成</span><strong class="trend-number--amber">{{ trendUnfinished }}</strong></div>
        <div><span>完成率</span><strong>{{ trendCompletionRate }}%</strong></div>
      </div>

      <div v-if="trendTotal" class="trend-chart-wrap">
        <TaskTrendChart :points="trendPoints" :period-label="periodLabel" :today-date="todayDate" />
      </div>
      <div v-else class="empty-state">{{ periodLabel }}暂无任务数据。</div>
    </section>

    <section class="content-panel">
      <div class="panel-heading">
        <div><h2>今日任务情况</h2><p>按提醒时间查看当前任务进度</p></div>
        <router-link to="/tasks" class="panel-link">查看全部 <el-icon><ArrowRight /></el-icon></router-link>
      </div>
      <div class="progress-summary">
        <div class="progress-copy"><strong>{{ completed }} / {{ todayTasks.length }}</strong><span>任务已完成</span></div>
        <el-progress :percentage="completionRate" :stroke-width="10" :show-text="false" />
      </div>
      <div v-if="todayTasks.length" class="overview-list">
        <div v-for="task in todayTasks.slice(0, 8)" :key="task.id" class="overview-row">
          <time>{{ task.scheduleTime }}</time>
          <div class="overview-copy"><strong>{{ task.title }}</strong><span>{{ childName(task.childId) }}</span></div>
          <span class="status-dot" :class="`status-dot--${isCompleted(task) ? 'completed' : 'pending'}`">{{ isCompleted(task) ? "已完成" : "待完成" }}</span>
        </div>
      </div>
      <div v-else class="empty-state">今天暂无任务，前往任务管理创建第一项任务。</div>
    </section>
  </div>
</template>
