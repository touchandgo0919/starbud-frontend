<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ArrowRight, Check, CircleCheck, Clock, Collection, DataAnalysis, House, List, MagicStick, Refresh, Timer } from "@element-plus/icons-vue";
import { useRoute, useRouter } from "vue-router";
import { getAiHomeOverview, getChildren, getFamilies, getTasks, getTodayTasks, getUsers } from "../services/api";
import { useAuthStore } from "../store/auth";
import TaskTrendChart from "../components/TaskTrendChart.vue";
import type { AiHomeOverview, AiOverviewInsight, Child, Family, LearningIssueOverview, ManagedUser, Task } from "../types/task";

type TrendPeriod = "week" | "month";
type DashboardSection = "today" | "insights";

interface TrendPoint {
  date: string;
  label: string;
  completed: number;
  unfinished: number;
  total: number;
}

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const refreshing = ref(false);
const error = ref("");
const todayTasks = ref<Task[]>([]);
const trendTasks = ref<Task[]>([]);
const children = ref<Child[]>([]);
const families = ref<Family[]>([]);
const users = ref<ManagedUser[]>([]);
const selectedChildId = ref("");
const trendPeriod = ref<TrendPeriod>("week");
const aiOverview = ref<AiHomeOverview | null>(null);
const aiLoading = ref(false);
const aiError = ref("");
const aiPeriod = ref<7 | 28>(7);
const evidenceInsight = ref<AiOverviewInsight | null>(null);
const trialInsight = ref<AiOverviewInsight | null>(null);

const todayDate = dateKey(new Date());
const completed = computed(() => todayTasks.value.filter(isCompleted).length);
const pending = computed(() => todayTasks.value.length - completed.value);
const completionRate = computed(() => todayTasks.value.length ? Math.round((completed.value / todayTasks.value.length) * 100) : 0);
const nextTask = computed(() => todayTasks.value.find((task) => !isCompleted(task)));
const familyMemberCount = computed(() => {
  const memberIds = new Set<string>();
  families.value.forEach((family) => family.members.forEach((member) => memberIds.add(member.id)));
  return memberIds.size;
});
const trendRange = computed(() => getTrendRange(trendPeriod.value));
const periodLabel = computed(() => trendPeriod.value === "week" ? "本周" : "本月");
const trendPoints = computed<TrendPoint[]>(() => {
  const taskMap = new Map<string, Task[]>();
  trendTasks.value.forEach((task) => {
    const date = task.occurrenceDate;
    if (!date) return;
    const tasks = taskMap.get(date) || [];
    tasks.push(task);
    taskMap.set(date, tasks);
  });

  return dateKeysBetween(trendRange.value.from, trendRange.value.to).map((date) => {
    const tasks = taskMap.get(date) || [];
    const completedCount = tasks.filter(isCompleted).length;
    return {
      date,
      label: `${date.slice(5).replace("-", "/")}\n${weekdayLabel(date)}`,
      completed: completedCount,
      unfinished: tasks.length - completedCount,
      total: tasks.length
    };
  });
});
const trendTotal = computed(() => trendPoints.value.reduce((sum, item) => sum + item.total, 0));
const trendCompleted = computed(() => trendPoints.value.reduce((sum, item) => sum + item.completed, 0));
const trendUnfinished = computed(() => trendTotal.value - trendCompleted.value);
const trendCompletionRate = computed(() => trendTotal.value ? Math.round((trendCompleted.value / trendTotal.value) * 100) : 0);
const recentAiTrend = computed(() => aiOverview.value?.trend.slice(-7) || []);
const maxAiTrendTotal = computed(() => Math.max(1, ...recentAiTrend.value.map((item) => item.total)));
const confidenceLabel = computed(() => ({ high: "证据充分", medium: "证据一般", low: "数据较少" })[aiOverview.value?.confidence || "low"]);
const displayedAiSummary = computed(() => aiOverview.value?.modelAnalysis?.result.parentSummary || aiOverview.value?.summary);
const displayedAiGeneratedAt = computed(() => aiOverview.value?.modelAnalysis?.generatedAt || aiOverview.value?.generatedAt || "");
const emptyLearningIssueOverview: LearningIssueOverview = {
  status: "empty",
  analyzedReviews: 0,
  analyzingReviews: 0,
  issueCount: 0,
  summary: "本期批改记录中暂未发现可可靠归纳的问题。",
  recurring: [],
  recent: [],
  resolved: []
};
const learningIssueOverview = computed(() => aiOverview.value?.learningIssues || emptyLearningIssueOverview);
const dashboardSection = computed<DashboardSection>(() =>
  route.query.view === "insights" && auth.user?.role !== "child" ? "insights" : "today"
);

