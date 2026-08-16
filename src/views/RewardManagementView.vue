<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { confirmRewardRedemption, createFamilyReward, deleteFamilyReward, getChildren, getFamilies, getRewardBalances, getRewardCenter, updateFamilyReward, updateRewardSettings } from "../services/api";
import type { Child, Family, RewardCenter } from "../types/task";

const route = useRoute();
const families = ref<Family[]>([]);
const children = ref<Child[]>([]);
const selectedFamilyId = ref("");
const selectedChildId = ref("");
const center = ref<RewardCenter | null>(null);
const childBalances = ref<Record<string, number>>({});
const loading = ref(false);
const settings = reactive({ taskPoints: 1, streakDays: 3, streakBonusPoints: 2 });
const rewardForm = reactive({ title: "", pointCost: 10, description: "" });
const editingRewardId = ref("");
const activeTab = computed(() => route.path.endsWith("/records") ? "records" : "settings");
const recordTab = ref<"earned" | "redemptions">("earned");
const rulesSaved = ref(false);
const recordFilters = reactive({ timeRange: [] as string[] });
const appliedRecordFilters = reactive({ timeRange: [] as string[] });
const rewardPage = ref(1);
const earnedPage = ref(1);
const redemptionPage = ref(1);
const rewardPageSize = 10;
const currentFamilyName = computed(() => families.value.find((family) => family.id === selectedFamilyId.value)?.name || "当前家庭");
const earnedEntries = computed(() => (center.value?.entries || []).filter((entry) => entry.points > 0 && recordMatches(entry.createdAt)));
const visibleRedemptions = computed(() => (center.value?.redemptions || []).filter((item) => recordMatches(item.requestedAt)));
const pagedRewards = computed(() => (center.value?.rewards || []).slice((rewardPage.value - 1) * rewardPageSize, rewardPage.value * rewardPageSize));
const pagedEarnedEntries = computed(() => earnedEntries.value.slice((earnedPage.value - 1) * rewardPageSize, earnedPage.value * rewardPageSize));
const pagedRedemptions = computed(() => visibleRedemptions.value.slice((redemptionPage.value - 1) * rewardPageSize, redemptionPage.value * rewardPageSize));
let centerRequestId = 0;

async function load() {
  loading.value = true;
  try {
    const [familyData, childData] = await Promise.all([getFamilies(), getChildren()]);
    families.value = familyData.filter((family) => family.canManage);
    children.value = childData;
    if (!selectedFamilyId.value) selectedFamilyId.value = families.value[0]?.id || "";
    if (!selectedChildId.value) selectedChildId.value = children.value[0]?.id || "";
    const [balances, selectedCenter] = await Promise.all([
      getRewardBalances(),
      selectedChildId.value ? getRewardCenter(selectedChildId.value) : Promise.resolve(null)
    ]);
    childBalances.value = Object.fromEntries(balances.map((item) => [item.childId, item.balance]));
    if (selectedCenter) {
      center.value = selectedCenter;
      Object.assign(settings, selectedCenter.settings);
    }
  } catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : "积分数据加载失败。"); }
  finally { loading.value = false; }
}

async function loadCenter() {
  if (!selectedChildId.value) return;
  const requestId = ++centerRequestId;
  const nextCenter = await getRewardCenter(selectedChildId.value);
  if (requestId !== centerRequestId) return;
  center.value = nextCenter;
  Object.assign(settings, nextCenter.settings);
}

async function saveSettings() {
  try {
    await updateRewardSettings(selectedFamilyId.value, settings);
    await loadCenter();
    rulesSaved.value = true;
    ElMessage.success("奖励规则已保存");
    window.setTimeout(() => { rulesSaved.value = false; }, 2500);
  }
  catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : "保存失败。"); }
}

function resetRewardForm() {
  editingRewardId.value = "";
  Object.assign(rewardForm, { title: "", pointCost: 10, description: "" });
}

function editReward(reward: RewardCenter["rewards"][number]) {
  editingRewardId.value = reward.id;
  Object.assign(rewardForm, { title: reward.title, pointCost: reward.pointCost, description: reward.description });
}

