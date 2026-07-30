<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { Plus, Refresh, Search } from "@element-plus/icons-vue";
import { createUser, getUsers, updateUser } from "../services/api";
import { useAuthStore } from "../store/auth";
import type { ManagedUser, SaveUserPayload, User } from "../types/task";

const auth = useAuthStore();
const users = ref<ManagedUser[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref("");
const keyword = ref("");
const roleFilter = ref("");
const statusFilter = ref("");
const form = reactive<SaveUserPayload>({ username: "", displayName: "", role: "parent", active: true, password: "" });
const roleLabels: Record<User["role"], string> = { admin: "系统管理员", parent: "家长", child: "儿童" };

const filteredUsers = computed(() => {
  const search = keyword.value.trim().toLocaleLowerCase();
  return users.value.filter((user) => {
    const matchesKeyword = !search || `${user.username} ${user.displayName}`.toLocaleLowerCase().includes(search);
    const matchesRole = !roleFilter.value || user.role === roleFilter.value;
    const matchesStatus = !statusFilter.value || String(user.active) === statusFilter.value;
    return matchesKeyword && matchesRole && matchesStatus;
  });
});

async function loadUsers() {
  loading.value = true;
  try {
    users.value = await getUsers();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "用户加载失败。");
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = "";
  Object.assign(form, { username: "", displayName: "", role: "parent", active: true, password: "" });
  dialogVisible.value = true;
}

function openEdit(user: ManagedUser) {
  editingId.value = user.id;
  Object.assign(form, { username: user.username, displayName: user.displayName, role: user.role, active: user.active, password: "" });
  dialogVisible.value = true;
}

async function submitUser() {
  if (!form.username.trim() || !form.displayName.trim() || (!editingId.value && !form.password)) return;
  saving.value = true;
  try {
    const payload = { ...form, username: form.username.trim(), displayName: form.displayName.trim(), password: form.password?.trim() || undefined };
    if (editingId.value) await updateUser(editingId.value, payload);
    else await createUser(payload);
    dialogVisible.value = false;
    ElMessage.success(editingId.value ? "用户配置已更新" : "用户已创建");
    await loadUsers();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "用户保存失败。");
  } finally {
    saving.value = false;
  }
}

async function toggleUser(user: ManagedUser) {
  try {
    await updateUser(user.id, { active: !user.active });
    ElMessage.success(user.active ? "用户已停用" : "用户已启用");
    await loadUsers();
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : "用户状态更新失败。");
  }
}

function resetFilters() {
  keyword.value = "";
  roleFilter.value = "";
  statusFilter.value = "";
}

onMounted(loadUsers);
</script>

<template>
  <div class="page-stack">
    <section class="content-panel filter-panel">
      <div class="user-filter-grid">
        <label class="field"><span>关键词</span><el-input v-model="keyword" :prefix-icon="Search" clearable placeholder="用户名或显示名称" /></label>
        <label class="field"><span>角色</span><el-select v-model="roleFilter" clearable placeholder="全部角色"><el-option v-for="(label, value) in roleLabels" :key="value" :label="label" :value="value" /></el-select></label>
        <label class="field"><span>状态</span><el-select v-model="statusFilter" clearable placeholder="全部状态"><el-option label="已启用" value="true" /><el-option label="已停用" value="false" /></el-select></label>
        <div class="filter-actions"><el-button :icon="Refresh" @click="resetFilters">重置</el-button></div>
      </div>
    </section>

    <section class="content-panel table-panel">
      <div class="panel-heading">
        <div><h2>用户列表</h2><p>共 {{ filteredUsers.length }} 位用户</p></div>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建用户</el-button>
      </div>
      <el-table v-loading="loading" :data="filteredUsers" class="data-table desktop-table" empty-text="没有符合条件的用户">
        <el-table-column label="用户" min-width="220"><template #default="scope"><div class="table-user"><div class="member-avatar">{{ scope.row.displayName.slice(0, 1) }}</div><div><strong>{{ scope.row.displayName }}</strong><span>@{{ scope.row.username }}</span></div></div></template></el-table-column>
        <el-table-column label="角色" width="140"><template #default="scope"><span class="role-tag" :class="`role-tag--${scope.row.role}`">{{ roleLabels[scope.row.role as User['role']] }}</span></template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="scope"><span class="status-dot" :class="scope.row.active ? 'status-dot--completed' : 'status-dot--disabled'">{{ scope.row.active ? "已启用" : "已停用" }}</span></template></el-table-column>
        <el-table-column label="创建时间" width="180"><template #default="scope">{{ scope.row.createdAt || "—" }}</template></el-table-column>
        <el-table-column label="操作" width="160" fixed="right"><template #default="scope"><el-button link type="primary" @click="openEdit(scope.row)">编辑</el-button><el-button link :type="scope.row.active ? 'danger' : 'success'" :disabled="scope.row.id === auth.user?.id" @click="toggleUser(scope.row)">{{ scope.row.active ? "停用" : "启用" }}</el-button></template></el-table-column>
      </el-table>
      <div v-loading="loading" class="mobile-data-list">
        <article v-for="user in filteredUsers" :key="user.id" class="mobile-data-card mobile-user-card">
          <div class="table-user"><div class="member-avatar">{{ user.displayName.slice(0, 1) }}</div><div><strong>{{ user.displayName }}</strong><span>@{{ user.username }}</span></div></div>
          <div class="mobile-user-meta"><span class="role-tag" :class="`role-tag--${user.role}`">{{ roleLabels[user.role] }}</span><span class="status-dot" :class="user.active ? 'status-dot--completed' : 'status-dot--disabled'">{{ user.active ? "已启用" : "已停用" }}</span></div>
          <div class="mobile-card-actions"><el-button link type="primary" @click="openEdit(user)">编辑</el-button><el-button link :type="user.active ? 'danger' : 'success'" :disabled="user.id === auth.user?.id" @click="toggleUser(user)">{{ user.active ? "停用" : "启用" }}</el-button></div>
        </article>
        <div v-if="!filteredUsers.length && !loading" class="empty-state">没有符合条件的用户</div>
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑用户' : '新建用户'" width="520px">
      <el-form label-position="top">
        <div class="dialog-form-row">
          <el-form-item label="用户名" required><el-input v-model="form.username" maxlength="40" autocomplete="off" placeholder="请输入登录用户名" /></el-form-item>
          <el-form-item label="显示名称" required><el-input v-model="form.displayName" maxlength="40" placeholder="请输入用户姓名" /></el-form-item>
        </div>
        <div class="dialog-form-row">
          <el-form-item label="角色" required><el-select v-model="form.role"><el-option v-for="(label, value) in roleLabels" :key="value" :label="label" :value="value" /></el-select></el-form-item>
          <el-form-item label="账号状态"><el-switch v-model="form.active" active-text="启用" inactive-text="停用" :disabled="editingId === auth.user?.id" /></el-form-item>
        </div>
        <el-form-item :label="editingId ? '重置密码（选填）' : '初始密码'" :required="!editingId"><el-input v-model="form.password" type="password" show-password autocomplete="new-password" placeholder="至少 6 个字符" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitUser">保存用户</el-button></template>
    </el-dialog>
  </div>
</template>
