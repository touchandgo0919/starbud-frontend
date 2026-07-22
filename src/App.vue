<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  addFamilyMember,
  clearStoredToken,
  completeTask,
  createFamily,
  createTask,
  deleteFamily,
  deleteTask,
  getChildren,
  getFamilies,
  getMe,
  getStoredToken,
  getTodayTasks,
  login,
  removeFamilyMember,
  updateFamily,
  updateFamilyMember
} from "./services/api";
import type {
  Child,
  CreateTaskPayload,
  Family,
  FamilyMember,
  RepeatType,
  Task,
  User
} from "./types/task";

const tasks = ref<Task[]>([]);
const children = ref<Child[]>([]);
const families = ref<Family[]>([]);
const currentUser = ref<User | null>(null);
const loading = ref(false);
const error = ref("");
const authError = ref("");
const showPassword = ref(false);
const deletingTaskId = ref("");
const familyError = ref("");
const familyBusy = ref("");
const newFamilyName = ref("");
const memberDrafts = reactive<Record<string, { username: string; relationship: string }>>({});

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

async function removeTask(task: Task) {
  if (!window.confirm(`确定删除“${task.title}”吗？删除后儿童端将不再显示该任务。`)) {
    return;
  }

  error.value = "";
  deletingTaskId.value = task.id;

  try {
    await deleteTask(task.id);
    tasks.value = tasks.value.filter((item) => item.id !== task.id);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "任务删除失败";
  } finally {
    deletingTaskId.value = "";
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
  const [loadedFamilies, loadedChildren] = await Promise.all([getFamilies(), getChildren()]);
  families.value = loadedFamilies;
  children.value = loadedChildren;

  for (const family of loadedFamilies) {
    memberDrafts[family.id] ||= { username: "", relationship: "" };
  }

  if (!children.value.some((child) => child.id === form.childId)) {
    form.childId = children.value[0]?.id || "";
  }

  await refreshTasks();
}

async function submitFamily() {
  familyError.value = "";
  familyBusy.value = "create";

  try {
    await createFamily(newFamilyName.value);
    newFamilyName.value = "";
    await loadChildrenAndTasks();
  } catch (cause) {
    familyError.value = cause instanceof Error ? cause.message : "家庭创建失败";
  } finally {
    familyBusy.value = "";
  }
}

async function renameExistingFamily(family: Family) {
  const name = window.prompt("请输入新的家庭名称", family.name)?.trim();

  if (!name || name === family.name) {
    return;
  }

  familyError.value = "";
  familyBusy.value = family.id;

  try {
    await updateFamily(family.id, name);
    await loadChildrenAndTasks();
  } catch (cause) {
    familyError.value = cause instanceof Error ? cause.message : "家庭更新失败";
  } finally {
    familyBusy.value = "";
  }
}

async function addMember(family: Family) {
  const draft = memberDrafts[family.id];
  familyError.value = "";
  familyBusy.value = family.id;

  try {
    await addFamilyMember(family.id, draft.username, draft.relationship);
    draft.username = "";
    draft.relationship = "";
    await loadChildrenAndTasks();
  } catch (cause) {
    familyError.value = cause instanceof Error ? cause.message : "成员添加失败";
  } finally {
    familyBusy.value = "";
  }
}

async function editMemberRelationship(family: Family, member: FamilyMember) {
  const relationship = window.prompt("请输入家庭关系称谓", member.relationship)?.trim();

  if (!relationship || relationship === member.relationship) {
    return;
  }

  familyError.value = "";
  familyBusy.value = family.id;

  try {
    await updateFamilyMember(family.id, member.id, relationship);
    await loadChildrenAndTasks();
  } catch (cause) {
    familyError.value = cause instanceof Error ? cause.message : "关系更新失败";
  } finally {
    familyBusy.value = "";
  }
}

async function removeMember(family: Family, member: FamilyMember) {
  if (!window.confirm(`确定将“${member.displayName}”移出“${family.name}”吗？`)) {
    return;
  }

  familyError.value = "";
  familyBusy.value = family.id;

  try {
    await removeFamilyMember(family.id, member.id);
    await loadChildrenAndTasks();
  } catch (cause) {
    familyError.value = cause instanceof Error ? cause.message : "成员移除失败";
  } finally {
    familyBusy.value = "";
  }
}

async function removeFamily(family: Family) {
  if (!window.confirm(`确定删除家庭“${family.name}”吗？此操作不会删除已有任务。`)) {
    return;
  }

  familyError.value = "";
  familyBusy.value = family.id;

  try {
    await deleteFamily(family.id);
    await loadChildrenAndTasks();
  } catch (cause) {
    familyError.value = cause instanceof Error ? cause.message : "家庭删除失败";
  } finally {
    familyBusy.value = "";
  }
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
  families.value = [];
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
          <span class="password-field">
            <input
              v-model="loginForm.password"
              required
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
            />
            <button
              class="password-toggle"
              type="button"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              :title="showPassword ? '隐藏密码' : '显示密码'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <svg v-if="showPassword" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5.2 9 5.2a14 14 0 0 1-2.1 2.6M6.2 6.2A15.4 15.4 0 0 0 3 9.2s3.5 5.2 9 5.2c1 0 1.9-.2 2.7-.4" />
              </svg>
              <svg v-else aria-hidden="true" viewBox="0 0 24 24">
                <path d="M3 12s3.5-5.2 9-5.2 9 5.2 9 5.2-3.5 5.2-9 5.2S3 12 3 12Z" />
                <circle cx="12" cy="12" r="2.4" />
              </svg>
            </button>
          </span>
        </label>

        <p v-if="authError" class="error">{{ authError }}</p>

        <button class="primary-button" type="submit">登录</button>

        <p class="hint">密码由管理员初始化配置。</p>
      </form>
    </section>

    <section v-else class="workspace">
      <section v-if="currentUser.role === 'parent'" class="family-panel">
        <div class="section-title">
          <div>
            <p class="eyebrow">Family</p>
            <h2>家庭管理</h2>
          </div>
        </div>

        <form class="family-create-row" @submit.prevent="submitFamily">
          <label>
            <span>新家庭名称</span>
            <input v-model="newFamilyName" required maxlength="30" placeholder="例如：赵家" />
          </label>
          <button class="primary-button" type="submit" :disabled="familyBusy === 'create'">
            {{ familyBusy === "create" ? "创建中" : "创建家庭" }}
          </button>
        </form>

        <p v-if="familyError" class="error family-error">{{ familyError }}</p>

        <div class="family-list">
          <article v-for="family in families" :key="family.id" class="family-card">
            <div class="family-card-header">
              <div>
                <h3>{{ family.name }}</h3>
                <span>{{ family.members.length }} 位成员</span>
              </div>
              <div v-if="family.canManage" class="family-actions">
                <button
                  class="compact-button"
                  type="button"
                  :disabled="familyBusy === family.id"
                  @click="renameExistingFamily(family)"
                >
                  重命名
                </button>
                <button
                  v-if="family.canDelete"
                  class="compact-button danger-text-button"
                  type="button"
                  :disabled="familyBusy === family.id"
                  @click="removeFamily(family)"
                >
                  删除家庭
                </button>
              </div>
            </div>

            <div class="member-list">
              <div v-for="member in family.members" :key="member.id" class="member-row">
                <div>
                  <strong>{{ member.displayName }}</strong>
                  <span>@{{ member.username }} · {{ member.relationship }}</span>
                </div>
                <div v-if="family.canManage" class="member-actions">
                  <button
                    class="text-button"
                    type="button"
                    :disabled="familyBusy === family.id"
                    @click="editMemberRelationship(family, member)"
                  >
                    修改关系
                  </button>
                  <button
                    v-if="!member.isOwner && member.id !== currentUser.id"
                    class="text-button danger-text-button"
                    type="button"
                    :disabled="familyBusy === family.id"
                    @click="removeMember(family, member)"
                  >
                    移除
                  </button>
                </div>
              </div>
            </div>

            <form
              v-if="family.canManage"
              class="member-add-row"
              @submit.prevent="addMember(family)"
            >
              <input
                v-model="memberDrafts[family.id].username"
                required
                autocomplete="off"
                placeholder="成员用户名"
                aria-label="成员用户名"
              />
              <input
                v-model="memberDrafts[family.id].relationship"
                maxlength="20"
                placeholder="关系，如：妈妈"
                aria-label="家庭关系"
              />
              <button
                class="secondary-button"
                type="submit"
                :disabled="familyBusy === family.id"
              >
                添加成员
              </button>
            </form>
          </article>
        </div>
      </section>

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
            <div class="task-actions">
              <button
                class="complete-button"
                type="button"
                :disabled="task.status === 'completed' || deletingTaskId === task.id"
                @click="markComplete(task.id)"
              >
                {{ task.status === "completed" ? "已完成" : "完成" }}
              </button>
              <button
                v-if="currentUser.role === 'parent'"
                class="delete-button"
                type="button"
                :disabled="deletingTaskId === task.id"
                @click="removeTask(task)"
              >
                {{ deletingTaskId === task.id ? "删除中" : "删除" }}
              </button>
            </div>
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
