<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Refresh, Search } from "@element-plus/icons-vue";
import { deleteSubmission, getChildren, getSubmissions } from "../services/api";
import type { Child, Submission } from "../types/task";

const submissions = ref<Submission[]>([]);
const children = ref<Child[]>([]);
const loading = ref(false);
const filters = reactive({ keyword: "", childId: "", status: "", reviewStatus: "" });

const filteredSubmissions = computed(() => {
  const query = filters.keyword.trim().toLowerCase();
  return submissions.value.filter((item) => {
    const matchesKeyword = !query || item.taskTitle.toLowerCase().includes(query) || item.note.toLowerCase().includes(query);
    const matchesChild = !filters.childId || item.childId === filters.childId;
    const matchesStatus = !filters.status || item.status === filters.status;
    const matchesReview = !filters.reviewStatus || (filters.reviewStatus === "reviewed" ? Boolean(item.reviewedAt) : !item.reviewedAt);
    return matchesKeyword && matchesChild && matchesStatus && matchesReview;
  });
});

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

async function loadSubmissions() {
  loading.value = true;
  try {
    submissions.value = await getSubmissions();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "提交记录加载失败。");
  } finally {
    loading.value = false;
  }
}

async function loadChildren() {
  try {
    children.value = await getChildren();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "成员加载失败。");
  }
}

function applyFilters() {
  void loadSubmissions();
}

function resetFilters() {
  Object.assign(filters, { keyword: "", childId: "", status: "", reviewStatus: "" });
  void loadSubmissions();
}

async function removeSubmission(submission: Submission) {
  try {
    await ElMessageBox.confirm(`删除“${submission.taskTitle}”的提交后，作业照片和批改图也会一并删除。`, "删除提交", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning"
    });
    await deleteSubmission(submission.id);
    submissions.value = submissions.value.filter((item) => item.id !== submission.id);
    ElMessage.success("提交已删除。");
  } catch (cause) {
    if (cause !== "cancel" && cause !== "close") ElMessage.error(cause instanceof Error ? cause.message : "删除提交失败。");
  }
}

onMounted(() => {
  void loadSubmissions();
  void loadChildren();
});
</script>

<template>
  <div class="page-stack" v-loading="loading">
    <section class="content-panel filter-panel">
      <form class="filter-grid" @submit.prevent="applyFilters">
        <label class="field"><span>关键词</span><el-input v-model="filters.keyword" clearable placeholder="搜索任务名称或备注" /></label>
        <label class="field"><span>任务对象</span><el-select v-model="filters.childId" clearable placeholder="全部成员"><el-option v-for="child in children" :key="child.id" :label="child.name" :value="child.id" /></el-select></label>
        <label class="field"><span>提交状态</span><el-select v-model="filters.status" clearable placeholder="全部状态"><el-option label="已提交" value="submitted" /><el-option label="提交中" value="draft" /></el-select></label>
        <label class="field"><span>批改状态</span><el-select v-model="filters.reviewStatus" clearable placeholder="全部状态"><el-option label="待批改" value="pending" /><el-option label="已批改" value="reviewed" /></el-select></label>
        <div class="filter-actions">
          <el-button type="primary" :icon="Search" native-type="submit">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </div>
      </form>
    </section>

    <section class="content-panel table-panel">
      <div class="panel-heading"><div><h2>提交记录</h2><p>共 {{ filteredSubmissions.length }} 条提交记录</p></div><el-button @click="loadSubmissions">刷新</el-button></div>
      <el-table class="data-table" :data="filteredSubmissions" empty-text="暂无提交记录">
        <el-table-column label="提交时间" min-width="176"><template #default="scope">{{ formatDateTime(scope.row.submittedAt) }}</template></el-table-column>
        <el-table-column prop="taskTitle" label="任务名称" min-width="170" />
        <el-table-column label="作业照片" width="110"><template #default="scope"><span>{{ scope.row.photoCount }} 张</span></template></el-table-column>
        <el-table-column label="批改状态" width="110"><template #default="scope"><span :class="scope.row.reviewedAt ? 'reviewed-label' : 'task-photo-empty'">{{ scope.row.reviewedAt ? "已批改" : "待批改" }}</span></template></el-table-column>
        <el-table-column label="操作" width="90" fixed="right"><template #default="scope"><el-button link type="danger" @click="removeSubmission(scope.row)">删除</el-button></template></el-table-column>
      </el-table>
    </section>
  </div>
</template>
