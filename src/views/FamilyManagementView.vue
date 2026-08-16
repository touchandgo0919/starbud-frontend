<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import {
  addFamilyMember,
  createFamilyChild,
  createFamily,
  deleteFamily,
  getFamilies,
  getChildren,
  getRewardCenter,
  removeFamilyMember,
  updateFamily,
  updateFamilyMember,
  updateRewardSettings,
  createFamilyReward,
  confirmRewardRedemption
} from "../services/api";
import { useAuthStore } from "../store/auth";
import type { Child, Family, FamilyMember, RewardCenter } from "../types/task";

const auth = useAuthStore();
const families = ref<Family[]>([]);
const children = ref<Child[]>([]);
const loading = ref(false);
const createVisible = ref(false);
const memberVisible = ref(false);
const childVisible = ref(false);
const activeFamily = ref<Family | null>(null);
const familyForm = reactive({ name: "" });
const memberForm = reactive({ username: "", relationship: "" });
const childForm = reactive({ username: "", displayName: "", password: "", relationship: "孩子" });
const rewardCenter = ref<RewardCenter | null>(null);
const rewardFamilyId = ref("");
const rewardChildId = ref("");
const rewardForm = reactive({ title: "", pointCost: 10, description: "" });
const rewardSettings = reactive({ taskPoints: 1, streakDays: 3, streakBonusPoints: 2 });

async function loadFamilies() {
  loading.value = true;
  try {
    const [familyData, childData] = await Promise.all([getFamilies(), getChildren()]);
    families.value = familyData;
    children.value = childData;
    const family = families.value.find((item) => item.canManage);
    const childMember = family?.members.find((member) => member.role === "child");
    const child = children.value.find((item) => item.name === childMember?.displayName);
    if (family && child) {
      rewardFamilyId.value = family.id;
      rewardChildId.value = child.id;
      await loadRewards();
    }
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "家庭数据加载失败。");
  } finally {
    loading.value = false;
  }
}

async function loadRewards() {
  if (!rewardChildId.value) return;
  try {
    rewardCenter.value = await getRewardCenter(rewardChildId.value);
    Object.assign(rewardSettings, rewardCenter.value.settings);
  } catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : "奖励数据加载失败。"); }
}

async function saveRewardSettings() {
  try { await updateRewardSettings(rewardFamilyId.value, rewardSettings); ElMessage.success("积分规则已保存"); await loadRewards(); }
  catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : "保存失败。"); }
}

async function addReward() {
  try { await createFamilyReward(rewardFamilyId.value, rewardForm); Object.assign(rewardForm, { title: "", pointCost: 10, description: "" }); ElMessage.success("兑换奖励已添加"); await loadRewards(); }
  catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : "添加失败。"); }
}

async function handleRedemption(id: string, approved: boolean) {
  try { await confirmRewardRedemption(id, approved); ElMessage.success(approved ? "已确认兑换，积分已扣除" : "已拒绝兑换申请"); await loadRewards(); }
  catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : "处理失败。"); }
}

async function submitFamily() {
  if (!familyForm.name.trim()) return;
  try {
    await createFamily(familyForm.name.trim());
    familyForm.name = "";
    createVisible.value = false;
    ElMessage.success("家庭已创建");
    await loadFamilies();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "家庭创建失败。");
  }
}

async function renameFamily(family: Family) {
  try {
    const { value } = await ElMessageBox.prompt("请输入新的家庭名称", "重命名家庭", { inputValue: family.name, inputPattern: /\S+/, inputErrorMessage: "家庭名称不能为空", confirmButtonText: "保存", cancelButtonText: "取消" });
    await updateFamily(family.id, value.trim());
    ElMessage.success("家庭名称已更新");
    await loadFamilies();
  } catch (cause) {
    if (cause !== "cancel" && cause !== "close") ElMessage.error(cause instanceof Error ? cause.message : "家庭更新失败。");
  }
}

function openMember(family: Family) {
  activeFamily.value = family;
  Object.assign(memberForm, { username: "", relationship: "" });
  memberVisible.value = true;
}

function openChild(family: Family) {
  activeFamily.value = family;
  Object.assign(childForm, { username: "", displayName: "", password: "", relationship: "孩子" });
  childVisible.value = true;
}

async function submitMember() {
  if (!activeFamily.value || !memberForm.username.trim()) return;
  try {
    await addFamilyMember(activeFamily.value.id, memberForm.username.trim(), memberForm.relationship.trim());
    memberVisible.value = false;
    ElMessage.success("家庭成员已添加");
    await loadFamilies();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "成员添加失败。");
  }
}

