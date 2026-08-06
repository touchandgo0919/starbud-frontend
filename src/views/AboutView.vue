<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import {
  ArrowRight,
  BellRing,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  History,
  Mic2,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Volume2,
  UsersRound
} from "@lucide/vue";
import IcpRecord from "../components/IcpRecord.vue";

const previousTitle = document.title;

onMounted(() => {
  document.title = "星星芽AI助手 - 家庭任务与习惯协作";
});

onBeforeUnmount(() => {
  document.title = previousTitle;
});

const features = [
  {
    icon: UsersRound,
    title: "家庭与成员",
    description: "家长创建家庭和子女账号，每个孩子只看到分配给自己的任务。"
  },
  {
    icon: ClipboardCheck,
    title: "任务安排",
    description: "按日期、时间和重复方式安排任务，可设置领取、提交和语音提醒。"
  },
  {
    icon: Camera,
    title: "照片与录音",
    description: "儿童可以拍照或录音提交作业，两种附件互不影响，录音最长 3 分钟。"
  },
  {
    icon: CheckCircle2,
    title: "家长批改",
    description: "家长在网页端查看照片、试听录音，给出评价或要求孩子重新提交。"
  },
  {
    icon: History,
    title: "多轮记录",
    description: "每一轮照片、录音和批改意见都会保留，进步过程清楚可追溯。"
  },
  {
    icon: BellRing,
    title: "到点提醒",
    description: "桌面 App 到点弹窗、置顶并语音播报，任务同步后断网也能按时提醒。"
  }
];

const steps = [
  { number: "01", title: "家长安排", description: "创建家庭，为孩子设置任务和提醒时间。" },
  { number: "02", title: "孩子行动", description: "在小程序领取任务，用照片或录音提交。" },
  { number: "03", title: "家长反馈", description: "查看附件并批改，需要时发起下一轮提交。" }
];
</script>

