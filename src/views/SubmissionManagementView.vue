<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Refresh, Search } from "@element-plus/icons-vue";
import { deleteSubmission, getChildren, getSubmissions } from "../services/api";
import type { Child, Submission } from "../types/task";

const submissions = ref<Submission[]>([]);
const children = ref<Child[]>([]);
const loading = ref(false);
const filters = reactive({ childId: "", timeRange: [] as string[] });
const currentPage = ref(1);
const pageSize = 10;
const total = ref(0);

function formatDateTime(value: string | null) {
  return value || "—";
}

function formatAudioDuration(durationMs: number | null | undefined) {
  const totalSeconds = Math.max(0, Math.round((durationMs || 0) / 1000));
  if (!totalSeconds) return "时长未知";
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `时长 ${minutes}:${seconds}`;
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
      childId: filters.childId,
      dateFrom: filters.timeRange[0],
      dateTo: filters.timeRange[1]
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
  Object.assign(filters, { childId: "", timeRange: [] });
  currentPage.value = 1;
  void loadSubmissions(1);
}

function changePage(page: number) {
  void loadSubmissions(page);
}

async function removeSubmission(submission: Submission) {
  try {
    await ElMessageBox.confirm(`删除“${submission.taskTitle}”的提交后，作业照片、录音和批改图也会一并删除。`, "删除提交", {
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
    <section class="content-panel filter-panel record-filter-panel">
      <form class="record-filter-form" @submit.prevent="applyFilters">
        <div class="record-child-switch-list" role="list" aria-label="选择儿童"><button type="button" class="record-child-switch-item" :class="{ 'is-active': !filters.childId }" @click="filters.childId = ''">全部</button><button v-for="child in children" :key="child.id" type="button" class="record-child-switch-item" :class="{ 'is-active': filters.childId === child.id }" @click="filters.childId = child.id">{{ child.name }}</button></div>
        <el-date-picker v-model="filters.timeRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" aria-label="筛选提交时间范围" />
        <el-button type="primary" :icon="Search" native-type="submit">查询</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </form>
    </section>
    <section class="content-panel table-panel">
      <div class="panel-heading"><div><h2>提交记录</h2><p>共 {{ total }} 条提交记录</p></div></div>
      <el-table class="data-table" :data="submissions" empty-text="暂无提交记录">
        <el-table-column label="提交时间" min-width="176"><template #default="scope">{{ formatDateTime(scope.row.submittedAt) }}</template></el-table-column>
        <el-table-column prop="taskTitle" label="任务名称" min-width="170" />
        <el-table-column label="提交人" width="110"><template #default="scope">{{ childName(scope.row.childId) }}</template></el-table-column>
        <el-table-column label="提交状态" width="100"><template #default="scope"><span :class="scope.row.status === 'submitted' ? 'reviewed-label' : 'task-photo-empty'">{{ scope.row.status === "submitted" ? "已提交" : "提交中" }}</span></template></el-table-column>
        <el-table-column label="提交附件" min-width="230"><template #default="scope"><div v-if="scope.row.photos.length || scope.row.audio" class="submission-attachments"><div v-if="scope.row.photos.length" class="submission-photo-preview" :title="`共 ${scope.row.photoCount} 张照片`"><img :src="scope.row.photos[0].url" alt="作业照片缩略图" /><span>{{ scope.row.photoCount }}</span></div><div v-if="scope.row.audio" class="submission-audio-attachment"><audio class="submission-audio-player" controls preload="metadata" :src="scope.row.audio.url">当前浏览器不支持播放录音。</audio><span class="submission-audio-duration">{{ formatAudioDuration(scope.row.audio.durationMs) }}</span></div></div><span v-else class="task-photo-empty">—</span></template></el-table-column>
        <el-table-column label="批改状态" width="110"><template #default="scope"><span :class="scope.row.finalizedAt || scope.row.reviewedAt ? 'reviewed-label' : 'task-photo-empty'">{{ reviewStatusLabel(scope.row) }}</span></template></el-table-column>
        <el-table-column label="操作" width="90" fixed="right"><template #default="scope"><el-button link type="danger" @click="removeSubmission(scope.row)">删除</el-button></template></el-table-column>
      </el-table>
      <div v-if="total" class="table-pagination table-pagination--with-total">
        <span class="table-pagination-total">共 {{ total }} 条提交记录</span>
        <el-pagination
          v-if="total > pageSize"
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

<style scoped>
.submission-attachments {
  align-items: center;
  display: flex;
  gap: 10px;
  min-width: 0;
}

.submission-audio-player {
  display: block;
  height: 32px;
  max-width: 100%;
  width: 170px;
}

.submission-audio-attachment {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.submission-audio-duration {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
}
</style>