function isCompleted(task: Task) {
  // 已完成的任务再次补交照片，仍按已完成统计；本轮批改状态单独展示。
  return task.status === "completed" || task.reviewStatus === "completed" || Boolean(task.finalizedAt);
}

function childName(childId: string) {
  return children.value.find((child) => child.id === childId)?.name || "未关联成员";
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function weekdayLabel(value: string) {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][parseDateKey(value).getDay()];
}

function dateKeysBetween(from: string, to: string) {
  const keys: string[] = [];
  const end = parseDateKey(to).getTime();
  for (const cursor = parseDateKey(from); cursor.getTime() <= end; cursor.setDate(cursor.getDate() + 1)) {
    keys.push(dateKey(cursor));
  }
  return keys;
}

function getTrendRange(period: TrendPeriod) {
  const current = parseDateKey(todayDate);
  if (period === "month") {
    return {
      from: dateKey(new Date(current.getFullYear(), current.getMonth(), 1)),
      to: dateKey(new Date(current.getFullYear(), current.getMonth() + 1, 0))
    };
  }

  const sunday = new Date(current);
  sunday.setDate(current.getDate() - current.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return { from: dateKey(sunday), to: dateKey(saturday) };
}

function formatGeneratedAt(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  return match ? `${match[2]}月${match[3]}日 ${match[4]}:${match[5]}` : value;
}

function metricDisplay(value: number | null, suffix = "%") {
  return value === null ? "--" : `${value}${suffix}`;
}

function deltaText(value: number | null) {
  if (value === null) return "暂无上一周期数据";
  if (value === 0) return "与上一周期持平";
  return `较上一周期${value > 0 ? "提升" : "下降"} ${Math.abs(value)} 个百分点`;
}

function learningIssueCategoryLabel(value: string) {
  return ({
    concept: "概念理解",
    calculation: "计算",
    comprehension: "审题理解",
    method: "方法",
    expression: "表达",
    pronunciation: "发音",
    completeness: "完整度",
    other: "其他"
  } as Record<string, string>)[value] || "其他";
}

async function loadAiOverview() {
  if (auth.user?.role === "child") return;
  aiLoading.value = true;
  aiError.value = "";
  try {
    aiOverview.value = await getAiHomeOverview({
      childId: selectedChildId.value || undefined,
      days: aiPeriod.value
    });
  } catch (cause) {
    aiError.value = cause instanceof Error ? cause.message : "成长观察加载失败。";
  } finally {
    aiLoading.value = false;
  }
}

async function load(options: { preserveLoading?: boolean } = {}) {
  if (options.preserveLoading) refreshing.value = true;
  else loading.value = true;
  error.value = "";
  try {
    const aiOverviewRequest = loadAiOverview();
    const [loadedTodayTasks, loadedTrendTasks, loadedChildren, loadedFamilies, loadedUsers] = await Promise.all([
      getTodayTasks(selectedChildId.value || undefined),
      getTasks({
        childId: selectedChildId.value || undefined,
        dateFrom: trendRange.value.from,
        dateTo: trendRange.value.to
      }),
      getChildren(),
      auth.user?.role === "child" ? Promise.resolve([]) : getFamilies(),
      auth.user?.role === "admin" ? getUsers() : Promise.resolve([])
    ]);
    todayTasks.value = loadedTodayTasks;
    trendTasks.value = loadedTrendTasks;
    children.value = loadedChildren;
    families.value = loadedFamilies;
    users.value = loadedUsers;
    await aiOverviewRequest;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "总览加载失败。";
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

function updateTrendPeriod(period: TrendPeriod) {
  if (trendPeriod.value === period) return;
  trendPeriod.value = period;
  load({ preserveLoading: true });
}

function selectChild(childId: string) {
  if (selectedChildId.value === childId) return;
  selectedChildId.value = childId;
  load({ preserveLoading: true });
}

function updateAiPeriod(period: 7 | 28) {
  if (aiPeriod.value === period) return;
  aiPeriod.value = period;
  loadAiOverview();
}

function selectDashboardSection(section: DashboardSection) {
  const query = { ...route.query };
  if (section === "insights") query.view = "insights";
  else delete query.view;
  router.replace({ query });
}

onMounted(load);
</script>

<template>
  <div class="page-stack dashboard-page" v-loading="loading">
    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="dashboard-member-filter" aria-label="筛选任务成员">
      <button :class="{ 'is-active': !selectedChildId }" type="button" @click="selectChild('')">全部</button>
      <button v-for="child in children" :key="child.id" :class="{ 'is-active': selectedChildId === child.id }" type="button" @click="selectChild(child.id)">{{ child.name }}</button>
    </div>

    <template v-if="dashboardSection === 'today'">
    <section class="metric-grid" aria-label="今日任务概览">
      <article class="metric-card metric-card--primary">
        <div class="metric-icon"><el-icon><List /></el-icon></div>
        <div><span>今日任务</span><strong>{{ todayTasks.length }}</strong><small>{{ selectedChildId ? childName(selectedChildId) : "全部家庭成员" }}</small></div>
      </article>
      <article class="metric-card">
        <div class="metric-icon metric-icon--amber"><el-icon><Clock /></el-icon></div>
        <div><span>待完成</span><strong>{{ pending }}</strong><small>{{ nextTask ? `下一项 ${nextTask.scheduleTime}` : "今日已清空" }}</small></div>
      </article>
      <article class="metric-card">
        <div class="metric-icon metric-icon--green"><el-icon><Check /></el-icon></div>
        <div><span>完成率</span><strong>{{ completionRate }}%</strong><small>已完成 {{ completed }} 项</small></div>
      </article>
      <article class="metric-card">
        <div class="metric-icon metric-icon--blue"><el-icon><House /></el-icon></div>
        <div>
          <span>{{ auth.user?.role === "admin" ? "系统用户" : "家庭成员" }}</span>
          <strong>{{ auth.user?.role === "admin" ? users.length : familyMemberCount }}</strong>
          <small>{{ auth.user?.role === "admin" ? `${users.filter((user) => user.active).length} 个账号启用` : `${families.length} 个家庭` }}</small>
        </div>
      </article>
    </section>

    <section v-if="auth.user?.role !== 'child'" class="ai-compact-summary" aria-label="成长观察摘要" :aria-busy="aiLoading">
      <span class="ai-compact-icon"><el-icon><MagicStick /></el-icon></span>
      <div class="ai-compact-copy">
        <span>成长观察 · {{ aiOverview?.scope.childName || (selectedChildId ? childName(selectedChildId) : '全部家庭成员') }}</span>
        <strong v-if="aiOverview">{{ displayedAiSummary?.title }}</strong>
        <strong v-else-if="aiError">成长观察暂时无法加载</strong>
        <strong v-else>正在整理近期任务数据</strong>
        <p>{{ aiOverview?.modelAnalysis?.result.parentSummary.description || aiOverview?.insights[0]?.summary || aiOverview?.summary.description || aiError || '完成数据整理后将在这里显示最重要的一条观察。' }}</p>
      </div>
      <button type="button" class="ai-compact-action" @click="selectDashboardSection('insights')"><span>查看完整观察</span><el-icon><ArrowRight /></el-icon></button>
    </section>

    <section class="content-panel trend-panel" aria-label="任务变化趋势" :aria-busy="refreshing">
      <div class="panel-heading trend-heading">
        <div><h2>任务变化趋势</h2><p>按执行日期查看完成与未完成任务的变化</p></div>
        <div class="trend-controls">
          <div class="trend-period-switch" aria-label="统计周期">
            <button :class="{ 'is-active': trendPeriod === 'week' }" type="button" @click="updateTrendPeriod('week')">本周</button>
            <button :class="{ 'is-active': trendPeriod === 'month' }" type="button" @click="updateTrendPeriod('month')">本月</button>
          </div>
          <el-button plain :loading="refreshing" @click="load({ preserveLoading: true })"><el-icon><Refresh /></el-icon>刷新</el-button>
        </div>
      </div>

      <div class="trend-summary-grid">
        <div><span>{{ periodLabel }}任务</span><strong>{{ trendTotal }}</strong></div>
        <div><span>已完成</span><strong class="trend-number--green">{{ trendCompleted }}</strong></div>
        <div><span>未完成</span><strong class="trend-number--amber">{{ trendUnfinished }}</strong></div>
        <div><span>完成率</span><strong>{{ trendCompletionRate }}%</strong></div>
      </div>

      <div v-if="trendTotal" class="trend-chart-wrap">
        <TaskTrendChart :points="trendPoints" :period-label="periodLabel" :today-date="todayDate" />
      </div>
      <div v-else class="empty-state">{{ periodLabel }}暂无任务数据。</div>
    </section>

    <section class="content-panel">
      <div class="panel-heading">
        <div><h2>今日任务情况</h2><p>按提醒时间查看当前任务进度</p></div>
        <router-link to="/tasks" class="panel-link">查看全部 <el-icon><ArrowRight /></el-icon></router-link>
      </div>
      <div class="progress-summary">
        <div class="progress-copy"><strong>{{ completed }} / {{ todayTasks.length }}</strong><span>任务已完成</span></div>
        <el-progress :percentage="completionRate" :stroke-width="10" :show-text="false" />
      </div>
      <div v-if="todayTasks.length" class="overview-list">
        <div v-for="task in todayTasks.slice(0, 8)" :key="task.id" class="overview-row">
          <time>{{ task.scheduleTime }}</time>
          <div class="overview-copy"><strong>{{ task.title }}</strong><span>{{ childName(task.childId) }}</span></div>
          <span class="status-dot" :class="`status-dot--${isCompleted(task) ? 'completed' : 'pending'}`">{{ isCompleted(task) ? "已完成" : "待完成" }}</span>
        </div>
      </div>
      <div v-else class="empty-state">今天暂无任务，前往任务管理创建第一项任务。</div>
    </section>
    </template>

    <section v-if="dashboardSection === 'insights' && auth.user?.role !== 'child'" class="content-panel ai-observation" aria-label="AI 成长观察" :aria-busy="aiLoading">
      <div class="panel-heading ai-observation-heading">
        <div class="ai-heading-copy">
          <span class="ai-heading-icon"><el-icon><MagicStick /></el-icon></span>
          <div><h2>AI 成长观察</h2><p>从任务领取、完成与批改记录中发现值得关注的变化</p></div>
        </div>
        <div class="ai-heading-actions">
          <div class="trend-period-switch" aria-label="AI 分析周期">
            <button :class="{ 'is-active': aiPeriod === 7 }" type="button" @click="updateAiPeriod(7)">近 7 天</button>
            <button :class="{ 'is-active': aiPeriod === 28 }" type="button" @click="updateAiPeriod(28)">近 28 天</button>
          </div>
          <el-button plain :loading="aiLoading" aria-label="刷新成长观察" @click="loadAiOverview"><el-icon><Refresh /></el-icon>刷新</el-button>
        </div>
      </div>

      <p v-if="aiError" class="form-error">{{ aiError }}</p>
      <template v-else-if="aiOverview">
        <div class="ai-summary-band" :class="{ 'is-insufficient': aiOverview.dataStatus === 'insufficient' }">
          <div>
            <div class="ai-summary-meta"><span>{{ aiOverview.scope.childName }}</span><span>{{ aiOverview.period.from }} 至 {{ aiOverview.period.to }}</span><span v-if="aiOverview.modelAnalysis">每日模型分析</span></div>
            <h3>{{ displayedAiSummary?.title }}</h3>
            <p>{{ displayedAiSummary?.description }}</p>
          </div>
          <div class="ai-confidence"><strong>{{ confidenceLabel }}</strong><span>更新于 {{ formatGeneratedAt(displayedAiGeneratedAt) }}</span></div>
        </div>

        <section v-if="aiPeriod === 7" class="weekly-growth-report" aria-label="本周成长报告">
          <div class="weekly-growth-heading">
            <div><span>本周成长报告</span><strong>{{ aiOverview.scope.childName }} · {{ aiOverview.period.from.slice(5).replace('-', '月') }}日—{{ aiOverview.period.to.slice(5).replace('-', '月') }}日</strong></div>
            <small>基于任务、提交和批改记录自动生成</small>
          </div>
          <div class="weekly-growth-metrics">
            <div><span>任务完成</span><strong>{{ aiOverview.weeklyReport.completedTasks }}/{{ aiOverview.weeklyReport.totalTasks }}</strong><small>{{ aiOverview.metrics.completionRate }}% 完成率</small></div>
            <div><span>连续达成</span><strong>{{ aiOverview.weeklyReport.completionStreakDays }} 天</strong><small>按有安排任务的日期统计</small></div>
            <div><span>已批改</span><strong>{{ aiOverview.weeklyReport.reviewedTasks }} 项</strong><small>家长已给出反馈</small></div>
            <div><span>待处理</span><strong>{{ aiOverview.weeklyReport.pendingReviewTasks + aiOverview.weeklyReport.needsRevisionTasks }} 项</strong><small>{{ aiOverview.weeklyReport.pendingReviewTasks }} 项待批改 · {{ aiOverview.weeklyReport.needsRevisionTasks }} 项待修改</small></div>
          </div>
          <div class="weekly-growth-next">
            <div><span>下周建议</span><strong>一次只调整一个习惯</strong></div>
            <ul><li v-for="suggestion in aiOverview.weeklyReport.nextWeekSuggestions" :key="suggestion">{{ suggestion }}</li></ul>
          </div>
        </section>

        <div class="ai-metric-strip" aria-label="成长观察关键指标">
          <div><span>周期任务</span><strong>{{ aiOverview.metrics.totalTasks }}</strong><small>实际计划任务</small></div>
          <div><span>完成率</span><strong>{{ aiOverview.metrics.completionRate }}%</strong><small>{{ deltaText(aiOverview.metrics.completionRateDelta) }}</small></div>
          <div><span>按时完成</span><strong>{{ metricDisplay(aiOverview.metrics.onTimeRate) }}</strong><small>计划时间后 15 分钟内</small></div>
          <div><span>平均领取延迟</span><strong>{{ metricDisplay(aiOverview.metrics.averageClaimDelayMinutes, ' 分钟') }}</strong><small>仅统计已领取任务</small></div>
        </div>

        <div class="ai-observation-body">
          <div class="ai-trend-block">
            <div class="ai-subheading"><div><el-icon><DataAnalysis /></el-icon><strong>近 7 天执行节奏</strong></div><span>已完成 / 任务总数</span></div>
            <div class="ai-mini-chart" role="img" aria-label="近 7 天任务完成趋势">
              <div v-for="point in recentAiTrend" :key="point.date" class="ai-mini-column">
                <div class="ai-mini-bar-track">
                  <i class="ai-mini-bar-total" :style="{ height: `${Math.max(8, (point.total / maxAiTrendTotal) * 100)}%` }"></i>
                  <i class="ai-mini-bar-complete" :style="{ height: `${point.total ? (point.completed / maxAiTrendTotal) * 100 : 0}%` }"></i>
                </div>
                <span>{{ point.date.slice(5).replace('-', '/') }}</span>
                <small>{{ point.completed }}/{{ point.total }}</small>
              </div>
            </div>
          </div>

          <div class="ai-insight-block">
            <div class="ai-subheading"><div><el-icon><Timer /></el-icon><strong>本期观察</strong></div><span>{{ aiOverview.insights.length }} 条</span></div>
            <div v-if="aiOverview.insights.length" class="ai-insight-list">
              <article v-for="insight in aiOverview.insights" :key="insight.id" class="ai-insight-row" :class="`is-${insight.tone}`">
                <div><strong>{{ insight.title }}</strong><p>{{ insight.summary }}</p></div>
                <div class="ai-insight-actions">
                  <button v-if="insight.evidence.length" type="button" @click="evidenceInsight = insight">查看证据</button>
                  <button v-if="insight.action" type="button" @click="trialInsight = insight">查看 7 天试行草稿</button>
                </div>
              </article>
            </div>
            <div v-else class="ai-empty-observation">继续完成家庭任务，积累足够数据后会在这里生成观察。</div>
          </div>
        </div>

        <section class="learning-issue-observation" aria-label="历史问题总结">
          <div class="ai-subheading learning-issue-heading">
            <div><el-icon><Collection /></el-icon><strong>历史问题</strong></div>
            <span>根据家长已完成的批改自动整理，无需额外记录</span>
          </div>
          <div class="learning-issue-summary">
            <div>
              <span>本期总结</span>
              <p>{{ learningIssueOverview.summary }}</p>
            </div>
            <dl>
              <div><dt>已分析批改</dt><dd>{{ learningIssueOverview.analyzedReviews }}</dd></div>
              <div><dt>问题记录</dt><dd>{{ learningIssueOverview.issueCount }}</dd></div>
            </dl>
          </div>
          <p v-if="learningIssueOverview.analyzingReviews" class="learning-issue-processing">
            还有 {{ learningIssueOverview.analyzingReviews }} 次批改正在自动整理，完成后会更新到这里。
          </p>

          <div v-if="learningIssueOverview.status !== 'empty'" class="learning-issue-columns">
            <div class="learning-issue-column">
              <div class="learning-issue-column-title"><strong>反复出现</strong><span>{{ learningIssueOverview.recurring.length }} 项</span></div>
              <div v-if="learningIssueOverview.recurring.length" class="learning-topic-list">
                <article v-for="item in learningIssueOverview.recurring" :key="`${item.childName}-${item.topic}`">
                  <div><strong>{{ item.topic }}</strong><span>{{ learningIssueCategoryLabel(item.category) }} · {{ item.childName }}</span></div>
                  <b>{{ item.count }} 次</b>
                </article>
              </div>
              <div v-else class="learning-issue-empty">本期没有重复出现两次以上的问题。</div>
            </div>

            <div class="learning-issue-column">
              <div class="learning-issue-column-title"><strong>近期记录</strong><span>{{ learningIssueOverview.recent.length }} 条</span></div>
              <div v-if="learningIssueOverview.recent.length" class="learning-history-list">
                <article v-for="item in learningIssueOverview.recent" :key="`${item.reviewedAt}-${item.topic}`">
                  <div class="learning-history-title"><strong>{{ item.topic }}</strong><span v-if="item.resolved"><el-icon><CircleCheck /></el-icon>已完成订正</span></div>
                  <p>{{ item.summary }}</p>
                  <small>{{ item.taskDate }} · {{ item.taskTitle }} · {{ item.childName }}</small>
                </article>
              </div>
              <div v-else class="learning-issue-empty">本期暂无可靠的历史问题记录。</div>
            </div>
          </div>

          <div v-else class="learning-issue-empty learning-issue-empty--wide">
            家长完成图片批改或录音评价后，系统会自动整理可复核的历史问题。
          </div>
        </section>

        <p class="ai-disclaimer">成长观察用于辅助家庭安排，不评价儿童能力、态度或心理状态。第一版采用可复核的数据规则，后续模型分析仍引用同一份证据。</p>
      </template>
    </section>

    <el-dialog :model-value="Boolean(evidenceInsight)" width="min(560px, calc(100% - 28px))" title="观察证据" append-to-body @update:model-value="!$event && (evidenceInsight = null)">
      <div v-if="evidenceInsight" class="ai-evidence-dialog">
        <div class="ai-dialog-summary"><strong>{{ evidenceInsight.title }}</strong><p>{{ evidenceInsight.summary }}</p></div>
        <div class="ai-evidence-list">
          <div v-for="item in evidenceInsight.evidence" :key="`${item.taskId}-${item.occurrenceDate}`">
            <time>{{ item.occurrenceDate }}</time>
            <div><strong>{{ item.taskTitle }}</strong><span>{{ item.childName }}</span></div>
            <p>{{ item.detail }}</p>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog :model-value="Boolean(trialInsight)" width="min(520px, calc(100% - 28px))" title="7 天试行草稿" append-to-body @update:model-value="!$event && (trialInsight = null)">
      <div v-if="trialInsight?.action" class="ai-trial-dialog">
        <span class="ai-trial-badge">只改变一个变量</span>
        <h3>{{ trialInsight.action.title }}</h3>
        <p>{{ trialInsight.action.description }}</p>
        <dl>
          <div><dt>试行对象</dt><dd>{{ aiOverview?.scope.childName }}</dd></div>
          <div><dt>试行周期</dt><dd>{{ trialInsight.action.trialDays }} 天</dd></div>
          <div v-if="trialInsight.action.changeMinutes"><dt>提醒变化</dt><dd>提前 {{ Math.abs(trialInsight.action.changeMinutes) }} 分钟</dd></div>
          <div><dt>验证指标</dt><dd>领取延迟、完成率</dd></div>
        </dl>
        <div class="ai-trial-note">当前只生成建议草稿，不会自动修改任何任务。请前往任务管理确认具体任务与时间。</div>
      </div>
      <template #footer><router-link to="/tasks"><el-button type="primary">前往任务管理</el-button></router-link></template>
    </el-dialog>
  </div>
</template>
