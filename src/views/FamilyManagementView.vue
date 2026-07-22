<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import {
  addFamilyMember,
  createFamily,
  deleteFamily,
  getFamilies,
  removeFamilyMember,
  updateFamily,
  updateFamilyMember
} from "../services/api";
import { useAuthStore } from "../store/auth";
import type { Family, FamilyMember } from "../types/task";

const auth = useAuthStore();
const families = ref<Family[]>([]);
const loading = ref(false);
const createVisible = ref(false);
const memberVisible = ref(false);
const activeFamily = ref<Family | null>(null);
const familyForm = reactive({ name: "" });
const memberForm = reactive({ username: "", relationship: "" });

async function loadFamilies() {
  loading.value = true;
  try {
    families.value = await getFamilies();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "家庭数据加载失败。");
  } finally {
    loading.value = false;
  }
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
        <div><h2>家庭列表</h2><p>共 {{ families.length }} 个家庭，管理员可维护全部家庭</p></div>
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
            <el-button @click="openMember(family)">添加成员</el-button>
            <el-button @click="renameFamily(family)">重命名</el-button>
            <el-button v-if="family.canDelete" type="danger" plain @click="removeFamily(family)">删除家庭</el-button>
          </div>
        </article>
        <div v-if="!families.length && !loading" class="empty-state">暂无家庭，点击右上角创建第一个家庭。</div>
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
  </div>
</template>
