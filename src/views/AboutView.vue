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
  ShieldCheck,
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
        </div>
      </section>

      <section class="about-submission-band">
        <div class="about-shell about-submission-layout">
          <div class="about-submission-copy">
            <p class="about-kicker">提交不只有一种方式</p>
            <h2>拍下来，或者说出来</h2>
            <p>书面作业适合照片，阅读、背诵和口语练习适合录音。孩子任选一种附件即可提交，家长在网页端直接查看和评价。</p>
            <ul>
              <li><Camera :size="19" aria-hidden="true" />照片和录音互不覆盖</li>
              <li><Mic2 :size="19" aria-hidden="true" />录音结束后可试听、删除</li>
              <li><History :size="19" aria-hidden="true" />重新提交仍保留历史轮次</li>
            </ul>
          </div>
          <div class="about-phone" aria-label="儿童端作业提交界面示意">
            <div class="about-phone-bar"><span></span><strong>提交作业</strong><span>•••</span></div>
            <div class="about-task-mini">
              <i>读</i>
              <div><strong>英语课文朗读</strong><span>提醒时间 19:30</span></div>
            </div>
            <p class="about-phone-hint">图片和录音至少提交一项，录音最多 3 分钟</p>
            <div class="about-upload-mini"><Camera :size="22" /><span>拍照 / 相册</span></div>
            <div class="about-record-mini"><Mic2 :size="21" /><span>点击开始录音</span><button aria-label="开始录音">开始</button></div>
            <div class="about-note-mini">补充说明（选填）</div>
            <div class="about-submit-mini">提交作业</div>
          </div>
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
  background: #123c2e url("/starbud-product-overview.png") center / cover no-repeat;
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

.about-submission-band { padding: 96px 0; background: #103d31; color: #fff; }
.about-submission-layout { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 100px; align-items: center; }
.about-submission-copy h2, .about-platforms h2 { margin-top: 10px; font-size: 38px; line-height: 1.28; }
.about-submission-copy > p:not(.about-kicker) { margin-top: 22px; color: #b7cdc4; font-size: 16px; line-height: 1.8; }
.about-submission-copy ul { display: grid; margin: 28px 0 0; padding: 0; gap: 13px; list-style: none; }
.about-submission-copy li { display: flex; align-items: center; gap: 10px; color: #dcebe5; font-size: 14px; }
.about-submission-copy li svg { color: #56dea0; }

.about-phone { padding: 14px 15px 18px; border: 8px solid #17241f; border-radius: 34px; background: #f4f7f5; color: #18332a; box-shadow: 0 28px 70px rgba(0, 0, 0, .28); }
.about-phone-bar { display: grid; height: 42px; grid-template-columns: 1fr auto 1fr; align-items: center; font-size: 12px; }
.about-phone-bar span:last-child { justify-self: end; letter-spacing: 2px; }
.about-task-mini { display: flex; gap: 12px; padding: 17px; border-radius: 8px; background: #fff; }
.about-task-mini i { display: grid; width: 38px; height: 38px; flex: 0 0 38px; place-items: center; border-radius: 8px; background: #05ad69; color: #fff; font-size: 13px; font-style: normal; font-weight: 800; }
.about-task-mini div { display: grid; min-width: 0; gap: 5px; }
.about-task-mini strong { font-size: 14px; }
.about-task-mini span { color: #7d8984; font-size: 11px; }
.about-phone-hint { margin: 14px 0 10px !important; color: #48675a; font-size: 11px; }
.about-upload-mini { display: grid; width: 82px; height: 82px; place-items: center; border: 1px dashed #8da69b; border-radius: 8px; background: #fff; color: #07985d; font-size: 10px; }
.about-upload-mini span { margin-top: -14px; }
.about-record-mini { display: grid; height: 58px; margin-top: 12px; padding: 0 12px; grid-template-columns: auto 1fr auto; gap: 9px; align-items: center; border: 1px solid #d7e1dc; border-radius: 8px; background: #fff; color: #667770; font-size: 11px; }
.about-record-mini svg { color: #05a865; }
.about-record-mini button { height: 30px; padding: 0 12px; border: 0; border-radius: 6px; background: #08ab69; color: #fff; font-size: 11px; font-weight: 700; }
.about-note-mini { height: 72px; margin-top: 12px; padding: 12px; border: 1px solid #d7e1dc; border-radius: 8px; background: #fff; color: #9aa49f; font-size: 11px; }
.about-submit-mini { height: 40px; margin-top: 16px; border-radius: 7px; background: #06ae69; color: #fff; font-size: 13px; font-weight: 800; line-height: 40px; text-align: center; }

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
  .about-workflow, .about-features, .about-platforms { padding: 64px 0; }
  .about-section-heading h2, .about-cta h2 { font-size: 28px; }
  .about-steps { grid-template-columns: 1fr; gap: 28px; }
  .about-steps li { padding-right: 0; }
  .about-steps li::after { display: none; }
  .about-feature-grid { grid-template-columns: 1fr; }
  .about-feature-grid article { min-height: 0; }
  .about-submission-band { padding: 68px 0; }
  .about-submission-layout { grid-template-columns: 1fr; gap: 44px; }
  .about-submission-copy h2, .about-platforms h2 { font-size: 30px; }
  .about-phone { width: min(100%, 380px); margin: 0 auto; }
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
