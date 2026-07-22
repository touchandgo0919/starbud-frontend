<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Hide, View } from "@element-plus/icons-vue";
import { useAuthStore } from "../store/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const error = ref("");
const showPassword = ref(false);
const form = reactive({ username: "admin", password: "" });

async function submit() {
  error.value = "";
  try {
    await auth.signIn(form.username.trim(), form.password);
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/home";
    await router.replace(redirect);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "登录失败，请检查账号和密码。";
  }
}
</script>

<template>
  <main class="login-page">
    <form class="login-card" @submit.prevent="submit">
      <div class="login-brand">
        <img class="brand-logo brand-logo--large" src="/starbud-icon.png" alt="星芽AI助手" />
        <span>星芽AI助手</span>
      </div>
      <div class="login-heading">
        <h1>欢迎回来</h1>
        <p>登录家庭任务管理后台</p>
      </div>

      <label class="field">
        <span>用户名</span>
        <el-input v-model="form.username" size="large" autocomplete="username" placeholder="请输入用户名" />
      </label>
      <label class="field">
        <span>密码</span>
        <el-input
          v-model="form.password"
          size="large"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="请输入密码"
          @keyup.enter="submit"
        >
          <template #suffix>
            <button type="button" class="input-icon-button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">
              <el-icon><Hide v-if="showPassword" /><View v-else /></el-icon>
            </button>
          </template>
        </el-input>
      </label>

      <p v-if="error" class="form-error">{{ error }}</p>
      <el-button class="login-button" type="primary" size="large" native-type="submit" :loading="auth.loading">
        登录
      </el-button>
      <p class="login-help">初始管理员：admin</p>
    </form>
  </main>
</template>
