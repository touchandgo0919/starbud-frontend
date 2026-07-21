<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  clearStoredToken,
  completeTask,
  createTask,
  getChildren,
  getMe,
  getStoredToken,
  getTodayTasks,
  login
} from "./services/api";
import type { Child, CreateTaskPayload, RepeatType, Task, User } from "./types/task";

const tasks = ref<Task[]>([]);
const children = ref<Child[]>([]);
const currentUser = ref<User | null>(null);
const loading = ref(false);
const error = ref("");
const authError = ref("");

const loginForm = reactive({
  username: "zhaotao",
  password: ""
});

const form = reactive<CreateTaskPayload>({
  childId: "",
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
  if (!currentUser.value) {
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    tasks.value = await getTodayTasks(form.childId || undefined);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "今日任务加载失败";
  } finally {
    loading.value = false;
  }
}

async function submitTask() {
  error.value = "";

  if (!form.childId) {
    error.value = "请选择任务对象";
    return;
  }

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

function setChildId(value: Event) {
  form.childId = (value.target as HTMLSelectElement).value;
  void refreshTasks();
}

async function loadSession() {
  if (!getStoredToken()) {
    return;
  }

  try {
    currentUser.value = await getMe();
    await loadChildrenAndTasks();
  } catch {
    clearStoredToken();
    currentUser.value = null;
  }
}

async function loadChildrenAndTasks() {
  children.value = await getChildren();
  form.childId = children.value[0]?.id || "";
  await refreshTasks();
}

async function submitLogin() {
  authError.value = "";

  try {
    currentUser.value = await login(loginForm.username.trim(), loginForm.password);
    await loadChildrenAndTasks();
  } catch (cause) {
    authError.value = cause instanceof Error ? cause.message : "登录失败";
  }
}

function logout() {
  clearStoredToken();
  currentUser.value = null;
  children.value = [];
  tasks.value = [];
}

onMounted(loadSession);
</script>

<template>
  <main class="app-shell">
    <aside class="sidebar">
      <p class="eyebrow">Starbud Parent Web</p>
      <h1>家长后台</h1>
      <p class="sidebar-copy">
        {{
          currentUser
            ? `当前登录：${currentUser.displayName}`
            : "登录后管理孩子今日习惯任务。"
        }}
      </p>

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

    <section v-if="!currentUser" class="workspace auth-workspace">
      <form class="login-panel" @submit.prevent="submitLogin">
        <div class="section-title">
          <div>
            <p class="eyebrow">Login</p>
            <h2>用户登录</h2>
          </div>
        </div>

        <label>
          <span>用户名</span>
          <input v-model="loginForm.username" required autocomplete="username" />
        </label>

        <label>
          <span>密码</span>
          <input
            v-model="loginForm.password"
            required
            type="password"
            autocomplete="current-password"
          />
        </label>

        <p v-if="authError" class="error">{{ authError }}</p>

        <button class="primary-button" type="submit">登录</button>

        <p class="hint">密码由管理员初始化配置。</p>
      </form>
    </section>

    <section v-else class="workspace">
      <form class="task-form" @submit.prevent="submitTask">
        <div class="section-title">
          <div>
            <p class="eyebrow">Task</p>
            <h2>创建任务</h2>
          </div>
          <div class="actions">
            <button class="secondary-button" type="button" @click="logout">退出</button>
            <button class="primary-button" type="submit">保存任务</button>
          </div>
        </div>

        <label>
          <span>任务名称</span>
          <input v-model="form.title" required maxlength="40" />
        </label>

        <label class="target-field">
          <span>任务对象</span>
          <select :value="form.childId" required @change="setChildId">
            <option v-for="child in children" :key="child.id" :value="child.id">
              {{ child.name }}
            </option>
          </select>
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
                <span>{{ children.find((child) => child.id === task.childId)?.name }}</span>
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
