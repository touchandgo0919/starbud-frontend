<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Refresh, Search } from "@element-plus/icons-vue";
import { deleteSubmission, getChildren, getSubmissions } from "../services/api";
import type { Child, Submission } from "../types/task";

const submissions = ref<Submission[]>([]);
const children = ref<Child[]>([]);
const loading = ref(false);
const filters = reactive({ keyword: "", childId: "", status: "", reviewStatus: "" });
const currentPage = ref(1);
const pageSize = 10;
const total = ref(0);

function formatDateTime(value: string | null) {
  return value || "—";
}

function childName(childId: string) {
  return children.value.find((child) => child.id === childId)?.name || "—";
}

function reviewStatusLabel(submission: Submission) {
  return submission.finalizedAt ? "已完成" : submission.reviewedAt ? "已批改" : "待批改";
}

async function loadSubmissions(page = currentPage.value) {
  loading.value = true;
  try {
    const result = await getSubmissions({
      page,
      pageSize,
      keyword: filters.keyword.trim(),
      childId: filters.childId,
      status: filters.status,
      reviewStatus: filters.reviewStatus
    });
    currentPage.value = result.pagination.page;
    total.value = result.pagination.total;
    submissions.value = result.submissions;
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
  currentPage.value = 1;
  void loadSubmissions(1);
}

function resetFilters() {
  Object.assign(filters, { keyword: "", childId: "", status: "", reviewStatus: "" });
  currentPage.value = 1;
  void loadSubmissions(1);
}

function changePage(page: number) {
  void loadSubmissions(page);
}

async function removeSubmission(submission: Submission) {
  try {
    await ElMessageBox.confirm(`删除“${submission.taskTitle}”的提交后，作业照片和批改图也会一并删除。`, "删除提交", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning"
    });
    await deleteSubmission(submission.id);
    if (submissions.value.length === 1 && currentPage.value > 1) currentPage.value -= 1;
    await loadSubmissions(currentPage.value);
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
        <label class="field"><span>任务对象</span><el-select v-model="filters.childId" clearable placeholder="全部"><el-option v-for="child in children" :key="child.id" :label="child.name" :value="child.id" /></el-select></label>
        <label class="field"><span>提交状态</span><el-select v-model="filters.status" clearable placeholder="全部状态"><el-option label="已提交" value="submitted" /><el-option label="提交中" value="draft" /></el-select></label>
        <label class="field"><span>批改状态</span><el-select v-model="filters.reviewStatus" clearable placeholder="全部状态"><el-option label="待批改" value="pending" /><el-option label="已批改" value="reviewed" /><el-option label="已完成" value="completed" /></el-select></label>
        <div class="filter-actions">
          <el-button type="primary" :icon="Search" native-type="submit">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </div>
      </form>
    </section>

    <section class="content-panel table-panel">
      <div class="panel-heading"><div><h2>提交记录</h2><p>共 {{ total }} 条提交记录</p></div><el-button @click="loadSubmissions(1)">刷新</el-button></div>
      <el-table class="data-table" :data="submissions" empty-text="暂无提交记录">
        <el-table-column label="提交时间" min-width="176"><template #default="scope">{{ formatDateTime(scope.row.submittedAt) }}</template></el-table-column>
        <el-table-column prop="taskTitle" label="任务名称" min-width="170" />
        <el-table-column label="提交人" width="110"><template #default="scope">{{ childName(scope.row.childId) }}</template></el-table-column>
        <el-table-column label="提交状态" width="100"><template #default="scope"><span :class="scope.row.status === 'submitted' ? 'reviewed-label' : 'task-photo-empty'">{{ scope.row.status === "submitted" ? "已提交" : "提交中" }}</span></template></el-table-column>
        <el-table-column label="作业照片" width="110"><template #default="scope"><div v-if="scope.row.photos.length" class="submission-photo-preview" :title="`共 ${scope.row.photoCount} 张照片`"><img :src="scope.row.photos[0].url" alt="作业照片缩略图" /><span>{{ scope.row.photoCount }}</span></div><span v-else class="task-photo-empty">—</span></template></el-table-column>
        <el-table-column label="批改状态" width="110"><template #default="scope"><span :class="scope.row.finalizedAt || scope.row.reviewedAt ? 'reviewed-label' : 'task-photo-empty'">{{ reviewStatusLabel(scope.row) }}</span></template></el-table-column>
        <el-table-column label="操作" width="90" fixed="right"><template #default="scope"><el-button link type="danger" @click="removeSubmission(scope.row)">删除</el-button></template></el-table-column>
      </el-table>
      <div v-if="total > pageSize" class="table-pagination">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="changePage"
        />
      </div>
    </section>
  </div>
</template>