<template>
  <div class="about-page">
    <header class="about-nav">
      <a class="about-brand" href="/about" aria-label="星星芽AI助手首页">
        <img src="/starbud-icon.png" alt="" />
        <span>星星芽AI助手</span>
      </a>
      <nav aria-label="介绍页导航">
        <a href="#workflow">使用流程</a>
        <a href="#features">核心功能</a>
        <a href="#children">儿童端</a>
        <a class="about-nav-login" href="/login">家长端登录</a>
      </nav>
    </header>

    <main>
      <section class="about-hero" aria-labelledby="about-title">
        <div class="about-hero-shade" aria-hidden="true"></div>
        <div class="about-shell about-hero-content">
          <img class="about-hero-logo" src="/starbud-icon.png" alt="" />
          <p class="about-kicker">家庭任务与习惯协作</p>
          <h1 id="about-title">星星芽AI助手</h1>
          <p class="about-hero-summary">让家长把任务讲清楚，让孩子在合适的时间收到提醒、完成并提交，让每一次反馈都有记录。</p>
          <div class="about-actions">
            <a class="about-button about-button--primary" href="/login">
              进入家长端
              <ArrowRight :size="18" aria-hidden="true" />
            </a>
            <a class="about-button about-button--secondary" href="#workflow">查看使用流程</a>
          </div>
        </div>
      </section>

      <section id="workflow" class="about-workflow">
        <div class="about-shell">
          <div class="about-section-heading">
            <p>从安排到反馈</p>
            <h2>一个家庭，一条清晰的任务链</h2>
          </div>
          <ol class="about-steps">
            <li v-for="step in steps" :key="step.number">
              <span>{{ step.number }}</span>
              <div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.description }}</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section id="features" class="about-features">
        <div class="about-shell">
          <div class="about-section-heading about-section-heading--center">
            <p>核心功能</p>
            <h2>围绕家庭真实协作设计</h2>
            <span>任务、附件、批改和提醒各司其职，不让信息散落在聊天记录里。</span>
          </div>
          <div class="about-feature-grid">
            <article v-for="feature in features" :key="feature.title">
              <component :is="feature.icon" :size="24" :stroke-width="1.8" aria-hidden="true" />
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </article>
          </div>

          <div class="about-product-tour">
            <figure class="about-screen about-screen--wide">
              <img src="/screenshots/parent-dashboard.png" alt="星星芽AI助手家长端首页，展示今日任务、完成率、家庭成员和任务趋势" />
              <figcaption>
                <div><span>家长首页</span><h3>每天的进度，一眼看清</h3></div>
                <p>按家庭成员查看今日任务、完成率和一周趋势，接下来该做什么不再靠翻聊天记录。</p>
              </figcaption>
            </figure>
            <div class="about-screen-grid">
              <figure class="about-screen">
                <img src="/screenshots/task-management.png" alt="任务管理页面，展示日历、任务对象、提醒次数、附件和批改状态" />
                <figcaption>
                  <div><span>任务管理</span><h3>日期、对象、提醒与批改集中管理</h3></div>
                </figcaption>
              </figure>
              <figure class="about-screen">
                <img src="/screenshots/task-editor.png" alt="新建任务窗口，展示任务对象、执行日期、附件要求、语音和提醒次数设置" />
                <figcaption>
                  <div><span>新建任务</span><h3>把任务和提醒要求一次讲清楚</h3></div>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section id="children" class="about-child-experience">
        <div class="about-shell">
          <div class="about-section-heading">
            <p>儿童小程序</p>
            <h2>从领取任务，到提交成果</h2>
            <span>孩子只看自己的任务。日历状态、领取、附件提交和批改结果都在同一条任务记录中。</span>
          </div>
          <div class="about-child-layout">
            <figure class="about-phone-screen">
              <img src="/screenshots/miniprogram-tasks.png" alt="儿童小程序任务列表，展示日历、任务时间、领取与批改状态" />
              <figcaption><span>今日任务</span><strong>时间与状态清楚可见</strong><p>按日期查看任务，领取后进入执行流程，待批改和已完成状态一目了然。</p></figcaption>
            </figure>
            <figure class="about-phone-screen">
              <img src="/screenshots/miniprogram-submit.png" alt="儿童小程序作业提交页，展示图片、录音和备注区域" />
              <figcaption><span>附件提交</span><strong>照片或录音，任选一种</strong><p>录音由孩子点击后才开始，结束后可以试听、删除，再确认提交。</p></figcaption>
            </figure>
            <div class="about-child-points">
              <div><ClipboardCheck :size="22" /><strong>领取与完成</strong><p>任务按成员分配，避免孩子看到不属于自己的安排。</p></div>
              <div><Camera :size="22" /><strong>照片独立提交</strong><p>保留现有拍照和相册流程，与录音互不覆盖。</p></div>
              <div><Mic2 :size="22" /><strong>最长 3 分钟录音</strong><p>不自动录音；退出录音页会先确认，停止后不保留未完成录音。</p></div>
              <div><History :size="22" /><strong>多轮重新提交</strong><p>批改后可重新提交，每一轮照片、录音与评价都可追溯。</p></div>
            </div>
          </div>
        </div>
      </section>

      <section class="about-reminder-band">
        <div class="about-shell about-reminder-layout">
          <figure class="about-app-screen">
            <img src="/screenshots/app-today-reminders.png" alt="桌面 App 今日任务页，展示自动同步、提醒次数和任务领取" />
          </figure>
          <div class="about-reminder-copy">
            <p class="about-kicker">桌面 App 到点提醒</p>
            <h2>不等孩子想起来，时间到了主动提醒</h2>
            <p>App 登录儿童账号后自动同步今日任务，并在本地安排提醒。到点时系统通知、桌面窗口置顶与离线语音同时执行。</p>
            <ul>
              <li><RefreshCw :size="19" /><span><strong>实时同步</strong> 自动获取家长新增和修改的任务</span></li>
              <li><BellRing :size="19" /><span><strong>准时弹出</strong> 系统通知与窗口置顶共同提醒</span></li>
              <li><Volume2 :size="19" /><span><strong>离线语音</strong> 每项任务可设置 1 至 3 次播报</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section class="about-submission-band">
        <div class="about-shell about-submission-layout">
          <div class="about-submission-copy">
            <p class="about-kicker">家长批改与反馈</p>
            <h2>不只确认完成，还能认真听、具体评</h2>
            <p>家长可以在网页端查看照片、完整试听录音，并针对内容、表达或完成情况给出评价；需要修改时直接发起重新提交。</p>
            <ul>
              <li><Camera :size="19" aria-hidden="true" />照片和录音互不覆盖</li>
              <li><Mic2 :size="19" aria-hidden="true" />录音结束后可试听、删除</li>
              <li><History :size="19" aria-hidden="true" />重新提交仍保留历史轮次</li>
            </ul>
          </div>
          <figure class="about-review-screen">
            <img src="/screenshots/audio-review.png" alt="家长端录音评价页面，可播放孩子提交的录音并填写评价" />
            <figcaption><span>录音批改</span>试听孩子提交的语音，并留下针对内容、表达或完成情况的评价。</figcaption>
          </figure>
        </div>
      </section>

      <section class="about-platforms">
        <div class="about-shell about-platform-layout">
          <div>
            <p class="about-kicker">跨设备协作</p>
            <h2>家长管理，孩子执行，提醒始终在线</h2>
          </div>
          <div class="about-platform-list">
            <div><MonitorSmartphone :size="25" /><strong>家长网页</strong><span>创建、查看、批改</span></div>
            <div><ClipboardCheck :size="25" /><strong>儿童小程序</strong><span>领取、提交、查看反馈</span></div>
            <div><BellRing :size="25" /><strong>桌面 App</strong><span>同步、通知、离线语音</span></div>
          </div>
        </div>
      </section>

      <section class="about-trust">
        <div class="about-shell about-trust-layout">
          <ShieldCheck :size="34" :stroke-width="1.6" aria-hidden="true" />
          <div>
            <h2>只让家庭成员看到该看的内容</h2>
            <p>账号按家长和儿童角色区分，任务与提交绑定家庭成员；数据通过 HTTPS 传输，业务数据与附件分别存储。</p>
          </div>
          <a href="/legal/privacy-policy.html">查看隐私政策 <ArrowRight :size="16" /></a>
        </div>
      </section>

      <section class="about-cta">
        <div class="about-shell">
          <img src="/starbud-icon.png" alt="" />
          <h2>从今天的一件小事开始</h2>
          <p>注册家长账号，创建家庭和孩子的第一项任务。</p>
          <a class="about-button about-button--primary" href="/login">注册并使用 <ArrowRight :size="18" /></a>
        </div>
      </section>
    </main>

    <footer class="about-footer">
      <div class="about-shell">
        <div class="about-brand about-brand--footer">
          <img src="/starbud-icon.png" alt="" />
          <span>星星芽AI助手</span>
        </div>
        <div class="about-footer-links">
          <a href="/legal/user-agreement.html">用户服务协议</a>
          <a href="/legal/privacy-policy.html">隐私政策</a>
          <IcpRecord />
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.about-page {
  min-height: 100vh;
  overflow-x: hidden;
  background: #f7faf8;
  color: #173128;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
}

