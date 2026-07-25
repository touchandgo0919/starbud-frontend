<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Refresh, Search } from "@element-plus/icons-vue";
import { completeTask, createTask, deleteTask, getChildren, getTasks } from "../services/api";
import { useAuthStore } from "../store/auth";
import type { Child, CreateTaskPayload, RepeatType, Task } from "../types/task";

type CreateTaskForm = Omit<CreateTaskPayload, "childId"> & { childIds: string[] };

const auth = useAuthStore();
const tasks = ref<Task[]>([]);
const children = ref<Child[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);
const filters = reactive({ keyword: "", childId: "", status: "pending", repeatType: "" });
const form = reactive<CreateTaskForm>({ childIds: [], title: "", scheduleTime: currentTime(), repeatType: "daily", voiceEnabled: true, voiceContent: "" });
const repeatLabels: Record<RepeatType, string> = { once: "仅一次", daily: "每天", weekdays: "工作日", weekly: "每周" };

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function childName(childId: string) {
  return children.value.find((child) => child.id === childId)?.name || "未知成员";
}

async function loadTasks() {
  loading.value = true;
  try {
    tasks.value = await getTasks(filters);
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "任务加载失败。");
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  Object.assign(filters, { keyword: "", childId: "", status: "pending", repeatType: "" });
  void loadTasks();
}

function openCreate() {
  Object.assign(form, {
    childIds: children.value.map((child) => child.id),
    title: "",
    scheduleTime: currentTime(),
    repeatType: "daily",
    voiceEnabled: true,
    voiceContent: ""
  });
  dialogVisible.value = true;
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
    const results = await Promise.allSettled(
      childIds.map((childId) => createTask({ ...taskPayload, childId, title }))
    );
    const successCount = results.filter((result) => result.status === "fulfilled").length;
    const failedNames = results
      .map((result, index) => result.status === "rejected" ? childName(childIds[index]) : "")
      .filter(Boolean);

    if (successCount) await loadTasks();
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
    await loadTasks();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "打卡失败。");
  }
}

async function removeTask(task: Task) {
  try {
    await ElMessageBox.confirm(`删除“${task.title}”后，儿童端将不再显示该任务。`, "删除任务", { type: "warning", confirmButtonText: "确认删除", cancelButtonText: "取消" });
    await deleteTask(task.id);
    ElMessage.success("任务已删除");
    await loadTasks();
  } catch (cause) {
    if (cause !== "cancel" && cause !== "close") ElMessage.error(cause instanceof Error ? cause.message : "任务删除失败。");
  }
}

onMounted(async () => {
  try {
    children.value = await getChildren();
    await loadTasks();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "任务数据加载失败。");
  }
});
</script>

<template>
  <div class="page-stack">
    <section class="content-panel filter-panel">
      <form class="filter-grid" @submit.prevent="loadTasks">
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
        <div><h2>任务列表</h2><p>共 {{ tasks.length }} 项当前任务</p></div>
        <el-button v-if="auth.user?.role !== 'child'" type="primary" :icon="Plus" @click="openCreate">新建任务</el-button>
      </div>
      <el-table v-loading="loading" :data="tasks" class="data-table desktop-table" empty-text="没有符合条件的任务">
        <el-table-column label="时间" width="96"><template #default="scope"><strong class="time-cell">{{ scope.row.scheduleTime }}</strong></template></el-table-column>
        <el-table-column prop="title" label="任务名称" min-width="180" />
        <el-table-column label="任务对象" min-width="120"><template #default="scope">{{ childName(scope.row.childId) }}</template></el-table-column>
        <el-table-column label="重复" width="110"><template #default="scope">{{ repeatLabels[scope.row.repeatType as RepeatType] }}</template></el-table-column>
        <el-table-column label="提醒" width="90"><template #default="scope">{{ scope.row.voiceEnabled ? "语音" : "静默" }}</template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="scope"><span class="status-dot" :class="`status-dot--${scope.row.status}`">{{ scope.row.status === "completed" ? "已完成" : "待完成" }}</span></template></el-table-column>
        <el-table-column label="操作" width="150" fixed="right"><template #default="scope"><el-button link type="primary" :disabled="scope.row.status === 'completed'" @click="markComplete(scope.row)">完成</el-button><el-button v-if="auth.user?.role !== 'child'" link type="danger" @click="removeTask(scope.row)">删除</el-button></template></el-table-column>
      </el-table>
      <div v-loading="loading" class="mobile-data-list">
        <article v-for="task in tasks" :key="task.id" class="mobile-data-card">
          <div class="mobile-card-head">
            <div><time class="time-cell">{{ task.scheduleTime }}</time><h3>{{ task.title }}</h3></div>
            <span class="status-dot" :class="`status-dot--${task.status}`">{{ task.status === "completed" ? "已完成" : "待完成" }}</span>
          </div>
          <p>{{ childName(task.childId) }} · {{ repeatLabels[task.repeatType] }} · {{ task.voiceEnabled ? `语音：${task.voiceContent}` : "静默提醒" }}</p>
          <div class="mobile-card-actions"><el-button link type="primary" :disabled="task.status === 'completed'" @click="markComplete(task)">完成</el-button><el-button v-if="auth.user?.role !== 'child'" link type="danger" @click="removeTask(task)">删除</el-button></div>
        </article>
        <div v-if="!tasks.length && !loading" class="empty-state">没有符合条件的任务</div>
      </div>
    </section>

    <el-dialog v-model="dialogVisible" title="新建任务" width="520px" class="form-dialog">
      <el-form label-position="top">
        <el-form-item label="任务名称" required><el-input v-model="form.title" maxlength="40" show-word-limit placeholder="例如：完成数学作业" /></el-form-item>
        <el-form-item label="任务对象" required>
          <el-select v-model="form.childIds" multiple clearable placeholder="请选择一个或多个小朋友" style="width: 100%">
            <el-option v-for="child in children" :key="child.id" :label="child.name" :value="child.id" />
          </el-select>
        </el-form-item>
        <div class="dialog-form-row">
          <el-form-item label="提醒时间" required><el-time-picker v-model="form.scheduleTime" format="HH:mm" value-format="HH:mm" :clearable="false" /></el-form-item>
          <el-form-item label="重复方式"><el-select v-model="form.repeatType"><el-option v-for="(label, value) in repeatLabels" :key="value" :label="label" :value="value" /></el-select></el-form-item>
        </div>
        <el-form-item><el-checkbox v-model="form.voiceEnabled">开启语音提醒</el-checkbox></el-form-item>
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
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitTask">保存任务</el-button></template>
    </el-dialog>
  </div>
</template>
