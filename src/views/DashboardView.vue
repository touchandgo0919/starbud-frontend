<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ArrowRight, Check, Clock, House, List } from "@element-plus/icons-vue";
import { getChildren, getFamilies, getTasks, getUsers } from "../services/api";
import { useAuthStore } from "../store/auth";
import type { Child, Family, ManagedUser, Task } from "../types/task";

const auth = useAuthStore();
const loading = ref(true);
const error = ref("");
const tasks = ref<Task[]>([]);
const children = ref<Child[]>([]);
const families = ref<Family[]>([]);
const users = ref<ManagedUser[]>([]);

const completed = computed(() => tasks.value.filter((task) => task.status === "completed").length);
const pending = computed(() => tasks.value.filter((task) => task.status === "pending").length);
const completionRate = computed(() => tasks.value.length ? Math.round((completed.value / tasks.value.length) * 100) : 0);
const nextTask = computed(() => tasks.value.find((task) => task.status === "pending"));

function childName(childId: string) {
  return children.value.find((child) => child.id === childId)?.name || "未关联成员";
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [loadedTasks, loadedChildren, loadedFamilies] = await Promise.all([
      getTasks(),
      getChildren(),
      auth.user?.role === "child" ? Promise.resolve([]) : getFamilies()
    ]);
    tasks.value = loadedTasks;
    children.value = loadedChildren;
    families.value = loadedFamilies;
    if (auth.user?.role === "admin") users.value = await getUsers();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "总览加载失败。";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="page-stack" v-loading="loading">
    <p v-if="error" class="form-error">{{ error }}</p>

    <section class="metric-grid">
      <article class="metric-card metric-card--primary">
        <div class="metric-icon"><el-icon><List /></el-icon></div>
        <div><span>今日任务</span><strong>{{ tasks.length }}</strong><small>全部家庭成员</small></div>
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
          <span>{{ auth.user?.role === "admin" ? "系统用户" : "家庭数量" }}</span>
          <strong>{{ auth.user?.role === "admin" ? users.length : families.length }}</strong>
          <small>{{ auth.user?.role === "admin" ? `${users.filter((user) => user.active).length} 个账号启用` : `${children.length} 位儿童成员` }}</small>
        </div>
      </article>
    </section>

    <section class="content-panel">
      <div class="panel-heading">
        <div><h2>今日任务情况</h2><p>按提醒时间查看当前任务进度</p></div>
        <router-link to="/tasks" class="panel-link">查看全部 <el-icon><ArrowRight /></el-icon></router-link>
      </div>
      <div class="progress-summary">
        <div class="progress-copy"><strong>{{ completed }} / {{ tasks.length }}</strong><span>任务已完成</span></div>
        <el-progress :percentage="completionRate" :stroke-width="10" :show-text="false" />
      </div>
      <div v-if="tasks.length" class="overview-list">
        <div v-for="task in tasks.slice(0, 8)" :key="task.id" class="overview-row">
          <time>{{ task.scheduleTime }}</time>
          <div class="overview-copy"><strong>{{ task.title }}</strong><span>{{ childName(task.childId) }}</span></div>
          <span class="status-dot" :class="`status-dot--${task.status}`">{{ task.status === "completed" ? "已完成" : "待完成" }}</span>
        </div>
      </div>
      <div v-else class="empty-state">今天暂无任务，前往任务管理创建第一项任务。</div>
    </section>
  </div>
</template>
