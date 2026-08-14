<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Refresh, Search } from "@element-plus/icons-vue";
import { getChildren, getReminderRecords } from "../services/api";
import type { Child, ReminderRecord } from "../types/task";

const records = ref<ReminderRecord[]>([]);
const children = ref<Child[]>([]);
const loading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const pageSize = 20;
const filters = reactive({ childId: "", reminderType: "", status: "", timeRange: [] as string[] });

const typeLabels: Record<string, string> = {
  claim_reminder: "领取提醒",
  revision_reminder: "修改提醒",
  voice_reminder: "完成提醒",
  review_completed: "批改完成",
  task_completed: "任务完成",
  scheduled_voice: "定时语音"
};
const sourceLabels: Record<string, string> = {
  web: "网页版", mini_program: "小程序", desktop_app: "桌面 App",
  server: "服务端", historical: "历史记录"
};

async function loadRecords(page = currentPage.value) {
  currentPage.value = page;
  loading.value = true;
  try {
    const [from, to] = filters.timeRange;
    const result = await getReminderRecords({
      childId: filters.childId,
      reminderType: filters.reminderType,
      status: filters.status,
      from,
      to,
      page,
      pageSize
    });
    records.value = result.records;
    total.value = result.pagination.total;
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  Object.assign(filters, { childId: "", reminderType: "", status: "", timeRange: [] });
  void loadRecords(1);
}

function formatTime(value: string | null) {
  return value || "—";
}

function pushLabel(record: ReminderRecord) {
  return ({ pending: "等待推送", pushed: `已推送（${record.pushConnectionCount}）`, offline: "设备离线", failed: "推送失败", not_applicable: "无需推送", unknown: "历史未知" } as Record<string, string>)[record.pushStatus] || record.pushStatus;
}

function resultLabel(status: string) {
  return ({ pending: "等待提醒", success: "提醒成功", failed: "提醒失败", skipped: "已跳过", unknown: "历史未知" } as Record<string, string>)[status] || status;
}

function tagType(status: string) {
  if (["pushed", "success"].includes(status)) return "success";
  if (["failed"].includes(status)) return "danger";
  if (["offline", "skipped"].includes(status)) return "warning";
  return "info";
}

onMounted(async () => {
  children.value = await getChildren();
  await loadRecords();
});
</script>

<template>
  <div class="page-stack">
    <section class="content-panel filter-panel">
      <form class="filter-grid reminder-filter-grid" @submit.prevent="loadRecords(1)">
        <el-select v-model="filters.childId" clearable placeholder="全部儿童" aria-label="筛选提醒对象"><el-option v-for="child in children" :key="child.id" :label="child.name" :value="child.id" /></el-select>
        <el-select v-model="filters.reminderType" clearable placeholder="全部类型" aria-label="筛选提醒类型"><el-option v-for="(label, value) in typeLabels" :key="value" :label="label" :value="value" /></el-select>
        <el-select v-model="filters.status" clearable placeholder="全部状态" aria-label="筛选执行状态"><el-option label="提醒成功" value="success" /><el-option label="提醒失败" value="failed" /><el-option label="设备离线" value="offline" /><el-option label="等待处理" value="pending" /></el-select>
        <el-date-picker v-model="filters.timeRange" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss" range-separator="至" start-placeholder="开始时间" end-placeholder="结束时间" aria-label="筛选提醒时间范围" />
        <div class="filter-actions"><el-button :icon="Refresh" @click="resetFilters">重置</el-button><el-button type="primary" :icon="Search" native-type="submit">查询</el-button></div>
      </form>
    </section>

    <section class="content-panel table-panel">
      <div class="panel-heading"><div><h2>提醒记录</h2><p>记录实时推送、App 接收和实际提醒结果，共 {{ total }} 条</p></div></div>
      <el-table v-loading="loading" :data="records" class="data-table" empty-text="暂无提醒记录">
        <el-table-column label="发起时间" width="170"><template #default="scope">{{ formatTime(scope.row.createdAt) }}</template></el-table-column>
        <el-table-column label="对象" width="110"><template #default="scope">{{ scope.row.recipient.displayName }}</template></el-table-column>
        <el-table-column label="提醒内容" min-width="280"><template #default="scope"><div class="reminder-content"><strong>{{ typeLabels[scope.row.reminderType] || scope.row.title }}</strong><span>{{ scope.row.content }}</span></div></template></el-table-column>
        <el-table-column label="来源" width="105"><template #default="scope">{{ sourceLabels[scope.row.source] || scope.row.source }}</template></el-table-column>
        <el-table-column label="实时推送" width="130"><template #default="scope"><el-tag :type="tagType(scope.row.pushStatus)" effect="plain">{{ pushLabel(scope.row) }}</el-tag><small v-if="scope.row.pushError">{{ scope.row.pushError }}</small></template></el-table-column>
        <el-table-column label="App 接收" width="165"><template #default="scope"><span :class="scope.row.receivedAt ? 'reviewed-label' : 'muted-copy'">{{ scope.row.receivedAt ? formatTime(scope.row.receivedAt) : '未接收' }}</span></template></el-table-column>
        <el-table-column label="提醒结果" width="140"><template #default="scope"><el-tag :type="tagType(scope.row.reminderStatus)" effect="plain">{{ resultLabel(scope.row.reminderStatus) }}</el-tag><small v-if="scope.row.reminderError">{{ scope.row.reminderError }}</small></template></el-table-column>
      </el-table>
      <div class="table-pagination table-pagination--with-total"><span class="table-pagination-total">共 {{ total }} 条提醒记录</span><el-pagination v-if="total > pageSize" background layout="prev, pager, next" :current-page="currentPage" :page-size="pageSize" :total="total" @current-change="loadRecords" /></div>
    </section>
  </div>
</template>
