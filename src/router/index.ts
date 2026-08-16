import { createRouter, createWebHistory } from "vue-router";
import AdminLayout from "../layout/AdminLayout.vue";
import pinia from "../store";
import { useAuthStore } from "../store/auth";

const DashboardView = () => import("../views/DashboardView.vue");
const FamilyManagementView = () => import("../views/FamilyManagementView.vue");
const LoginView = () => import("../views/LoginView.vue");
const TaskManagementView = () => import("../views/TaskManagementView.vue");
const SubmissionManagementView = () => import("../views/SubmissionManagementView.vue");
const UserManagementView = () => import("../views/UserManagementView.vue");
const AccessRecordsView = () => import("../views/AccessRecordsView.vue");
const ReminderRecordsView = () => import("../views/ReminderRecordsView.vue");
const AboutView = () => import("../views/AboutView.vue");
const AiDesignView = () => import("../views/AiDesignView.vue");
const RewardManagementView = () => import("../views/RewardManagementView.vue");

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "Login",
      component: LoginView,
      meta: { guestOnly: true, title: "登录" }
    },
    {
      path: "/about",
      name: "About",
      component: AboutView,
      meta: { public: true, title: "产品介绍" }
    },
    {
      path: "/ai",
      name: "AiDesign",
      component: AiDesignView,
      meta: { public: true, title: "AI 产品与系统设计" }
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
          meta: { title: "首页", description: "查看今日任务与成长观察" }
        },
        {
          path: "tasks",
          name: "Tasks",
          component: TaskManagementView,
          meta: { title: "任务管理", description: "筛选、创建与维护家庭任务" }
        },
        {
          path: "submissions",
          name: "Submissions",
          component: SubmissionManagementView,
          meta: { title: "提交管理", description: "查看并清理孩子提交的作业", familyOnly: true }
        },
        {
          path: "reminder-records",
          name: "ReminderRecords",
          component: ReminderRecordsView,
          meta: { title: "提醒记录", description: "监控提醒推送、接收与播放结果", familyOnly: true }
        },
        {
          path: "families",
          name: "Families",
          component: FamilyManagementView,
          meta: { title: "家庭管理", description: "配置家庭及家庭成员关系", familyOnly: true }
        },
        {
          path: "rewards/:tab(settings|records)?",
          name: "Rewards",
          component: RewardManagementView,
          meta: { title: "积分兑换", description: "设置奖励并查看儿童的积分记录", familyOnly: true }
        },
        {
          path: "users",
          name: "Users",
          component: UserManagementView,
          meta: { title: "用户管理", description: "配置系统账号、角色与登录状态", adminOnly: true }
        },
        {
          path: "access-records",
          name: "AccessRecords",
          component: AccessRecordsView,
          meta: { title: "访问记录", description: "查看网页、小程序和 App 的关键操作记录", adminOnly: true }
        }
      ]
    },
    { path: "/:pathMatch(.*)*", redirect: "/home" }
  ]
});

router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia);
  if (to.meta.public) {
    return true;
  }
  await auth.bootstrap();

  if (to.meta.guestOnly) {
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
