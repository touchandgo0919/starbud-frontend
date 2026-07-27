<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { deleteSubmission, getSubmissions } from "../services/api";
import type { Submission } from "../types/task";

const submissions = ref<Submission[]>([]);
const loading = ref(false);
const keyword = ref("");

const filteredSubmissions = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  return query ? submissions.value.filter((item) => item.taskTitle.toLowerCase().includes(query)) : submissions.value;
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

onMounted(loadSubmissions);
</script>

<template>
  <div class="page-stack" v-loading="loading">
    <section class="content-panel filter-panel">
      <form class="filter-grid submission-filter-grid" @submit.prevent="loadSubmissions">
        <label class="field"><span>关键词</span><el-input v-model="keyword" clearable placeholder="搜索任务名称" /></label>
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
