<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Bell, DocumentChecked, HomeFilled, House, List, MagicStick, Setting, SwitchButton, UserFilled, View } from "@element-plus/icons-vue";
import { useAuthStore } from "../store/auth";
import IcpRecord from "../components/IcpRecord.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const isGrowthObservation = computed(() => route.path === "/home" && route.query.view === "insights");
const activeMenu = computed(() => isGrowthObservation.value ? "/home?view=insights" : route.path);
const pageTitle = computed(() => route.path === "/home"
  ? isGrowthObservation.value ? "成长观察" : "今日概览"
  : String(route.meta.title || "星星芽AI助手"));
const pageDescription = computed(() => route.path === "/home"
  ? isGrowthObservation.value ? "查看近期任务数据与成长变化" : "查看今天的任务执行情况"
  : String(route.meta.description || ""));
const roleLabel = computed(() => ({ admin: "系统管理员", parent: "家长", child: "儿童" })[auth.user?.role || "parent"]);
const defaultOpeneds = computed(() => {
  if (route.path === "/home" && auth.user?.role !== "child") return ["home-management"];
  if (["/tasks", "/submissions", "/reminder-records"].includes(route.path)) return ["task-management"];
  if (["/families", "/users", "/access-records"].includes(route.path)) return ["system-management"];
  return [];
});

async function logout() {
  await auth.signOut();
  await router.replace("/login");
}
</script>

<template>
  <el-container class="admin-layout">
    <el-aside width="220px" class="admin-sidebar">
      <router-link to="/home" class="brand">
        <img class="brand-logo" src="/starbud-icon.png" alt="星星芽AI助手" />
        <span class="brand-name">星星芽AI助手</span>
      </router-link>

      <div class="menu-label">工作台</div>
      <el-menu
        router
        :default-active="activeMenu"
        :default-openeds="defaultOpeneds"
        class="admin-menu"
      >
        <el-menu-item v-if="auth.user?.role === 'child'" index="/home">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-sub-menu v-else index="home-management">
          <template #title>
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </template>
          <el-menu-item index="/home">
            <el-icon><List /></el-icon>
            <span>今日概览</span>
          </el-menu-item>
          <el-menu-item index="/home?view=insights">
            <el-icon><MagicStick /></el-icon>
            <span>成长观察</span>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="task-management">
          <template #title>
            <el-icon><List /></el-icon>
            <span>任务管理</span>
          </template>
          <el-menu-item index="/tasks">
            <el-icon><List /></el-icon>
            <span>任务列表</span>
          </el-menu-item>
          <el-menu-item v-if="auth.user?.role !== 'child'" index="/reminder-records">
            <el-icon><Bell /></el-icon>
            <span>提醒记录</span>
          </el-menu-item>
          <el-menu-item v-if="auth.user?.role !== 'child'" index="/submissions">
            <el-icon><DocumentChecked /></el-icon>
            <span>提交记录</span>
          </el-menu-item>
        </el-sub-menu>
        <el-sub-menu v-if="auth.user?.role !== 'child'" index="system-management">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/families">
            <el-icon><House /></el-icon>
            <span>家庭管理</span>
          </el-menu-item>
          <el-menu-item v-if="auth.user?.role === 'admin'" index="/users">
            <el-icon><UserFilled /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item v-if="auth.user?.role === 'admin'" index="/access-records">
            <el-icon><View /></el-icon>
            <span>访问记录</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>

      <div class="sidebar-account">
        <div class="account-avatar">{{ auth.user?.displayName.slice(0, 1) }}</div>
        <div class="account-copy">
          <strong>{{ auth.user?.displayName }}</strong>
          <span>{{ roleLabel }}</span>
        </div>
        <button type="button" class="icon-button" aria-label="退出登录" title="退出登录" @click="logout">
          <el-icon><SwitchButton /></el-icon>
        </button>
      </div>
    </el-aside>

    <el-container class="admin-content">
      <el-header class="admin-header">
        <div>
          <h1>{{ pageTitle }}</h1>
          <p>{{ pageDescription }}</p>
        </div>
        <div class="header-date">
          {{ new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date()) }}
        </div>
      </el-header>

      <el-main class="admin-main">
        <RouterView />
      </el-main>
      <el-footer class="admin-footer" height="44px">
        <IcpRecord />
      </el-footer>
    </el-container>
  </el-container>
</template>