.about-page :deep(*) { box-sizing: border-box; }
.about-page h1, .about-page h2, .about-page h3, .about-page p { margin: 0; letter-spacing: 0; }
.about-shell { width: min(1160px, calc(100% - 48px)); margin: 0 auto; }

.about-nav {
  position: absolute;
  inset: 0 0 auto;
  z-index: 5;
  display: flex;
  height: 72px;
  padding: 0 max(24px, calc((100% - 1160px) / 2));
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, .22);
  color: #fff;
}

.about-brand { display: inline-flex; align-items: center; gap: 10px; color: inherit; font-weight: 800; text-decoration: none; }
.about-brand img { width: 34px; height: 34px; border-radius: 8px; object-fit: cover; }
.about-nav nav { display: flex; align-items: center; gap: 30px; }
.about-nav nav a { color: rgba(255, 255, 255, .84); font-size: 14px; font-weight: 650; text-decoration: none; }
.about-nav nav a:hover, .about-nav nav a:focus-visible { color: #fff; }
.about-nav .about-nav-login { padding: 9px 15px; border: 1px solid rgba(255, 255, 255, .52); border-radius: 7px; color: #fff; }

.about-hero {
  position: relative;
  display: flex;
  min-height: 680px;
  height: 78svh;
  max-height: 780px;
  align-items: center;
  overflow: hidden;
  background: #123c2e url("/screenshots/task-management.png") center / cover no-repeat;
}

.about-hero-shade { position: absolute; inset: 0; background: rgba(4, 27, 20, .73); }
.about-hero-content { position: relative; z-index: 1; padding-top: 60px; color: #fff; }
.about-hero-logo { width: 64px; height: 64px; margin-bottom: 24px; border-radius: 15px; box-shadow: 0 12px 30px rgba(0, 0, 0, .25); }
.about-kicker { color: #58dc9d; font-size: 14px; font-weight: 800; }
.about-hero h1 { margin-top: 12px; font-size: 64px; line-height: 1.08; }
.about-hero-summary { width: min(610px, 100%); margin-top: 24px !important; color: rgba(255, 255, 255, .84); font-size: 19px; line-height: 1.75; }
.about-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }
.about-button { display: inline-flex; min-height: 46px; padding: 0 20px; align-items: center; justify-content: center; gap: 8px; border-radius: 7px; font-size: 14px; font-weight: 800; text-decoration: none; }
.about-button--primary { background: #00ae67; color: #fff; }
.about-button--primary:hover, .about-button--primary:focus-visible { background: #009b5c; }
.about-button--secondary { border: 1px solid rgba(255, 255, 255, .5); color: #fff; }
.about-button--secondary:hover, .about-button--secondary:focus-visible { border-color: #fff; background: rgba(255, 255, 255, .09); }

.about-workflow { padding: 74px 0 82px; background: #fff; }
.about-section-heading > p { color: #00985c; font-size: 13px; font-weight: 800; }
.about-section-heading h2 { margin-top: 9px; color: #173128; font-size: 34px; line-height: 1.3; }
.about-section-heading > span { display: block; margin-top: 13px; color: #697a73; font-size: 15px; line-height: 1.7; }
.about-section-heading--center { text-align: center; }
.about-steps { display: grid; margin: 44px 0 0; padding: 0; grid-template-columns: repeat(3, minmax(0, 1fr)); list-style: none; }
.about-steps li { position: relative; display: grid; min-width: 0; grid-template-columns: 50px minmax(0, 1fr); gap: 18px; padding-right: 46px; }
.about-steps li:not(:last-child)::after { position: absolute; top: 24px; right: 18px; width: 22px; height: 1px; background: #a9bbb3; content: ""; }
.about-steps li > span { color: #00a562; font-size: 32px; font-weight: 300; line-height: 1; }
.about-steps h3 { color: #223b32; font-size: 17px; }
.about-steps p { margin-top: 8px; color: #72817b; font-size: 14px; line-height: 1.7; }

.about-features { padding: 90px 0; background: #edf4f0; }
.about-feature-grid { display: grid; margin-top: 44px; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.about-feature-grid article { min-height: 208px; padding: 26px; border: 1px solid #d7e3dd; border-radius: 8px; background: #fff; }
.about-feature-grid svg { color: #009b5c; }
.about-feature-grid h3 { margin-top: 25px; color: #1f382f; font-size: 17px; }
.about-feature-grid p { margin-top: 10px; color: #6a7973; font-size: 14px; line-height: 1.75; }

.about-product-tour { display: grid; margin-top: 70px; gap: 24px; }
.about-screen { overflow: hidden; margin: 0; border: 1px solid #cad8d1; border-radius: 8px; background: #fff; box-shadow: 0 18px 50px rgba(22, 63, 46, .1); }
.about-screen img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; object-position: top center; }
.about-screen figcaption { display: flex; min-height: 98px; padding: 20px 22px; align-items: center; justify-content: space-between; gap: 26px; border-top: 1px solid #dce6e1; }
.about-screen figcaption div { min-width: 0; }
.about-screen figcaption span, .about-review-screen figcaption span { display: block; color: #00985c; font-size: 11px; font-weight: 800; }
.about-screen figcaption h3 { margin-top: 5px; color: #203a30; font-size: 17px; }
.about-screen figcaption p { width: min(460px, 46%); color: #6b7b74; font-size: 13px; line-height: 1.65; }
.about-screen-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.about-screen-grid .about-screen figcaption { min-height: 92px; }

.about-child-experience { padding: 96px 0; background: #fff; }
.about-child-layout { display: grid; margin-top: 48px; grid-template-columns: 280px 280px minmax(260px, 1fr); gap: 28px; align-items: start; }
.about-phone-screen { overflow: hidden; margin: 0; border: 1px solid #d2ded8; border-radius: 8px; background: #f5f7f6; box-shadow: 0 20px 50px rgba(21, 61, 44, .12); }
.about-phone-screen img { display: block; width: 100%; aspect-ratio: 390 / 844; object-fit: cover; object-position: top; }
.about-phone-screen figcaption { min-height: 150px; padding: 18px; border-top: 1px solid #dce6e1; background: #fff; }
.about-phone-screen figcaption span { display: block; color: #00985c; font-size: 11px; font-weight: 800; }
.about-phone-screen figcaption strong { display: block; margin-top: 6px; color: #203a30; font-size: 16px; }
.about-phone-screen figcaption p { margin-top: 9px; color: #6b7b74; font-size: 13px; line-height: 1.65; }
.about-child-points { display: grid; gap: 1px; border-block: 1px solid #dce6e1; background: #dce6e1; }
.about-child-points > div { min-height: 132px; padding: 22px 4px 22px 22px; background: #fff; }
.about-child-points svg { float: left; margin-right: 13px; color: #009b5c; }
.about-child-points strong { color: #203a30; font-size: 15px; }
.about-child-points p { margin: 8px 0 0 35px; color: #6b7b74; font-size: 13px; line-height: 1.65; }

.about-reminder-band { padding: 96px 0; background: #e8f1ed; }
.about-reminder-layout { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(320px, .92fr); gap: 72px; align-items: center; }
.about-app-screen { overflow: hidden; margin: 0; border: 1px solid #cbd9d2; border-radius: 8px; background: #f7f5ef; box-shadow: 0 24px 60px rgba(21, 61, 44, .16); }
.about-app-screen img { display: block; width: 100%; aspect-ratio: 600 / 650; object-fit: cover; }
.about-reminder-copy h2 { margin-top: 10px; color: #173128; font-size: 38px; line-height: 1.3; }
.about-reminder-copy > p:not(.about-kicker) { margin-top: 20px; color: #62756d; font-size: 16px; line-height: 1.8; }
.about-reminder-copy ul { display: grid; margin: 28px 0 0; padding: 0; gap: 18px; list-style: none; }
.about-reminder-copy li { display: flex; align-items: flex-start; gap: 12px; color: #50675e; font-size: 14px; line-height: 1.6; }
.about-reminder-copy li svg { flex: 0 0 auto; margin-top: 2px; color: #009b5c; }
.about-reminder-copy li strong { display: block; color: #203a30; }

.about-submission-band { padding: 96px 0; background: #103d31; color: #fff; }
.about-submission-layout { display: grid; grid-template-columns: minmax(320px, .72fr) minmax(0, 1.28fr); gap: 70px; align-items: center; }
.about-submission-copy h2, .about-platforms h2 { margin-top: 10px; font-size: 38px; line-height: 1.28; }
.about-submission-copy > p:not(.about-kicker) { margin-top: 22px; color: #b7cdc4; font-size: 16px; line-height: 1.8; }
.about-submission-copy ul { display: grid; margin: 28px 0 0; padding: 0; gap: 13px; list-style: none; }
.about-submission-copy li { display: flex; align-items: center; gap: 10px; color: #dcebe5; font-size: 14px; }
.about-submission-copy li svg { color: #56dea0; }

.about-review-screen { overflow: hidden; margin: 0; border: 1px solid rgba(101, 213, 160, .38); border-radius: 8px; background: #182a24; box-shadow: 0 28px 70px rgba(0, 0, 0, .3); }
.about-review-screen img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; object-position: center; }
.about-review-screen figcaption { padding: 16px 18px; color: #bcd1c8; font-size: 12px; line-height: 1.65; }
.about-review-screen figcaption span { margin-bottom: 4px; color: #5de2a5; }

.about-platforms { padding: 86px 0; background: #fff; }
.about-platform-layout { display: grid; grid-template-columns: .85fr 1.4fr; gap: 90px; align-items: center; }
.about-platform-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-block: 1px solid #dbe5e0; }
.about-platform-list > div { display: grid; min-width: 0; padding: 27px 20px; gap: 8px; border-right: 1px solid #dbe5e0; }
.about-platform-list > div:last-child { border-right: 0; }
.about-platform-list svg { color: #009b5c; }
.about-platform-list strong { margin-top: 8px; color: #243c33; font-size: 14px; }
.about-platform-list span { color: #76837e; font-size: 12px; line-height: 1.6; }

.about-trust { padding: 42px 0; background: #dcece4; }
.about-trust-layout { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 22px; align-items: center; }
.about-trust-layout > svg { color: #087c50; }
.about-trust h2 { color: #173b2d; font-size: 20px; }
.about-trust p { margin-top: 6px; color: #5c756a; font-size: 13px; line-height: 1.65; }
.about-trust a { display: inline-flex; align-items: center; gap: 6px; color: #087c50; font-size: 13px; font-weight: 800; text-decoration: none; }

.about-cta { padding: 94px 0; background: #f7faf8; text-align: center; }
.about-cta img { width: 58px; height: 58px; border-radius: 14px; }
.about-cta h2 { margin-top: 22px; color: #173128; font-size: 34px; }
.about-cta p { margin-top: 12px; color: #6f7e78; font-size: 15px; }
.about-cta .about-button { margin-top: 28px; }

.about-footer { padding: 25px 0; border-top: 1px solid #dce5e0; background: #fff; }
.about-footer > div { display: flex; align-items: center; justify-content: space-between; }
.about-brand--footer { color: #244037; font-size: 14px; }
.about-brand--footer img { width: 28px; height: 28px; }
.about-footer-links { display: flex; align-items: center; gap: 22px; }
.about-footer-links a { color: #74817c; font-size: 12px; text-decoration: none; }
.about-footer-links a:hover { color: #087c50; }

@media (max-width: 900px) {
  .about-hero h1 { font-size: 52px; }
  .about-feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .about-screen figcaption { align-items: flex-start; flex-direction: column; gap: 8px; }
  .about-screen figcaption p { width: 100%; }
  .about-child-layout { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .about-child-points { grid-column: 1 / -1; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .about-reminder-layout { gap: 48px; }
  .about-submission-layout { gap: 54px; }
  .about-platform-layout { grid-template-columns: 1fr; gap: 34px; }
}

@media (max-width: 680px) {
  .about-shell { width: min(100% - 32px, 560px); }
  .about-nav { height: 64px; padding: 0 16px; }
  .about-nav nav { gap: 8px; }
  .about-nav nav > a:not(.about-nav-login) { display: none; }
  .about-brand { font-size: 14px; }
  .about-brand img { width: 30px; height: 30px; }
  .about-nav .about-nav-login { padding: 8px 11px; font-size: 12px; }
  .about-hero { min-height: 570px; height: 76svh; background-position: 38% center; }
  .about-hero-shade { background: rgba(4, 27, 20, .79); }
  .about-hero-content { padding-top: 48px; }
  .about-hero-logo { width: 52px; height: 52px; margin-bottom: 20px; }
  .about-hero h1 { font-size: 42px; }
  .about-hero-summary { margin-top: 18px !important; font-size: 16px; line-height: 1.7; }
  .about-actions { margin-top: 26px; }
  .about-button { min-height: 44px; padding: 0 16px; }
  .about-workflow, .about-features, .about-child-experience, .about-reminder-band, .about-platforms { padding: 64px 0; }
  .about-section-heading h2, .about-cta h2 { font-size: 28px; }
  .about-steps { grid-template-columns: 1fr; gap: 28px; }
  .about-steps li { padding-right: 0; }
  .about-steps li::after { display: none; }
  .about-feature-grid { grid-template-columns: 1fr; }
  .about-feature-grid article { min-height: 0; }
  .about-product-tour { margin-top: 48px; }
  .about-screen-grid { grid-template-columns: 1fr; }
  .about-screen figcaption { min-height: 0; padding: 16px; }
  .about-screen figcaption h3 { font-size: 15px; }
  .about-child-layout { grid-template-columns: 1fr; gap: 24px; }
  .about-phone-screen { width: min(100%, 350px); margin: 0 auto; }
  .about-child-points { grid-column: auto; grid-template-columns: 1fr; }
  .about-child-points > div { min-height: 0; padding-right: 18px; }
  .about-reminder-layout { grid-template-columns: 1fr; gap: 38px; }
  .about-reminder-copy h2 { font-size: 30px; }
  .about-submission-band { padding: 68px 0; }
  .about-submission-layout { grid-template-columns: 1fr; gap: 44px; }
  .about-submission-copy h2, .about-platforms h2 { font-size: 30px; }
  .about-review-screen { width: 100%; }
  .about-platform-list { grid-template-columns: 1fr; border-block: 0; }
  .about-platform-list > div { grid-template-columns: auto minmax(0, 1fr); align-items: center; border-right: 0; border-bottom: 1px solid #dbe5e0; }
  .about-platform-list > div:last-child { border-bottom: 0; }
  .about-platform-list strong { margin: 0; }
  .about-platform-list span { grid-column: 2; }
  .about-trust-layout { grid-template-columns: auto minmax(0, 1fr); }
  .about-trust a { grid-column: 2; }
  .about-cta { padding: 70px 0; }
  .about-footer > div { flex-direction: column; gap: 18px; }
  .about-footer-links { flex-wrap: wrap; justify-content: center; gap: 10px 18px; }
}
</style>
