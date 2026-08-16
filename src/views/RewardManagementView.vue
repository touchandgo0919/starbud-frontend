<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { confirmRewardRedemption, createFamilyReward, getChildren, getFamilies, getRewardCenter, updateRewardSettings } from "../services/api";
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
const activeTab = computed(() => route.path.endsWith("/records") ? "records" : "settings");
const recordTab = ref<"earned" | "redemptions">("earned");
const rulesSaved = ref(false);

async function load() {
  loading.value = true;
  try {
    const [familyData, childData] = await Promise.all([getFamilies(), getChildren()]);
    families.value = familyData.filter((family) => family.canManage);
    children.value = childData;
    if (!selectedFamilyId.value) selectedFamilyId.value = families.value[0]?.id || "";
    if (!selectedChildId.value) selectedChildId.value = children.value[0]?.id || "";
    const centers = await Promise.all(children.value.map(async (child) => [child.id, await getRewardCenter(child.id)] as const));
    childBalances.value = Object.fromEntries(centers.map(([childId, childCenter]) => [childId, childCenter.balance]));
    await loadCenter();
  } catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : "积分数据加载失败。"); }
  finally { loading.value = false; }
}

async function loadCenter() {
  if (!selectedChildId.value) return;
  center.value = await getRewardCenter(selectedChildId.value);
  Object.assign(settings, center.value.settings);
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

async function addReward() {
  try { await createFamilyReward(selectedFamilyId.value, rewardForm); Object.assign(rewardForm, { title: "", pointCost: 10, description: "" }); ElMessage.success("兑换奖励已添加"); await loadCenter(); }
  catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : "添加失败。"); }
}

async function confirm(id: string, approved: boolean) {
  try { await confirmRewardRedemption(id, approved); ElMessage.success(approved ? "已确认兑换，积分已扣除" : "已拒绝兑换申请"); await loadCenter(); }
  catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : "处理失败。"); }
}

watch(selectedChildId, () => loadCenter());
onMounted(load);
</script>

<template>
  <div class="page-stack" v-loading="loading">
    <section class="content-panel reward-management">
      <div class="panel-heading"><div><h2>{{ activeTab === "settings" ? "奖励设置" : "积分记录" }}</h2><p>{{ activeTab === "settings" ? "设置完成任务积分、连续奖励及可兑换的生活小奖励。" : "查看每次积分获取来源和儿童的兑换申请。" }}</p></div></div>
      <div class="reward-child-selector"><div class="reward-child-selector-copy"><strong>选择儿童</strong><span>{{ activeTab === "records" ? "查看该儿童的获取与兑换记录" : "查看并设置该儿童所在家庭的奖励规则" }}</span></div><div class="reward-child-switch-list" role="list" aria-label="选择儿童">
        <button v-for="child in children" :key="child.id" type="button" class="reward-child-switch-item" :class="{ 'is-active': selectedChildId === child.id }" role="listitem" @click="selectedChildId = child.id"><span class="reward-child-switch-name">{{ child.name }}</span><b>{{ childBalances[child.id] ?? 0 }} 分</b><span class="reward-child-switch-progress"><i :style="{ width: `${Math.min(100, ((childBalances[child.id] || 0) % 20) * 5 || 12)}%` }" /></span></button>
      </div></div>

      <template v-if="activeTab === 'settings'">
        <section class="reward-rule-panel"><div><h3>积分规则</h3><p>规则按家庭生效，儿童完成任务后自动记入积分。</p><span v-if="rulesSaved" class="rules-saved">✓ 规则已保存</span></div><el-form class="reward-settings" label-position="top" inline><el-form-item label="完成任务积分"><el-input-number v-model="settings.taskPoints" :min="1" :max="100" /></el-form-item><el-form-item label="连续完成天数"><el-input-number v-model="settings.streakDays" :min="2" :max="30" /></el-form-item><el-form-item label="连续奖励积分"><el-input-number v-model="settings.streakBonusPoints" :min="1" :max="500" /></el-form-item><el-button type="primary" @click="saveSettings">{{ rulesSaved ? "已保存" : "保存规则" }}</el-button></el-form></section>
        <div class="reward-grid"><div class="reward-box"><h3>当前可兑换奖励</h3><div class="reward-list"><div v-for="reward in center?.rewards" :key="reward.id"><div><strong>{{ reward.title }}</strong><small>{{ reward.description || "家长自定义奖励" }}</small></div><span>{{ reward.pointCost }} 分</span></div><span v-if="!center?.rewards.length" class="muted">还没有设置兑换奖励。</span></div></div><div class="reward-box"><h3>添加可兑换奖励</h3><el-input v-model="rewardForm.title" placeholder="例如：周末电影" maxlength="40" /><div class="reward-form-line"><el-input-number v-model="rewardForm.pointCost" :min="1" /><el-input v-model="rewardForm.description" placeholder="奖励说明（选填）" maxlength="120" /></div><el-button type="primary" @click="addReward">添加奖励</el-button></div></div>
      </template>
      <template v-else>
        <div class="record-tabs"><button :class="{ active: recordTab === 'earned' }" @click="recordTab = 'earned'">获取记录</button><button :class="{ active: recordTab === 'redemptions' }" @click="recordTab = 'redemptions'">兑换记录</button></div>
        <div v-if="recordTab === 'earned'" class="reward-box redemption-records"><h3>获取记录 <small>共 {{ center?.entries.filter((item) => item.points > 0).length || 0 }} 笔</small></h3><div class="redemption-list"><div v-for="entry in center?.entries.filter((item) => item.points > 0)" :key="`${entry.type}-${entry.createdAt}`"><div><strong>{{ entry.description }}</strong><span><b class="entry-type">{{ entry.type === 'streak_bonus' ? '连续奖励' : '完成任务' }}</b>{{ entry.createdAt }}</span></div><strong class="point-income">+{{ entry.points }} 分</strong></div><span v-if="!center?.entries.filter((item) => item.points > 0).length" class="muted">暂无积分获取记录。</span></div></div>
        <div v-else class="reward-box redemption-records"><h3>兑换记录</h3><div class="redemption-list"><div v-for="item in center?.redemptions" :key="item.id"><div><strong>{{ item.childName }} · {{ item.title }}</strong><span>{{ item.pointCost }} 分 · {{ item.requestedAt }}{{ item.note ? ` · ${item.note}` : '' }}</span></div><div v-if="item.status === 'pending'" class="row-actions"><el-button type="primary" size="small" @click="confirm(item.id, true)">确认兑换</el-button><el-button size="small" @click="confirm(item.id, false)">拒绝</el-button></div><span v-else :class="`redemption-status ${item.status}`">{{ item.status === 'approved' ? '已确认' : '已拒绝' }}</span></div><span v-if="!center?.redemptions.length" class="muted">暂无兑换申请。</span></div></div>
      </template>
    </section>
  </div>
</template>
