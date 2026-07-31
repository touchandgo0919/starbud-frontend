<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Download, Refresh, Search } from "@element-plus/icons-vue";
import { getAccessEvents } from "../services/api";
import type { AccessEvent } from "../types/task";

const events = ref<AccessEvent[]>([]);
const loading = ref(false);
const total = ref(0);
const filters = reactive({ eventName: "", clientType: "", userId: "", timeRange: [] as string[] });
const currentPage = ref(1);
const pageSize = 50;
const eventLabels: Record<string, string> = {
  login_succeeded: "登录成功", login_attempt: "登录失败", logout: "退出登录", parent_registered: "注册家长账号",
  task_searched: "搜索任务", task_detail_viewed: "查看任务详情", task_claimed: "领取任务", task_completed: "完成任务",
  task_created: "创建任务", task_updated: "编辑任务", task_deleted: "删除任务", task_reminder_sent: "发起提醒", task_status_updated: "修正任务状态",
  submission_searched: "搜索提交", submission_submitted: "提交作业", submission_reopened: "退回重交", submission_deleted: "删除提交",
  submission_review_submitted: "提交批改", submission_review_finalized: "完成批改",
  family_created: "创建家庭", family_updated: "编辑家庭", family_deleted: "删除家庭", family_child_created: "创建子女",
  family_member_added: "添加家庭成员", family_member_updated: "修改家庭成员", family_member_removed: "移除家庭成员",
  user_created: "创建用户", user_updated: "编辑用户"
};
const clientLabels: Record<string, string> = { web: "网页版", mini_program: "小程序", desktop_app: "桌面 App" };

async function loadEvents(page = currentPage.value) {
  currentPage.value = page;
  loading.value = true;
  try {
    const [from, to] = filters.timeRange;
    const result = await getAccessEvents({ eventName: filters.eventName, clientType: filters.clientType, userId: filters.userId.trim(), from, to, page, pageSize });
    events.value = result.events;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  filters.eventName = "";
  filters.clientType = "";
  filters.userId = "";
  filters.timeRange = [];
  currentPage.value = 1;
  void loadEvents();
}

function exportCurrentPage() {
  const header = ["时间", "用户", "事件", "来源", "页面/接口", "结果"];
  const rows = events.value.map((event) => [
    formatTime(event.occurredAt), event.user?.displayName || "未登录",
    eventLabels[event.eventName] || event.eventName, clientLabels[event.clientType] || event.clientType,
    event.route || "", event.outcome === "success" ? "成功" : "失败"
  ]);
  const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `starbud-access-events-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}

onMounted(loadEvents);
</script>

<template>
  <div class="page-stack">
    <section class="content-panel filter-panel">
      <form class="filter-grid" @submit.prevent="loadEvents(1)">
        <label class="field"><span>事件类型</span><el-select v-model="filters.eventName" clearable placeholder="全部事件"><el-option v-for="(label, value) in eventLabels" :key="value" :label="label" :value="value" /></el-select></label>
        <label class="field"><span>访问来源</span><el-select v-model="filters.clientType" clearable placeholder="全部来源"><el-option v-for="(label, value) in clientLabels" :key="value" :label="label" :value="value" /></el-select></label>
        <label class="field"><span>用户 ID</span><el-input v-model="filters.userId" clearable placeholder="按用户 ID 筛选" /></label>
        <label class="field"><span>时间范围</span><el-date-picker v-model="filters.timeRange" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss" range-separator="至" start-placeholder="开始时间" end-placeholder="结束时间" /></label>
        <div class="filter-actions"><el-button :icon="Refresh" @click="resetFilters">重置</el-button><el-button :icon="Download" @click="exportCurrentPage">导出本页</el-button><el-button type="primary" :icon="Search" native-type="submit">查询</el-button></div>
      </form>
    </section>
    <section class="content-panel table-panel">
      <div class="panel-heading"><div><h2>访问记录</h2><p>最近 {{ events.length }} 条，共 {{ total }} 条记录</p></div></div>
      <el-table v-loading="loading" :data="events" class="data-table" empty-text="暂无访问记录">
        <el-table-column label="时间" width="175"><template #default="scope">{{ formatTime(scope.row.occurredAt) }}</template></el-table-column>
        <el-table-column label="用户" min-width="130"><template #default="scope">{{ scope.row.user?.displayName || "未登录" }}</template></el-table-column>
        <el-table-column label="事件" min-width="145"><template #default="scope">{{ eventLabels[scope.row.eventName] || scope.row.eventName }}</template></el-table-column>
        <el-table-column label="来源" width="110"><template #default="scope">{{ clientLabels[scope.row.clientType] || scope.row.clientType }}</template></el-table-column>
        <el-table-column prop="route" label="接口/页面" min-width="180" />
        <el-table-column label="结果" width="90"><template #default="scope"><span :class="scope.row.outcome === 'success' ? 'reviewed-label' : 'task-state--review'">{{ scope.row.outcome === "success" ? "成功" : "失败" }}</span></template></el-table-column>
      </el-table>
      <el-pagination v-if="total > pageSize" class="table-pagination" background layout="prev, pager, next" :current-page="currentPage" :page-size="pageSize" :total="total" @current-change="loadEvents" />
    </section>
  </div>
</template>