async function submitChild() {
  if (!activeFamily.value || !childForm.username.trim() || !childForm.displayName.trim() || !childForm.password) return;
  try {
    await createFamilyChild(activeFamily.value.id, {
      username: childForm.username.trim(),
      displayName: childForm.displayName.trim(),
      password: childForm.password,
      relationship: childForm.relationship.trim() || "孩子"
    });
    childVisible.value = false;
    ElMessage.success("子女账号已创建");
    await loadFamilies();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "子女创建失败。");
  }
}

async function editRelationship(family: Family, member: FamilyMember) {
  try {
    const { value } = await ElMessageBox.prompt("请输入家庭关系称谓", "修改成员关系", { inputValue: member.relationship, inputPattern: /\S+/, inputErrorMessage: "关系称谓不能为空", confirmButtonText: "保存", cancelButtonText: "取消" });
    await updateFamilyMember(family.id, member.id, value.trim());
    ElMessage.success("成员关系已更新");
    await loadFamilies();
  } catch (cause) {
    if (cause !== "cancel" && cause !== "close") ElMessage.error(cause instanceof Error ? cause.message : "成员关系更新失败。");
  }
}

async function removeMember(family: Family, member: FamilyMember) {
  try {
    await ElMessageBox.confirm(`确定将“${member.displayName}”移出“${family.name}”吗？`, "移除成员", { type: "warning", confirmButtonText: "确认移除", cancelButtonText: "取消" });
    await removeFamilyMember(family.id, member.id);
    ElMessage.success("成员已移除");
    await loadFamilies();
  } catch (cause) {
    if (cause !== "cancel" && cause !== "close") ElMessage.error(cause instanceof Error ? cause.message : "成员移除失败。");
  }
}

async function removeFamily(family: Family) {
  try {
    await ElMessageBox.confirm(`确定删除家庭“${family.name}”吗？`, "删除家庭", { type: "warning", confirmButtonText: "确认删除", cancelButtonText: "取消" });
    await deleteFamily(family.id);
    ElMessage.success("家庭已删除");
    await loadFamilies();
  } catch (cause) {
    if (cause !== "cancel" && cause !== "close") ElMessage.error(cause instanceof Error ? cause.message : "家庭删除失败。");
  }
}

onMounted(loadFamilies);
</script>

