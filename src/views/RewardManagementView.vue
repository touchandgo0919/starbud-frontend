<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { confirmRewardRedemption, createFamilyReward, getChildren, getFamilies, getRewardCenter, updateRewardSettings } from "../services/api";
import type { Child, Family, RewardCenter } from "../types/task";

const route = useRoute();
const router = useRouter();
const families = ref<Family[]>([]);
const children = ref<Child[]>([]);
const selectedFamilyId = ref("");
const selectedChildId = ref("");
const center = ref<RewardCenter | null>(null);
const loading = ref(false);
const settings = reactive({ taskPoints: 1, streakDays: 3, streakBonusPoints: 2 });
const rewardForm = reactive({ title: "", pointCost: 10, description: "" });
const activeTab = computed(() => route.path.endsWith("/records") ? "records" : "settings");

async function load() {
  loading.value = true;
  try {
    const [familyData, childData] = await Promise.all([getFamilies(), getChildren()]);
    families.value = familyData.filter((family) => family.canManage);
    children.value = childData;
    if (!selectedFamilyId.value) selectedFamilyId.value = families.value[0]?.id || "";
    if (!selectedChildId.value) selectedChildId.value = children.value[0]?.id || "";
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
  try { await updateRewardSettings(selectedFamilyId.value, settings); ElMessage.success("奖励规则已保存"); await loadCenter(); }
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

function switchTab(tab: "settings" | "records") { router.push(tab === "settings" ? "/rewards/settings" : "/rewards/records"); }
watch(selectedChildId, () => loadCenter());
onMounted(load);
</script>

<template>
  <div class="page-stack" v-loading="loading">
    <section class="content-panel reward-management">
      <div class="panel-heading"><div><h2>积分兑换</h2><p>用完成任务获得的星芽积分，兑换家长设置的生活小奖励。</p></div></div>
      <div class="reward-tabs"><button :class="{ active: activeTab === 'settings' }" @click="switchTab('settings')">奖励设置</button><button :class="{ active: activeTab === 'records' }" @click="switchTab('records')">兑换记录</button></div>
      <div class="reward-selects"><el-select v-model="selectedFamilyId" placeholder="选择家庭"><el-option v-for="family in families" :key="family.id" :label="family.name" :value="family.id" /></el-select><el-select v-model="selectedChildId" placeholder="选择儿童"><el-option v-for="child in children" :key="child.id" :label="`${child.name} 的积分`" :value="child.id" /></el-select><div class="reward-balance"><strong>{{ center?.balance || 0 }}</strong><span>星芽积分</span></div></div>

      <template v-if="activeTab === 'settings'">
        <el-form class="reward-settings" label-position="top" inline><el-form-item label="完成任务积分"><el-input-number v-model="settings.taskPoints" :min="1" :max="100" /></el-form-item><el-form-item label="连续完成天数"><el-input-number v-model="settings.streakDays" :min="2" :max="30" /></el-form-item><el-form-item label="连续奖励积分"><el-input-number v-model="settings.streakBonusPoints" :min="1" :max="500" /></el-form-item><el-button type="primary" @click="saveSettings">保存规则</el-button></el-form>
        <div class="reward-grid"><div class="reward-box"><h3>添加可兑换奖励</h3><el-input v-model="rewardForm.title" placeholder="例如：周末电影" maxlength="40" /><div class="reward-form-line"><el-input-number v-model="rewardForm.pointCost" :min="1" /><el-input v-model="rewardForm.description" placeholder="奖励说明（选填）" maxlength="120" /></div><el-button type="primary" @click="addReward">添加奖励</el-button></div><div class="reward-box"><h3>当前可兑换奖励</h3><div class="reward-list"><div v-for="reward in center?.rewards" :key="reward.id"><div><strong>{{ reward.title }}</strong><small>{{ reward.description || "家长自定义奖励" }}</small></div><span>{{ reward.pointCost }} 分</span></div><span v-if="!center?.rewards.length" class="muted">还没有设置兑换奖励。</span></div></div></div>
      </template>
      <template v-else><div class="reward-box redemption-records"><h3>兑换记录</h3><div class="redemption-list"><div v-for="item in center?.redemptions" :key="item.id"><div><strong>{{ item.childName }} · {{ item.title }}</strong><span>{{ item.pointCost }} 分 · {{ item.requestedAt }}{{ item.note ? ` · ${item.note}` : '' }}</span></div><div v-if="item.status === 'pending'" class="row-actions"><el-button type="primary" size="small" @click="confirm(item.id, true)">确认兑换</el-button><el-button size="small" @click="confirm(item.id, false)">拒绝</el-button></div><span v-else :class="`redemption-status ${item.status}`">{{ item.status === 'approved' ? '已确认' : '已拒绝' }}</span></div><span v-if="!center?.redemptions.length" class="muted">暂无兑换申请。</span></div></div></template>
    </section>
  </div>
</template>