async function saveReward() {
  try {
    if (editingRewardId.value) await updateFamilyReward(editingRewardId.value, selectedFamilyId.value, rewardForm);
    else await createFamilyReward(selectedFamilyId.value, rewardForm);
    ElMessage.success(editingRewardId.value ? "兑换奖励已更新" : "兑换奖励已添加");
    resetRewardForm();
    await loadCenter();
  } catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : "保存失败。"); }
}

async function removeReward(reward: RewardCenter["rewards"][number]) {
  try {
    await ElMessageBox.confirm(`删除“${reward.title}”后，儿童将不能再兑换此奖励；已有兑换记录会保留。`, "删除兑换奖励", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" });
    await deleteFamilyReward(reward.id, selectedFamilyId.value);
    if (editingRewardId.value === reward.id) resetRewardForm();
    if (pagedRewards.value.length === 1 && rewardPage.value > 1) rewardPage.value -= 1;
    await loadCenter();
    ElMessage.success("兑换奖励已删除");
  } catch (cause) {
    if (cause !== "cancel" && cause !== "close") ElMessage.error(cause instanceof Error ? cause.message : "删除失败。");
  }
}

async function confirm(id: string, approved: boolean) {
  try { await confirmRewardRedemption(id, approved); ElMessage.success(approved ? "已确认兑换，积分已扣除" : "已拒绝兑换申请"); await loadCenter(); }
  catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : "处理失败。"); }
}

function recordMatches(dateTime: string) {
  const date = dateTime.slice(0, 10);
  const [from, to] = appliedRecordFilters.timeRange;
  return (!from || date >= from) && (!to || date <= to);
}

function applyRecordFilters() { Object.assign(appliedRecordFilters, { timeRange: [...recordFilters.timeRange] }); earnedPage.value = 1; redemptionPage.value = 1; }
function resetRecordFilters() { Object.assign(recordFilters, { timeRange: [] }); Object.assign(appliedRecordFilters, { timeRange: [] }); earnedPage.value = 1; redemptionPage.value = 1; }

watch(selectedChildId, (childId, previousChildId) => {
  earnedPage.value = 1;
  redemptionPage.value = 1;
  if (childId && previousChildId) void loadCenter();
});
onMounted(load);
</script>

