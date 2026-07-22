<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { HomeFilled, House, List, SwitchButton, UserFilled } from "@element-plus/icons-vue";
import { useAuthStore } from "../store/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const pageTitle = computed(() => String(route.meta.title || "星芽AI助手"));
const pageDescription = computed(() => String(route.meta.description || ""));
const roleLabel = computed(() => ({ admin: "系统管理员", parent: "家长", child: "儿童" })[auth.user?.role || "parent"]);

async function logout() {
  auth.signOut();
  await router.replace("/login");
}
</script>

<template>
  <el-container class="admin-layout">
    <el-aside width="220px" class="admin-sidebar">
      <router-link to="/home" class="brand">
        <img class="brand-logo" src="/starbud-icon.png" alt="星芽AI助手" />
        <span class="brand-name">星芽AI助手</span>
      </router-link>

      <div class="menu-label">工作台</div>
      <el-menu router :default-active="route.path" class="admin-menu">
        <el-menu-item index="/home">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/tasks">
          <el-icon><List /></el-icon>
          <span>任务管理</span>
        </el-menu-item>
        <el-menu-item v-if="auth.user?.role !== 'child'" index="/families">
          <el-icon><House /></el-icon>
          <span>家庭管理</span>
        </el-menu-item>
        <el-menu-item v-if="auth.user?.role === 'admin'" index="/users">
          <el-icon><UserFilled /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
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
    </el-container>
  </el-container>
</template>
