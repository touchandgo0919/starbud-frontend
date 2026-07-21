<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { completeTask, createTask, getTodayTasks } from "./services/api";
import type { CreateTaskPayload, RepeatType, Task } from "./types/task";

const tasks = ref<Task[]>([]);
const loading = ref(false);
const error = ref("");

const form = reactive<CreateTaskPayload>({
  title: "数学作业",
  scheduleTime: "19:30",
  repeatType: "daily",
  voiceEnabled: true
});

const completedCount = computed(
  () => tasks.value.filter((task) => task.status === "completed").length
);

const pendingCount = computed(
  () => tasks.value.filter((task) => task.status === "pending").length
);

async function refreshTasks() {
  loading.value = true;
  error.value = "";

  try {
    tasks.value = await getTodayTasks();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "今日任务加载失败";
  } finally {
    loading.value = false;
  }
}

async function submitTask() {
  error.value = "";

  try {
    const task = await createTask({ ...form });
    tasks.value = [...tasks.value, task].sort((left, right) =>
      left.scheduleTime.localeCompare(right.scheduleTime)
    );
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "任务创建失败";
  }
}

async function markComplete(taskId: string) {
  error.value = "";

  try {
    const updated = await completeTask(taskId);
    tasks.value = tasks.value.map((task) => (task.id === taskId ? updated : task));
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "打卡失败";
  }
}

function setRepeatType(value: Event) {
  form.repeatType = (value.target as HTMLSelectElement).value as RepeatType;
}

onMounted(refreshTasks);
</script>

<template>
  <main class="app-shell">
    <aside class="sidebar">
      <p class="eyebrow">Starbud Parent Web</p>
      <h1>家长后台</h1>
      <p class="sidebar-copy">管理孩子今日习惯任务，任务保存后由后端同步给儿童客户端。</p>

      <div class="stats">
        <div>
          <span>待完成</span>
          <strong>{{ pendingCount }}</strong>
        </div>
        <div>
          <span>已完成</span>
          <strong>{{ completedCount }}</strong>
        </div>
      </div>
    </aside>

    <section class="workspace">
      <form class="task-form" @submit.prevent="submitTask">
        <div class="section-title">
          <div>
            <p class="eyebrow">Task</p>
            <h2>创建任务</h2>
          </div>
          <button class="primary-button" type="submit">保存任务</button>
        </div>

        <label>
          <span>任务名称</span>
          <input v-model="form.title" required maxlength="40" />
        </label>

        <div class="form-row">
          <label>
            <span>提醒时间</span>
            <input v-model="form.scheduleTime" required type="time" />
          </label>

          <label>
            <span>重复</span>
            <select :value="form.repeatType" @change="setRepeatType">
              <option value="daily">每天</option>
              <option value="weekdays">工作日</option>
              <option value="weekly">每周</option>
              <option value="once">仅一次</option>
            </select>
          </label>
        </div>

        <label class="toggle-row">
          <input v-model="form.voiceEnabled" type="checkbox" />
          <span>开启语音提醒</span>
        </label>
      </form>

      <section class="task-panel">
        <div class="section-title">
          <div>
            <p class="eyebrow">Today</p>
            <h2>今日任务</h2>
          </div>
          <button class="secondary-button" type="button" @click="refreshTasks">
            {{ loading ? "同步中" : "刷新" }}
          </button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <div v-if="tasks.length" class="task-list">
          <article v-for="task in tasks" :key="task.id" class="task-card">
            <div>
              <time>{{ task.scheduleTime }}</time>
              <h3>{{ task.title }}</h3>
              <p>
                {{ task.repeatType === "daily" ? "每天重复" : "自定义重复" }}
                <span v-if="task.voiceEnabled">语音开启</span>
              </p>
            </div>
            <button
              class="complete-button"
              type="button"
              :disabled="task.status === 'completed'"
              @click="markComplete(task.id)"
            >
              {{ task.status === "completed" ? "已完成" : "完成" }}
            </button>
          </article>
        </div>

        <div v-else class="empty-state">
          <strong>今天还没有任务</strong>
          <span>创建一个任务后，儿童端会从后端同步。</span>
        </div>
      </section>
    </section>
  </main>
</template>