<template>
  <div class="page-stack">
    <section class="content-panel">
      <div class="panel-heading">
        <div>
          <h2>家庭列表</h2>
          <p>共 {{ families.length }} 个家庭，{{ auth.user?.role === "admin" ? "管理员可维护全部家庭" : "可维护已加入的家庭" }}</p>
        </div>
        <el-button type="primary" :icon="Plus" @click="createVisible = true">新建家庭</el-button>
      </div>

      <div v-loading="loading" class="family-grid">
        <article v-for="family in families" :key="family.id" class="family-card">
          <div class="family-card-head">
            <div><h3>{{ family.name }}</h3><p>{{ family.members.length }} 位家庭成员</p></div>
            <span v-if="family.isOwner" class="quiet-tag">我创建的</span>
          </div>
          <div class="member-stack">
            <div v-for="member in family.members" :key="member.id" class="member-line">
              <div class="member-avatar">{{ member.displayName.slice(0, 1) }}</div>
              <div class="member-copy"><strong>{{ member.displayName }}</strong><span>@{{ member.username }} · {{ member.relationship }}</span></div>
              <div v-if="family.canManage" class="row-actions">
                <el-button link type="primary" @click="editRelationship(family, member)">修改</el-button>
                <el-button v-if="!member.isOwner && member.id !== auth.user?.id" link type="danger" @click="removeMember(family, member)">移除</el-button>
              </div>
            </div>
          </div>
          <div v-if="family.canManage" class="family-card-actions">
            <el-button type="primary" plain @click="openChild(family)">创建子女</el-button>
            <el-button @click="openMember(family)">添加成员</el-button>
            <el-button @click="renameFamily(family)">重命名</el-button>
            <el-button v-if="family.canDelete" type="danger" plain @click="removeFamily(family)">删除家庭</el-button>
          </div>
        </article>
        <div v-if="!families.length && !loading" class="empty-state">暂无家庭，点击右上角创建第一个家庭。</div>
      </div>
    </section>

    <section v-if="families.some((family) => family.canManage)" class="content-panel reward-panel">
      <div class="panel-heading"><div><h2>星芽奖励</h2><p>任务完成自动积累积分；连续完成额外奖励，兑换由家长确认。</p></div></div>
      <el-select v-if="children.length > 1" v-model="rewardChildId" class="reward-child-select" @change="loadRewards">
        <el-option v-for="child in children" :key="child.id" :label="`${child.name} 的积分`" :value="child.id" />
      </el-select>
      <el-form class="reward-settings" label-position="top" inline>
        <el-form-item label="完成任务积分"><el-input-number v-model="rewardSettings.taskPoints" :min="1" :max="100" /></el-form-item>
        <el-form-item label="连续完成天数"><el-input-number v-model="rewardSettings.streakDays" :min="2" :max="30" /></el-form-item>
        <el-form-item label="连续奖励积分"><el-input-number v-model="rewardSettings.streakBonusPoints" :min="1" :max="500" /></el-form-item>
        <el-button type="primary" @click="saveRewardSettings">保存规则</el-button>
      </el-form>
      <div class="reward-grid">
        <div class="reward-box">
          <h3>添加可兑换奖励</h3>
          <el-input v-model="rewardForm.title" placeholder="例如：周末电影" maxlength="40" />
          <div class="reward-form-line"><el-input-number v-model="rewardForm.pointCost" :min="1" /><el-input v-model="rewardForm.description" placeholder="例如：周六晚一起看电影" maxlength="120" /></div>
          <el-button type="primary" @click="addReward">添加奖励</el-button>
          <div class="reward-list"><div v-for="reward in rewardCenter?.rewards" :key="reward.id"><div><strong>{{ reward.title }}</strong><small>{{ reward.description || "家长自定义奖励" }}</small></div><span>{{ reward.pointCost }} 星芽积分</span></div><span v-if="!rewardCenter?.rewards.length" class="muted">还没有设置兑换奖励。</span></div>
        </div>
        <div class="reward-box">
          <h3>孩子积分与兑换申请</h3><div class="reward-balance"><strong>{{ rewardCenter?.balance || 0 }}</strong><span>当前星芽积分</span></div>
          <div class="redemption-list"><div v-for="item in rewardCenter?.redemptions" :key="item.id"><div><strong>{{ item.childName }} · {{ item.title }}</strong><span>{{ item.pointCost }} 分 · {{ item.status === "pending" ? "等待家长确认" : item.status === "approved" ? "已确认兑换" : "已拒绝" }}</span></div><div v-if="item.status === 'pending'" class="row-actions"><el-button type="primary" size="small" @click="handleRedemption(item.id, true)">确认兑换</el-button><el-button size="small" @click="handleRedemption(item.id, false)">拒绝</el-button></div></div><span v-if="!rewardCenter?.redemptions.length" class="muted">暂无兑换申请。</span></div>
        </div>
      </div>
    </section>

    <el-dialog v-model="createVisible" title="新建家庭" width="440px">
      <el-form label-position="top"><el-form-item label="家庭名称" required><el-input v-model="familyForm.name" maxlength="30" placeholder="例如：赵家" @keyup.enter="submitFamily" /></el-form-item></el-form>
      <template #footer><el-button @click="createVisible = false">取消</el-button><el-button type="primary" @click="submitFamily">创建家庭</el-button></template>
    </el-dialog>

    <el-dialog v-model="memberVisible" title="添加家庭成员" width="480px">
      <el-form label-position="top">
        <el-form-item label="成员用户名" required><el-input v-model="memberForm.username" placeholder="请输入已创建的用户名" /></el-form-item>
        <el-form-item label="家庭关系"><el-input v-model="memberForm.relationship" maxlength="20" placeholder="例如：妈妈、孩子" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="memberVisible = false">取消</el-button><el-button type="primary" @click="submitMember">添加成员</el-button></template>
    </el-dialog>

    <el-dialog v-model="childVisible" title="创建子女账号" width="520px">
      <el-form label-position="top">
        <el-form-item label="子女用户名" required>
          <el-input v-model="childForm.username" placeholder="用于儿童端登录，例如：child01" />
        </el-form-item>
        <el-form-item label="子女姓名" required>
          <el-input v-model="childForm.displayName" maxlength="40" placeholder="例如：赵佑宁" />
        </el-form-item>
        <el-form-item label="初始密码" required>
          <el-input v-model="childForm.password" type="password" show-password placeholder="至少 6 个字符" />
        </el-form-item>
        <el-form-item label="家庭关系">
          <el-input v-model="childForm.relationship" maxlength="20" placeholder="例如：孩子、女儿、儿子" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="childVisible = false">取消</el-button>
        <el-button type="primary" @click="submitChild">创建子女</el-button>
      </template>
    </el-dialog>
  </div>
</template>