<template>
  <div class="page-stack" v-loading="loading">
    <template v-if="activeTab === 'settings'">
      <section class="content-panel reward-management">
        <div class="reward-family-scope"><span>家庭共享规则</span><strong>{{ currentFamilyName }} · 全部儿童</strong><p>积分规则和可兑换奖励由家长统一设置；每位儿童的积分余额与兑换记录独立计算。</p></div>
        <section class="reward-rule-panel"><div><h3>积分规则</h3><p>规则按家庭生效，儿童完成任务后自动记入积分。</p><span v-if="rulesSaved" class="rules-saved">✓ 规则已保存</span></div><el-form class="reward-settings" label-position="top" inline><el-form-item label="完成任务积分"><el-input-number v-model="settings.taskPoints" :min="1" :max="100" /></el-form-item><el-form-item label="连续完成天数"><el-input-number v-model="settings.streakDays" :min="2" :max="30" /></el-form-item><el-form-item label="连续奖励积分"><el-input-number v-model="settings.streakBonusPoints" :min="1" :max="500" /></el-form-item><el-button type="primary" @click="saveSettings">{{ rulesSaved ? "已保存" : "保存规则" }}</el-button></el-form></section>
        <div class="reward-grid">
          <div class="reward-box"><h3>当前可兑换奖励 <small>共 {{ center?.rewards.length || 0 }} 项</small></h3>
            <div class="reward-list"><div v-for="reward in pagedRewards" :key="reward.id"><div><strong>{{ reward.title }}</strong><small>{{ reward.description || "家长自定义奖励" }}</small></div><div class="reward-item-actions"><span>{{ reward.pointCost }} 分</span><button type="button" class="reward-list-action reward-list-action--edit" @click="editReward(reward)">编辑</button><button type="button" class="reward-list-action reward-list-action--delete" @click="removeReward(reward)">删除</button></div></div><span v-if="!center?.rewards.length" class="muted">还没有设置兑换奖励。</span></div>
            <div v-if="(center?.rewards.length || 0) > rewardPageSize" class="table-pagination"><el-pagination background layout="prev, pager, next" :current-page="rewardPage" :page-size="rewardPageSize" :total="center?.rewards.length || 0" @current-change="rewardPage = $event" /></div>
          </div>
          <div class="reward-box"><h3>{{ editingRewardId ? "编辑可兑换奖励" : "添加可兑换奖励" }}</h3><el-input v-model="rewardForm.title" placeholder="例如：周末电影" maxlength="40" /><div class="reward-form-line"><el-input-number v-model="rewardForm.pointCost" :min="1" /><el-input v-model="rewardForm.description" placeholder="奖励说明（选填）" maxlength="120" /></div><div class="reward-form-actions"><el-button type="primary" @click="saveReward">{{ editingRewardId ? "保存修改" : "添加奖励" }}</el-button><el-button v-if="editingRewardId" @click="resetRewardForm">取消编辑</el-button></div></div>
        </div>
      </section>
    </template>
    <template v-else>
      <section class="content-panel reward-management reward-record-filter-card">
        <div class="reward-record-controls"><div class="reward-child-selector"><div class="reward-child-switch-list" role="list" aria-label="选择儿童">
          <button v-for="child in children" :key="child.id" type="button" class="reward-child-switch-item" :class="{ 'is-active': selectedChildId === child.id }" role="listitem" @click="selectedChildId = child.id"><span class="reward-child-switch-name">{{ child.name }}</span><b>{{ childBalances[child.id] ?? 0 }} 分</b><span class="reward-child-switch-progress"><i :style="{ width: `${Math.min(100, ((childBalances[child.id] || 0) % 20) * 5 || 12)}%` }" /></span></button>
        </div></div>
        <form class="record-filter-form reward-record-filter" @submit.prevent="applyRecordFilters"><el-date-picker v-model="recordFilters.timeRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" aria-label="筛选积分记录时间范围" /><el-button type="primary" native-type="submit">查询</el-button><el-button @click="resetRecordFilters">重置</el-button></form></div>
      </section>
      <section class="content-panel reward-management reward-record-list-card">
        <div class="record-tabs"><button :class="{ active: recordTab === 'earned' }" @click="recordTab = 'earned'">获取记录</button><button :class="{ active: recordTab === 'redemptions' }" @click="recordTab = 'redemptions'">兑换记录</button></div>
        <div v-if="recordTab === 'earned'" class="reward-box redemption-records"><h3>获取记录 <small>共 {{ earnedEntries.length }} 笔</small></h3><div class="redemption-list"><div v-for="entry in pagedEarnedEntries" :key="`${entry.type}-${entry.createdAt}`"><div><strong>{{ entry.description }}</strong><span><b class="entry-type">{{ entry.type === 'streak_bonus' ? '连续奖励' : '完成任务' }}</b>{{ entry.createdAt }}</span></div><strong class="point-income">+{{ entry.points }} 分</strong></div><span v-if="!earnedEntries.length" class="muted">暂无积分获取记录。</span></div><div v-if="earnedEntries.length > rewardPageSize" class="table-pagination"><el-pagination background layout="prev, pager, next" :current-page="earnedPage" :page-size="rewardPageSize" :total="earnedEntries.length" @current-change="earnedPage = $event" /></div></div>
        <div v-else class="reward-box redemption-records"><h3>兑换记录 <small>共 {{ visibleRedemptions.length }} 笔</small></h3><div class="redemption-list"><div v-for="item in pagedRedemptions" :key="item.id"><div><strong>{{ item.childName }} · {{ item.title }}</strong><span>{{ item.pointCost }} 分 · {{ item.requestedAt }}{{ item.note ? ` · ${item.note}` : '' }}</span></div><div v-if="item.status === 'pending'" class="row-actions"><el-button type="primary" size="small" @click="confirm(item.id, true)">确认兑换</el-button><el-button size="small" @click="confirm(item.id, false)">拒绝</el-button></div><span v-else :class="`redemption-status ${item.status}`">{{ item.status === 'approved' ? '已确认' : '已拒绝' }}</span></div><span v-if="!visibleRedemptions.length" class="muted">暂无兑换申请。</span></div><div v-if="visibleRedemptions.length > rewardPageSize" class="table-pagination"><el-pagination background layout="prev, pager, next" :current-page="redemptionPage" :page-size="rewardPageSize" :total="visibleRedemptions.length" @current-change="redemptionPage = $event" /></div></div>
      </section>
    </template>
  </div>
</template>
