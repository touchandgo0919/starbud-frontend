import { createRouter, createWebHistory } from "vue-router";
import AdminLayout from "../layout/AdminLayout.vue";
import pinia from "../store";
import { useAuthStore } from "../store/auth";

const DashboardView = () => import("../views/DashboardView.vue");
const FamilyManagementView = () => import("../views/FamilyManagementView.vue");
const LoginView = () => import("../views/LoginView.vue");
const TaskManagementView = () => import("../views/TaskManagementView.vue");
const UserManagementView = () => import("../views/UserManagementView.vue");

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "Login",
      component: LoginView,
      meta: { public: true, title: "登录" }
    },
    {
      path: "/",
      component: AdminLayout,
      redirect: "/home",
      children: [
        {
          path: "home",
          name: "Home",
          component: DashboardView,
          meta: { title: "首页", description: "查看今天的任务执行情况" }
        },
        {
          path: "tasks",
          name: "Tasks",
          component: TaskManagementView,
          meta: { title: "任务管理", description: "筛选、创建与维护家庭任务" }
        },
        {
          path: "families",
          name: "Families",
          component: FamilyManagementView,
          meta: { title: "家庭管理", description: "配置家庭及家庭成员关系", familyOnly: true }
        },
        {
          path: "users",
          name: "Users",
          component: UserManagementView,
          meta: { title: "用户管理", description: "配置系统账号、角色与登录状态", adminOnly: true }
        }
      ]
    },
    { path: "/:pathMatch(.*)*", redirect: "/home" }
  ]
});

router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia);
  await auth.bootstrap();

  if (to.meta.public) {
    return auth.user ? "/home" : true;
  }
  if (!auth.user) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  if (to.meta.adminOnly && auth.user.role !== "admin") {
    return "/home";
  }
  if (to.meta.familyOnly && auth.user.role === "child") {
    return "/home";
  }
  return true;
});

export default router;
