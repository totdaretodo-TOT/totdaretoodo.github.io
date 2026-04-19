const encouragementMessages = [
  { icon: "🌟", title: "这一项完成了", text: "你已经把这项任务做好了。" },
  { icon: "👏", title: "做得不错", text: "继续保持现在的节奏。" },
  { icon: "✅", title: "已经完成", text: "这一轮准备已经结束了。" }
];

const rewardMessages = {
  first: { icon: "🌱", text: "第一次完成任务，已经迈出很好的一步。", name: "初次完成" },
  streak3: { icon: "🔥", text: "连续 3 天完成任务，状态越来越稳。", name: "三天连续" },
  streak7: { icon: "⭐", text: "连续 7 天完成任务，很有坚持力。", name: "一周连续" },
  streak30: { icon: "🏆", text: "连续 30 天完成任务，太厉害了！", name: "一月连续" },
  tasks10: { icon: "🎯", text: "已经完成 10 个任务，熟练度在提升。", name: "十次完成" },
  tasks50: { icon: "💪", text: "已经完成 50 个任务，继续加油！", name: "五十次完成" },
  tasks100: { icon: "👑", text: "已经完成 100 个任务，太了不起了！", name: "百次完成" },
  help0: { icon: "🚀", text: "本次任务没有求助，超级独立！", name: "独立完成" },
  perfect3: { icon: "💎", text: "连续 3 次没有求助，太棒了！", name: "小完美" },
  perfect10: { icon: "💎", text: "连续 10 次没有求助，非常厉害！", name: "大完美" }
};

const IMAGE_DB_NAME = "houchang-image-db";
const IMAGE_STORE_NAME = "stepImages";

let audioContext;

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

function playSuccessSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
  oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
  gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.35);
}

function playCompleteSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
  oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.18);
  gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.55);
}

function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function handleShareQrError(image) {
  image.classList.add("hidden");
  const fallback = image.parentElement?.querySelector(".share-qr-fallback");
  if (fallback) fallback.classList.remove("hidden");
}

function openImageDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = window.indexedDB.open(IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Cannot open image database"));
  });
}

async function getStoredImage(key) {
  const db = await openImageDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(IMAGE_STORE_NAME, "readonly").objectStore(IMAGE_STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Cannot read image"));
  });
}

async function setStoredImage(key, value) {
  const db = await openImageDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(IMAGE_STORE_NAME, "readwrite").objectStore(IMAGE_STORE_NAME).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Cannot save image"));
  });
}

async function deleteStoredImage(key) {
  const db = await openImageDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(IMAGE_STORE_NAME, "readwrite").objectStore(IMAGE_STORE_NAME).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Cannot delete image"));
  });
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Cannot parse image"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Cannot read file"));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file) {
  const img = await fileToImage(file);
  const maxSide = 1280;
  let { width, height } = img;
  if (width > maxSide || height > maxSide) {
    const ratio = Math.min(maxSide / width, maxSide / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

class HouChangApp {
  constructor() {
    this.baseTasks = tasks;
    this.currentTask = null;
    this.currentStepIndex = 0;
    this.currentCategory = "all";
    this.currentUserImage = null;
    this.imageStoreAvailable = true;
    this.synth = "speechSynthesis" in window ? window.speechSynthesis : null;
    this.currentUtterance = null;
    this.stepStartedAt = 0;
    this.smartHelpTimers = [];
    this.smartHelpStage = 0;
    this.smartHelpStepKey = null;

    this.modalOverlay = document.getElementById("modal-overlay");
    this.modalTitle = document.getElementById("modal-title");
    this.modalMessage = document.getElementById("modal-message");
    this.modalActions = document.getElementById("modal-actions");
    this.modalCard = this.modalOverlay?.querySelector(".modal-card");

    this.profiles = this.loadProfiles();
    this.activeProfileId = this.loadActiveProfileId();
    this.customTasks = [];
    this.stats = this.createEmptyStats();
    this.contacts = this.loadContacts();
    this.init();
  }

  async init() {
    await this.checkImageStore();
    await this.checkPrivacyAgreement();
    this.loadDisplayMode();
    this.reloadProfileScopedData();
    this.bindEvents();
    this.renderTaskGrid();
    this.updateProfileChip();
    this.updateNavState();
    this.updateStreakBadge();
    this.updateResumeCard();
    this.promptResumeIfNeeded();
    this.showSharedViewIfNeeded();
  }

  async checkPrivacyAgreement() {
    const agreed = localStorage.getItem("privacy-agreement");
    if (agreed) return;

    return new Promise((resolve) => {
      const template = document.getElementById("privacy-popup-template");
      const container = document.getElementById("privacy-popup");
      if (!template || !container) {
        resolve();
        return;
      }

      const content = template.content.cloneNode(true);
      container.appendChild(content);

      const overlay = container.querySelector(".privacy-popup-overlay");
      const agreeBtn = container.querySelector(".btn-agree");
      const disagreeBtn = container.querySelector(".btn-disagree");

      const handleAgree = () => {
        localStorage.setItem("privacy-agreement", "true");
        container.innerHTML = "";
        resolve();
      };

      const handleDisagree = () => {
        container.innerHTML = "<div style='padding:40px;text-align:center;'><p>您需要同意隐私政策才能使用本应用。</p></div>";
        resolve();
      };

      agreeBtn.addEventListener("click", handleAgree);
      disagreeBtn.addEventListener("click", handleDisagree);
    });
  }

  createEmptyStats() {
    return {
      totalTasks: 0,
      totalSteps: 0,
      helpCount: 0,
      autoHelpCount: 0,
      consecutiveNoHelpTasks: 0,
      history: [],
      streak: 0,
      lastCompletedDate: null,
      checkInDays: [],
      achievements: [],
      helpByStep: {},
      autoHelpByStep: {},
      stepMetrics: {}
    };
  }

  async checkImageStore() {
    try {
      await openImageDatabase();
      this.imageStoreAvailable = true;
    } catch (error) {
      this.imageStoreAvailable = false;
    }
  }

  loadProfiles() {
    try {
      const saved = localStorage.getItem("houchang-profiles");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (error) {
      console.log("Cannot load profiles");
    }
    const defaults = [{ id: "profile-default", name: "默认使用者" }];
    localStorage.setItem("houchang-profiles", JSON.stringify(defaults));
    return defaults;
  }

  saveProfiles() {
    localStorage.setItem("houchang-profiles", JSON.stringify(this.profiles));
  }

  loadActiveProfileId() {
    const saved = localStorage.getItem("houchang-active-profile");
    if (saved && this.profiles.some(profile => profile.id === saved)) return saved;
    const fallback = this.profiles[0].id;
    localStorage.setItem("houchang-active-profile", fallback);
    return fallback;
  }

  getActiveProfile() {
    return this.profiles.find(profile => profile.id === this.activeProfileId) || this.profiles[0];
  }

  getScopedKey(base) {
    return `${base}-${this.activeProfileId}`;
  }

  reloadProfileScopedData() {
    this.stats = this.loadStats();
    this.customTasks = this.loadCustomTasks();
  }

  loadStats() {
    try {
      const saved = localStorage.getItem(this.getScopedKey("houchang-stats"));
      if (saved) return { ...this.createEmptyStats(), ...JSON.parse(saved) };
    } catch (error) {
      console.log("Cannot load stats");
    }
    return this.createEmptyStats();
  }

  saveStats() {
    localStorage.setItem(this.getScopedKey("houchang-stats"), JSON.stringify(this.stats));
  }

  loadCustomTasks() {
    try {
      const saved = localStorage.getItem(this.getScopedKey("houchang-custom-tasks"));
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  }

  saveCustomTasks() {
    localStorage.setItem(this.getScopedKey("houchang-custom-tasks"), JSON.stringify(this.customTasks));
  }

  getAllTasks() {
    return [...this.baseTasks, ...this.customTasks];
  }

  updateProfileChip() {
    document.getElementById("current-profile-btn").textContent = `👤 ${this.getActiveProfile().name}`;
  }

  showModal({ title, message = "", html = "", actions = [], afterRender = null, modalClass = "" }) {
    this.modalTitle.textContent = title;
    this.modalMessage.innerHTML = html || escapeHtml(message).replace(/\n/g, "<br>");
    this.modalActions.innerHTML = "";
    if (this.modalCard) {
      this.modalCard.className = "modal-card";
      if (modalClass) this.modalCard.classList.add(...modalClass.split(/\s+/).filter(Boolean));
    }
    this.modalOverlay.classList.remove("hidden");
    actions.forEach(action => {
      const button = document.createElement("button");
      button.className = action.variant === "primary" ? "btn btn-primary" : "btn btn-secondary";
      if (action.className) button.classList.add(...action.className.split(/\s+/).filter(Boolean));
      button.textContent = action.label;
      button.addEventListener("click", () => {
        if (!action.keepOpen) this.closeModal();
        action.onClick();
      });
      this.modalActions.appendChild(button);
    });
    if (afterRender) afterRender();
  }

  closeModal() {
    this.modalOverlay.classList.add("hidden");
    this.modalActions.innerHTML = "";
    this.modalMessage.innerHTML = "";
    if (this.modalCard) this.modalCard.className = "modal-card";
  }

  confirmModal(title, message, confirmLabel = "确定") {
    return new Promise(resolve => {
      this.showModal({
        title,
        message,
        actions: [
          { label: "取消", variant: "secondary", onClick: () => resolve(false) },
          { label: confirmLabel, variant: "primary", onClick: () => resolve(true) }
        ]
      });
    });
  }

  infoModal(title, message) {
    this.showModal({
      title,
      message,
      actions: [{ label: "我知道了", variant: "primary", onClick: () => {} }]
    });
  }

  loadContacts() {
    try {
      const saved = localStorage.getItem("houchang-contacts");
      if (saved) return JSON.parse(saved);
    } catch (error) {}
    return [
      { id: "c1", name: "值班主管", phone: "138-0000-0001", role: "主管" },
      { id: "c2", name: "带教老师", phone: "138-0000-0002", role: "带教" },
      { id: "c3", name: "同事小王", phone: "138-0000-0003", role: "同事" }
    ];
  }

  saveContacts() {
    localStorage.setItem("houchang-contacts", JSON.stringify(this.contacts));
  }

  showContactList() {
    const html = `
      <div class="contact-list">
        ${this.contacts.map(c => `
          <div class="contact-row">
            <div class="contact-info">
              <div class="contact-name">${escapeHtml(c.name)} <span class="contact-role">${escapeHtml(c.role)}</span></div>
              <div class="contact-phone">${escapeHtml(c.phone)}</div>
            </div>
            <button class="btn btn-contact-action" data-phone="${escapeHtml(c.phone)}">拨打电话</button>
          </div>
        `).join("")}
      </div>
      <p class="inline-note" style="margin-top:16px;text-align:center;">联系人可以在设置中修改。</p>
    `;
    this.showModal({
      title: "📞 联系同事",
      html,
      actions: [{ label: "关闭", variant: "secondary", onClick: () => {} }],
      afterRender: () => {
        document.querySelectorAll(".contact-row .btn-contact-action").forEach(btn => {
          btn.addEventListener("click", () => {
            const phone = btn.dataset.phone;
            if (phone) {
              window.location.href = `tel:${phone}`;
            }
          });
        });
      }
    });
  }

  handleEmergencyCall() {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    if (this.contacts && this.contacts.length > 0) {
      const firstContact = this.contacts[0];
      window.location.href = `tel:${firstContact.phone}`;
    } else {
      this.infoModal("未设置联系人", "请先在设置中添加紧急联系人。\n\n点击右上角「当前使用者」→「管理联系人」来添加。");
    }
  }

  promptResumeIfNeeded() {
    const saved = this.loadProgress();
    if (!saved) return;
    const task = this.getAllTasks().find(item => item.id === saved.taskId);
    if (!task || saved.stepIndex >= task.steps.length) {
      this.clearProgress();
      return;
    }
    this.showModal({
      title: "继续上次任务",
      message: `“${task.title}” 还停留在第 ${saved.stepIndex + 1} 步，现在要继续吗？`,
      actions: [
        { label: "重新开始", variant: "secondary", onClick: () => { this.clearProgress(); this.updateResumeCard(); } },
        { label: "继续完成", variant: "primary", onClick: () => this.resumeTask(saved.taskId, saved.stepIndex) }
      ]
    });
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem(this.getScopedKey("houchang-progress"));
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      return null;
    }
  }

  saveProgress() {
    if (!this.currentTask) return;
    localStorage.setItem(this.getScopedKey("houchang-progress"), JSON.stringify({
      taskId: this.currentTask.id,
      stepIndex: this.currentStepIndex
    }));
    this.updateResumeCard();
  }

  clearProgress() {
    localStorage.removeItem(this.getScopedKey("houchang-progress"));
    this.updateResumeCard();
  }

  updateResumeCard() {
    const saved = this.loadProgress();
    const card = document.getElementById("resume-card");
    const title = document.getElementById("resume-title");
    if (!saved) {
      card.style.display = "none";
      return;
    }
    const task = this.getAllTasks().find(item => item.id === saved.taskId);
    if (!task || saved.stepIndex >= task.steps.length) {
      card.style.display = "none";
      this.clearProgress();
      return;
    }
    title.textContent = `${task.title} · 第 ${saved.stepIndex + 1} 步`;
    card.style.display = "flex";
  }

  recordHelp(kind) {
    this.stats.helpCount += 1;
    if (this.currentTask) {
      const step = this.currentTask.steps[this.currentStepIndex];
      const key = `${this.currentTask.id}-${this.currentStepIndex}`;
      const record = this.stats.helpByStep[key] || {
        taskId: this.currentTask.id,
        stepIndex: this.currentStepIndex,
        taskTitle: this.currentTask.title,
        stepInstruction: step.instruction,
        count: 0,
        kinds: {}
      };
      record.count += 1;
      record.kinds[kind] = (record.kinds[kind] || 0) + 1;
      this.stats.helpByStep[key] = record;
    }
    this.saveStats();
  }

  recordAutoHelpTrigger(stage) {
    this.stats.autoHelpCount += 1;
    if (this.currentTask) {
      const step = this.currentTask.steps[this.currentStepIndex];
      const key = `${this.currentTask.id}-${this.currentStepIndex}`;
      const record = this.stats.autoHelpByStep[key] || {
        taskId: this.currentTask.id,
        stepIndex: this.currentStepIndex,
        taskTitle: this.currentTask.title,
        stepInstruction: step.instruction,
        count: 0,
        stages: {}
      };
      record.count += 1;
      record.stages[stage] = (record.stages[stage] || 0) + 1;
      this.stats.autoHelpByStep[key] = record;
    }
    this.saveStats();
  }

  recordStep(durationMs = 0) {
    this.stats.totalSteps += 1;
    if (this.currentTask) {
      const step = this.currentTask.steps[this.currentStepIndex];
      const key = `${this.currentTask.id}-${this.currentStepIndex}`;
      const record = this.stats.stepMetrics[key] || {
        taskId: this.currentTask.id,
        stepIndex: this.currentStepIndex,
        taskTitle: this.currentTask.title,
        stepInstruction: step.instruction,
        count: 0,
        totalDurationMs: 0,
        averageDurationMs: 0
      };
      record.count += 1;
      record.totalDurationMs += Math.max(0, durationMs);
      record.averageDurationMs = Math.round(record.totalDurationMs / record.count);
      this.stats.stepMetrics[key] = record;
    }
    this.saveStats();
  }

  formatDuration(ms = 0) {
    const seconds = Math.max(1, Math.round(ms / 1000));
    if (seconds < 60) return `${seconds} \u79d2`;
    const minutes = Math.floor(seconds / 60);
    const remain = seconds % 60;
    return remain ? `${minutes} \u5206 ${remain} \u79d2` : `${minutes} \u5206\u949f`;
  }

  updateSmartHelpBanner(message = "", visible = false) {
    const banner = document.getElementById("smart-help-banner");
    const text = document.getElementById("smart-help-text");
    if (!banner || !text) return;
    text.textContent = message || "\u5982\u679c\u8fd9\u4e00\u6b65\u505c\u7559\u592a\u4e45\uff0c\u7cfb\u7edf\u4f1a\u4e3b\u52a8\u7ed9\u4f60\u5e2e\u52a9\u3002";
    banner.classList.toggle("hidden", !visible);
  }

  getCurrentStepKey() {
    if (!this.currentTask) return null;
    return `${this.currentTask.id}-${this.currentStepIndex}`;
  }

  getRiskScoreForKey(key) {
    const helpRecord = this.stats.helpByStep?.[key];
    const autoRecord = this.stats.autoHelpByStep?.[key];
    const metricRecord = this.stats.stepMetrics?.[key];
    let score = 0;
    if (helpRecord) score += helpRecord.count * 2;
    if (autoRecord) score += autoRecord.count * 2;
    if (metricRecord?.averageDurationMs >= 45000) score += 2;
    return score;
  }

  getRiskLevelFromScore(score) {
    if (score >= 6) return "high";
    if (score >= 2) return "medium";
    return "low";
  }

  getStepRiskInfo() {
    const key = this.getCurrentStepKey();
    const step = this.getCurrentStep();
    if (!key || !step) return null;

    const helpRecord = this.stats.helpByStep?.[key];
    const autoRecord = this.stats.autoHelpByStep?.[key];
    const metricRecord = this.stats.stepMetrics?.[key];

    let score = this.getRiskScoreForKey(key);
    if (this.smartHelpStage > 0) score += 2;

    if (score <= 0) return null;

    const level = this.getRiskLevelFromScore(score);
    const title = level === "high" ? "\u9ad8\u98ce\u9669\u6b65\u9aa4" : "\u9700\u8981\u7559\u610f\u7684\u6b65\u9aa4";
    const text = level === "high"
      ? "\u8fd9\u4e00\u6b65\u4ee5\u524d\u8f83\u5bb9\u6613\u5361\u4f4f\uff0c\u5efa\u8bae\u4f60\u5148\u770b\u63d0\u793a\uff0c\u518d\u6162\u6162\u505a\u3002"
      : "\u8fd9\u4e00\u6b65\u5bf9\u90e8\u5206\u4f7f\u7528\u8005\u6765\u8bf4\u4f1a\u7a0d\u96be\uff0c\u505a\u4e4b\u524d\u53ef\u4ee5\u5148\u786e\u8ba4\u4e00\u4e0b\u3002";

    const bullets = [];
    if (helpRecord?.count) bullets.push(`\u8fd9\u4e00\u6b65\u4e4b\u524d\u88ab\u6c42\u52a9 ${helpRecord.count} \u6b21`);
    if (autoRecord?.count) bullets.push(`\u7cfb\u7edf\u66fe\u7ecf\u4e3b\u52a8\u63d0\u9192 ${autoRecord.count} \u6b21`);
    if (metricRecord?.averageDurationMs) bullets.push(`\u5e73\u5747\u8017\u65f6\u7ea6 ${this.formatDuration(metricRecord.averageDurationMs)}`);

    const kinds = helpRecord?.kinds || {};
    const topKind = Object.keys(kinds).sort((a, b) => (kinds[b] || 0) - (kinds[a] || 0))[0];
    if (topKind === "notfound") bullets.push("\u5efa\u8bae\u5148\u770b\u53c2\u8003\u56fe\uff0c\u786e\u8ba4\u4e1c\u897f\u5728\u54ea\u91cc");
    if (topKind === "simplify") bullets.push("\u5efa\u8bae\u5148\u70b9\u201c\u518d\u8bf4\u7b80\u5355\u4e00\u70b9\u201d\uff0c\u518d\u5f00\u59cb\u505a");
    if (topKind === "need") bullets.push("\u5982\u679c\u8fd8\u662f\u4e0d\u786e\u5b9a\uff0c\u53ef\u4ee5\u76f4\u63a5\u8054\u7cfb\u540c\u4e8b");
    if (!bullets.length) bullets.push("\u53ef\u4ee5\u5148\u5bf9\u7167\u56fe\u7247\u548c\u63d0\u793a\uff0c\u518d\u70b9\u5b8c\u6210");

    return { level, title, text, bullets: bullets.slice(0, 4) };
  }

  renderStepRiskInfo() {
    const card = document.getElementById("step-risk-card");
    const level = document.getElementById("step-risk-level");
    const badge = document.getElementById("step-risk-badge");
    const text = document.getElementById("step-risk-text");
    const list = document.getElementById("step-risk-list");
    if (!card || !level || !badge || !text || !list) return;

    const risk = this.getStepRiskInfo();
    if (!risk) {
      card.classList.add("hidden");
      card.classList.remove("high", "medium");
      return;
    }

    card.classList.remove("hidden");
    card.classList.remove("high", "medium");
    card.classList.add(risk.level);
    level.textContent = risk.title;
    badge.textContent = risk.level === "high" ? "AI \u91cd\u70b9\u5173\u6ce8" : "AI \u63d0\u9192";
    text.textContent = risk.text;
    list.innerHTML = risk.bullets.map(item => `<li>${escapeHtml(item)}</li>`).join("");
  }

  async openImageAnnotator() {
    if (!this.currentUserImage) {
      this.infoModal("\u8fd8\u6ca1\u6709\u53c2\u8003\u56fe", "\u8bf7\u5148\u4e0a\u4f20\u4e00\u5f20\u53c2\u8003\u56fe\uff0c\u518d\u8fdb\u884c\u7bad\u5934\u6216\u5708\u91cd\u70b9\u6807\u6ce8\u3002");
      return;
    }
    if (!this.imageStoreAvailable) {
      this.infoModal("\u5f53\u524d\u65e0\u6cd5\u4fdd\u5b58\u6807\u6ce8", "\u8fd9\u4e2a\u73af\u5883\u6682\u65f6\u4e0d\u652f\u6301\u56fe\u7247\u6807\u6ce8\u4fdd\u5b58\u3002");
      return;
    }

    let exportImage = null;
    const html = `
      <div class="annotator-toolbar">
        <button class="annotator-tool active" data-tool="arrow">\u7bad\u5934</button>
        <button class="annotator-tool" data-tool="circle">\u5708\u91cd\u70b9</button>
        <button class="annotator-tool" data-tool="check">\u6253\u52fe</button>
        <button class="annotator-tool" data-tool="clear">\u6e05\u7a7a\u6807\u8bb0</button>
      </div>
      <canvas class="annotator-canvas" id="annotator-canvas" width="320" height="220"></canvas>
      <p class="inline-note">\u70b9\u51fb\u56fe\u7247\u53ef\u4ee5\u653e\u7f6e\u6807\u8bb0\uff0c\u9002\u5408\u6807\u51fa\u201c\u5728\u8fd9\u91cc\u62ff\u201d\u3001\u201c\u653e\u5728\u8fd9\u91cc\u201d\u3002</p>
    `;

    this.showModal({
      title: "\u6807\u6ce8\u53c2\u8003\u56fe",
      html,
      actions: [
        { label: "\u53d6\u6d88", variant: "secondary", onClick: () => {} },
        { label: "\u4fdd\u5b58\u6807\u6ce8", variant: "primary", keepOpen: true, onClick: async () => {
            if (!exportImage) return;
            try {
              const result = exportImage();
              await setStoredImage(this.getCurrentImageKey(), result);
              this.currentUserImage = result;
              this.renderStepImageState(this.getCurrentStep());
              this.closeModal();
            } catch (error) {
              this.infoModal("\u6807\u6ce8\u4fdd\u5b58\u5931\u8d25", "\u8fd9\u6b21\u6ca1\u6709\u4fdd\u5b58\u6210\u529f\uff0c\u53ef\u4ee5\u518d\u8bd5\u4e00\u6b21\u3002");
            }
          } }
      ],
      afterRender: () => {
        const canvas = document.getElementById("annotator-canvas");
        const ctx = canvas?.getContext("2d");
        const toolButtons = Array.from(document.querySelectorAll(".annotator-tool"));
        if (!canvas || !ctx) return;

        const markers = [];
        let activeTool = "arrow";
        const image = new Image();
        image.onload = () => {
          const ratio = image.width / image.height;
          const targetWidth = 320;
          const targetHeight = Math.max(180, Math.round(targetWidth / ratio));
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          draw();
        };
        image.src = this.currentUserImage;

        const drawArrow = (x, y) => {
          ctx.save();
          ctx.strokeStyle = "#ef4444";
          ctx.fillStyle = "#ef4444";
          ctx.lineWidth = 6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x - 36, y - 30);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x - 12, y - 2);
          ctx.lineTo(x, y);
          ctx.lineTo(x - 2, y - 12);
          ctx.fill();
          ctx.restore();
        };

        const drawCircle = (x, y) => {
          ctx.save();
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(x, y, 28, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        };

        const drawCheck = (x, y) => {
          ctx.save();
          ctx.fillStyle = "#16a34a";
          ctx.beginPath();
          ctx.arc(x, y, 26, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 6;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(x - 10, y);
          ctx.lineTo(x - 2, y + 10);
          ctx.lineTo(x + 12, y - 10);
          ctx.stroke();
          ctx.restore();
        };

        const draw = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          markers.forEach(marker => {
            if (marker.tool === "arrow") drawArrow(marker.x, marker.y);
            if (marker.tool === "circle") drawCircle(marker.x, marker.y);
            if (marker.tool === "check") drawCheck(marker.x, marker.y);
          });
        };

        toolButtons.forEach(button => {
          button.addEventListener("click", () => {
            const tool = button.dataset.tool;
            if (tool === "clear") {
              markers.length = 0;
              draw();
              return;
            }
            activeTool = tool;
            toolButtons.forEach(item => item.classList.toggle("active", item === button));
          });
        });

        const placeMarker = event => {
          const rect = canvas.getBoundingClientRect();
          const clientX = event.touches ? event.touches[0].clientX : event.clientX;
          const clientY = event.touches ? event.touches[0].clientY : event.clientY;
          const x = ((clientX - rect.left) / rect.width) * canvas.width;
          const y = ((clientY - rect.top) / rect.height) * canvas.height;
          markers.push({ tool: activeTool, x, y });
          draw();
        };

        canvas.addEventListener("click", placeMarker);
        canvas.addEventListener("touchstart", event => {
          event.preventDefault();
          placeMarker(event);
        }, { passive: false });

        exportImage = () => canvas.toDataURL("image/jpeg", 0.9);
      }
    });
  }

  clearSmartHelpTimers() {
    this.smartHelpTimers.forEach(timer => window.clearTimeout(timer));
    this.smartHelpTimers = [];
    this.smartHelpStage = 0;
    this.smartHelpStepKey = null;
    this.stepStartedAt = 0;
    this.updateSmartHelpBanner("", false);
  }

  startSmartHelpTimers() {
    this.clearSmartHelpTimers();
    if (!this.currentTask) return;
    this.stepStartedAt = Date.now();
    this.smartHelpStepKey = `${this.currentTask.id}-${this.currentStepIndex}`;
    this.smartHelpTimers = [
      window.setTimeout(() => this.triggerSmartHelp(1), 35000),
      window.setTimeout(() => this.triggerSmartHelp(2), 70000)
    ];
  }

  triggerSmartHelp(stage) {
    if (!this.currentTask) return;
    const currentKey = `${this.currentTask.id}-${this.currentStepIndex}`;
    if (currentKey !== this.smartHelpStepKey || this.smartHelpStage >= stage) return;
    this.smartHelpStage = stage;
    this.recordAutoHelpTrigger(stage);

    if (stage === 1) {
      this.updateSmartHelpBanner("\u6211\u53d1\u73b0\u4f60\u5728\u8fd9\u4e00\u6b65\u505c\u7559\u6709\u70b9\u4e45\uff0c\u8981\u4e0d\u8981\u5148\u770b\u66f4\u7b80\u5355\u7684\u63d0\u793a\uff1f", true);
      this.showModal({
        title: "AI \u53d1\u73b0\u4f60\u53ef\u80fd\u5361\u4f4f\u4e86",
        message: "\u5148\u522b\u7740\u6025\uff0c\u6211\u4eec\u53ef\u4ee5\u628a\u8fd9\u4e00\u6b65\u8bf4\u5f97\u66f4\u7b80\u5355\uff0c\u6216\u8005\u770b\u770b\u201c\u6ca1\u627e\u5230\u201d\u65f6\u600e\u4e48\u505a\u3002",
        actions: [
          { label: "\u518d\u8bf4\u7b80\u5355\u4e00\u70b9", variant: "primary", onClick: () => this.showAssist("simplify") },
          { label: "\u770b\u770b\u6ca1\u627e\u5230\u63d0\u793a", variant: "secondary", onClick: () => this.showAssist("notfound") },
          { label: "\u6211\u5148\u81ea\u5df1\u8bd5\u8bd5", variant: "secondary", onClick: () => {} }
        ]
      });
      return;
    }

    this.updateSmartHelpBanner("\u8fd9\u4e00\u6b65\u5df2\u7ecf\u505c\u7559\u6bd4\u8f83\u4e45\u4e86\uff0c\u5efa\u8bae\u76f4\u63a5\u6c42\u52a9\u6216\u8054\u7cfb\u540c\u4e8b\u3002", true);
    this.showModal({
      title: "AI \u5efa\u8bae\u73b0\u5728\u5bfb\u6c42\u5e2e\u52a9",
      message: "\u8fd9\u4e00\u6b65\u5df2\u7ecf\u505c\u7559\u6bd4\u8f83\u4e45\u4e86\u3002\u4e3a\u4e86\u4e0d\u8ba9\u4f60\u66f4\u7740\u6025\uff0c\u5efa\u8bae\u76f4\u63a5\u6253\u5f00\u6c42\u52a9\u63d0\u793a\uff0c\u6216\u8005\u8054\u7cfb\u540c\u4e8b\u786e\u8ba4\u3002",
      actions: [
        { label: "\u6253\u5f00\u6c42\u52a9\u63d0\u793a", variant: "primary", onClick: () => this.showAssist("need") },
        { label: "\u8054\u7cfb\u540c\u4e8b", variant: "secondary", onClick: () => this.showContactList() },
        { label: "\u518d\u8bd5\u4e00\u6b21", variant: "secondary", onClick: () => {} }
      ]
    });
  }

  recordTaskComplete(taskTitle) {
    this.stats.totalTasks += 1;
    this.stats.history.unshift({ task: taskTitle, time: new Date().toLocaleString("zh-CN") });
    if (this.stats.history.length > 20) this.stats.history = this.stats.history.slice(0, 20);

    if (this.stats.helpCount === 0) {
      this.stats.consecutiveNoHelpTasks += 1;
    } else {
      this.stats.consecutiveNoHelpTasks = 0;
    }

    this.checkAndUpdateStreak();
    this.saveStats();
  }

  checkAndUpdateStreak() {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (this.stats.lastCompletedDate === today) return;
    this.stats.streak = this.stats.lastCompletedDate === yesterday ? this.stats.streak + 1 : 1;
    this.stats.lastCompletedDate = today;
    if (!this.stats.checkInDays.includes(today)) {
      this.stats.checkInDays.push(today);
      if (this.stats.checkInDays.length > 365) this.stats.checkInDays = this.stats.checkInDays.slice(-365);
    }
  }

  updateStreakBadge() {
    const badge = document.getElementById("streak-badge");
    const count = document.getElementById("streak-count");
    if (this.stats.streak > 0) {
      badge.style.display = "flex";
      count.textContent = this.stats.streak;
    } else {
      badge.style.display = "none";
    }
  }

  checkAchievements() {
    const rewards = [];
    const wasHelpUsedThisTask = this.stats.helpCount > 0;

    if (this.stats.totalTasks === 1 && !this.stats.achievements.includes("first")) {
      this.stats.achievements.push("first");
      rewards.push(rewardMessages.first);
    }
    if (this.stats.streak >= 3 && !this.stats.achievements.includes("streak3")) {
      this.stats.achievements.push("streak3");
      rewards.push(rewardMessages.streak3);
    }
    if (this.stats.streak >= 7 && !this.stats.achievements.includes("streak7")) {
      this.stats.achievements.push("streak7");
      rewards.push(rewardMessages.streak7);
    }
    if (this.stats.streak >= 30 && !this.stats.achievements.includes("streak30")) {
      this.stats.achievements.push("streak30");
      rewards.push(rewardMessages.streak30);
    }
    if (this.stats.totalTasks >= 10 && !this.stats.achievements.includes("tasks10")) {
      this.stats.achievements.push("tasks10");
      rewards.push(rewardMessages.tasks10);
    }
    if (this.stats.totalTasks >= 50 && !this.stats.achievements.includes("tasks50")) {
      this.stats.achievements.push("tasks50");
      rewards.push(rewardMessages.tasks50);
    }
    if (this.stats.totalTasks >= 100 && !this.stats.achievements.includes("tasks100")) {
      this.stats.achievements.push("tasks100");
      rewards.push(rewardMessages.tasks100);
    }
    if (!wasHelpUsedThisTask && !this.stats.achievements.includes("help0")) {
      this.stats.achievements.push("help0");
      rewards.push(rewardMessages.help0);
    }
    if (this.stats.consecutiveNoHelpTasks >= 3 && !this.stats.achievements.includes("perfect3")) {
      this.stats.achievements.push("perfect3");
      rewards.push(rewardMessages.perfect3);
    }
    if (this.stats.consecutiveNoHelpTasks >= 10 && !this.stats.achievements.includes("perfect10")) {
      this.stats.achievements.push("perfect10");
      rewards.push(rewardMessages.perfect10);
    }
    this.saveStats();
    return rewards.length ? rewards[rewards.length - 1] : null;
  }

  clearStats() {
    this.stats = this.createEmptyStats();
    this.saveStats();
    this.clearProgress();
  }

  filterTasksByCategory(category) {
    return category === "all" ? this.getAllTasks() : this.getAllTasks().filter(task => task.category === category);
  }

  renderTaskGrid() {
    const grid = document.getElementById("task-grid");
    const filteredTasks = this.filterTasksByCategory(this.currentCategory);
    grid.innerHTML = filteredTasks.map(task => `
      <div class="task-card" data-task-id="${escapeHtml(task.id)}">
        <div class="task-icon">${escapeHtml(task.icon)}</div>
        <h3>${escapeHtml(task.title)}</h3>
        <p>${escapeHtml(task.description)}</p>
        <span class="task-category">${escapeHtml(categoryNames[task.category] || task.category)}</span>
        ${task.isCustom ? '<span class="task-category" style="margin-left:8px;background:#ede9fe;color:#6d28d9;">自定义</span>' : ""}
      </div>
    `).join("");
  }

  bindEvents() {
    document.getElementById("task-grid").addEventListener("click", event => {
      const card = event.target.closest(".task-card");
      if (card) this.startTask(card.dataset.taskId);
    });

    document.querySelectorAll(".category-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".category-tab").forEach(item => item.classList.remove("active"));
        tab.classList.add("active");
        this.currentCategory = tab.dataset.category;
        this.renderTaskGrid();
      });
    });

    document.getElementById("current-profile-btn").addEventListener("click", () => this.openProfileManager());
    document.getElementById("manage-profile-btn").addEventListener("click", () => this.openProfileManager());
    document.getElementById("create-task-btn").addEventListener("click", () => this.openCustomTaskBuilder());
    document.getElementById("share-progress-btn").addEventListener("click", () => this.openShareProgress());
    document.getElementById("video-idea-btn").addEventListener("click", () => this.openVideoIdea());
    document.getElementById("resume-btn").addEventListener("click", () => {
      const saved = this.loadProgress();
      if (saved) this.resumeTask(saved.taskId, saved.stepIndex);
    });

    document.getElementById("back-btn").addEventListener("click", () => this.goHome());
    document.getElementById("done-btn").addEventListener("click", () => this.completeStep());
    document.getElementById("help-simplify").addEventListener("click", () => this.showAssist("simplify"));
    document.getElementById("help-notfound").addEventListener("click", () => this.showAssist("notfound"));
    document.getElementById("help-need").addEventListener("click", () => this.showAssist("need"));
    document.getElementById("contact-btn").addEventListener("click", () => this.showContactList());
    document.getElementById("emergency-btn").addEventListener("click", () => this.handleEmergencyCall());
    document.getElementById("assist-close-btn").addEventListener("click", () => this.hideAssist());
    document.getElementById("restart-btn").addEventListener("click", () => this.restartTask());
    document.getElementById("home-btn").addEventListener("click", () => this.goHome());
    document.getElementById("nav-home").addEventListener("click", () => this.goHome());
    document.getElementById("nav-stats").addEventListener("click", () => this.showStats());
    document.getElementById("stats-back-btn").addEventListener("click", () => this.goHome());
    document.getElementById("voice-btn").addEventListener("click", () => this.speakCurrentStep());
    document.getElementById("clear-stats-btn").addEventListener("click", async () => {
      const confirmed = await this.confirmModal("清除记录", "要清除当前使用者的完成记录和卡点统计吗？");
      if (confirmed) {
        this.clearStats();
        this.renderStats();
        this.renderCalendar();
        this.updateStreakBadge();
      }
    });

    document.getElementById("upload-image-btn").addEventListener("click", () => document.getElementById("step-image-input").click());
    document.getElementById("annotate-image-btn").addEventListener("click", () => this.openImageAnnotator());
    document.getElementById("replace-image-btn").addEventListener("click", () => document.getElementById("step-image-input").click());
    document.getElementById("remove-image-btn").addEventListener("click", () => this.removeCurrentStepImage());
    document.getElementById("step-image-input").addEventListener("change", event => this.handleImageSelected(event));

    document.getElementById("upload-video-btn").addEventListener("click", () => document.getElementById("step-video-input").click());
    document.getElementById("remove-video-btn").addEventListener("click", () => this.removeCurrentStepVideo());
    document.getElementById("step-video-input").addEventListener("change", event => this.handleVideoSelected(event));

    document.getElementById("mode-toggle-btn").addEventListener("click", () => this.toggleDisplayMode());
    document.getElementById("voice-settings-btn").addEventListener("click", () => this.openVoiceSettings());
  }

  toggleDisplayMode() {
    const body = document.body;
    const currentMode = localStorage.getItem("display-mode") || "normal";

    if (currentMode === "normal") {
      body.classList.add("dark-mode");
      localStorage.setItem("display-mode", "dark");
    } else if (currentMode === "dark") {
      body.classList.remove("dark-mode");
      body.classList.add("high-contrast");
      localStorage.setItem("display-mode", "high-contrast");
    } else {
      body.classList.remove("high-contrast");
      localStorage.setItem("display-mode", "normal");
    }
  }

  loadDisplayMode() {
    const saved = localStorage.getItem("display-mode");
    if (saved === "dark") {
      document.body.classList.add("dark-mode");
    } else if (saved === "high-contrast") {
      document.body.classList.add("high-contrast");
    }
  }

  openVoiceSettings() {
    const savedLang = localStorage.getItem("voice-lang") || "zh-CN";
    const savedRate = localStorage.getItem("voice-rate") || "0.88";
    const html = `
      <label class="field-label">语音语言</label>
      <select id="voice-lang-select">
        <option value="zh-CN" ${savedLang === "zh-CN" ? "selected" : ""}>普通话</option>
        <option value="zh-TW" ${savedLang === "zh-TW" ? "selected" : ""}>粤语</option>
        <option value="zh-CN" ${savedLang === "min-nan" ? "selected" : ""}>闽南语（部分设备支持）</option>
      </select>
      <label class="field-label">语速（0.5 最慢 ~ 1.5 最快）</label>
      <input id="voice-rate-input" type="range" min="0.5" max="1.5" step="0.1" value="${savedRate}">
      <p class="inline-note">当前语速：<span id="voice-rate-display">${savedRate}</span></p>
      <p class="inline-note">注意：部分设备可能不支持所有语言，请以实际播放效果为准。</p>
    `;
    this.showModal({
      title: "🔊 语音设置",
      html,
      actions: [
        { label: "取消", variant: "secondary", onClick: () => {} },
        { label: "保存", variant: "primary", onClick: () => {
            const lang = document.getElementById("voice-lang-select").value;
            const rate = document.getElementById("voice-rate-input").value;
            localStorage.setItem("voice-lang", lang);
            localStorage.setItem("voice-rate", rate);
            this.infoModal("设置已保存", "语音语言和语速已保存，下次朗读时生效。");
          } }
      ],
      afterRender: () => {
        const rateInput = document.getElementById("voice-rate-input");
        const rateDisplay = document.getElementById("voice-rate-display");
        rateInput.addEventListener("input", () => {
          rateDisplay.textContent = rateInput.value;
        });
      }
    });
  }

  getVoiceSettings() {
    return {
      lang: localStorage.getItem("voice-lang") || "zh-CN",
      rate: parseFloat(localStorage.getItem("voice-rate") || "0.88")
    };
  }

  openProfileManager() {
    const activeId = this.activeProfileId;
    const html = `
      <div class="profile-list">
        ${this.profiles.map(profile => `
          <div class="profile-row ${profile.id === activeId ? "active" : ""}">
            <div class="profile-row-title">${escapeHtml(profile.name)}</div>
            <div class="profile-row-meta">${profile.id === activeId ? "当前正在使用" : "点击切换到这个使用者"}</div>
            ${profile.id === activeId ? "" : `<button class="btn btn-secondary switch-profile-btn" data-profile-id="${escapeHtml(profile.id)}">切换到这里</button>`}
          </div>
        `).join("")}
        <div class="profile-row">
          <span class="field-label">新建使用者</span>
          <input id="new-profile-name" type="text" placeholder="例如：小林 / 1号学员 / 家庭版用户">
        </div>
      </div>
    `;

    this.showModal({
      title: "使用者切换",
      html,
      actions: [
        { label: "关闭", variant: "secondary", onClick: () => {} },
        {
          label: "新建使用者",
          variant: "primary",
          keepOpen: true,
          onClick: () => {
            const input = document.getElementById("new-profile-name");
            const name = input.value.trim();
            if (!name) {
              this.infoModal("还没有名字", "请先输入这个使用者的名字。");
              return;
            }
            const id = `profile-${Date.now()}`;
            this.profiles.push({ id, name });
            this.saveProfiles();
            this.switchProfile(id);
            this.closeModal();
          }
        }
      ],
      afterRender: () => {
        document.querySelectorAll(".switch-profile-btn").forEach(button => {
          button.addEventListener("click", () => {
            this.switchProfile(button.dataset.profileId);
            this.closeModal();
          });
        });
      }
    });
  }

  switchProfile(profileId) {
    this.activeProfileId = profileId;
    localStorage.setItem("houchang-active-profile", profileId);
    this.reloadProfileScopedData();
    this.currentTask = null;
    this.currentStepIndex = 0;
    this.currentUserImage = null;
    this.updateProfileChip();
    this.updateStreakBadge();
    this.updateResumeCard();
    this.renderTaskGrid();
    this.goHome();
  }

  buildDefaultHelp(instruction) {
    return {
      helpNotFound: [
        "先看这一步平时使用的固定位置。",
        `再问带教人员“${instruction}”要用到什么。`,
        "还是不确定，就请对方现场指给你看。"
      ],
      helpNeed: [
        `我现在做到“${instruction}”这一步了，请帮帮我。`,
        `请再带我做一次“${instruction}”。`
      ]
    };
  }

  openCustomTaskBuilder() {
    const html = `
      <label class="field-label">任务名称</label>
      <input id="task-name-input" type="text" placeholder="例如：茶水间补给准备">
      <label class="field-label">任务分类</label>
      <select id="task-category-input">
        <option value="restaurant">餐厅</option>
        <option value="snack">零食</option>
        <option value="warehouse">仓库</option>
        <option value="carwash">洗车</option>
      </select>
      <label class="field-label">一句话说明</label>
      <input id="task-description-input" type="text" placeholder="例如：把这个岗位的开工准备拆成清楚步骤。">
      <label class="field-label">步骤内容</label>
      <textarea id="task-steps-input" placeholder="每行写一步，可用 | 分隔更多信息。&#10;格式：步骤名称|补充说明|更简单说法|为什么要做&#10;示例：擦工作台|把水渍和碎屑擦干净|把桌子擦干净|这样后面摆工具更方便"></textarea>
      <p class="inline-note">不需要懂代码。每行写一步就可以；如果只写步骤名称，系统也会自动补齐默认说明。</p>
    `;
    this.showModal({
      title: "新建自定义任务",
      html,
      actions: [
        { label: "取消", variant: "secondary", onClick: () => {} },
        { label: "保存任务", variant: "primary", keepOpen: true, onClick: () => this.saveCustomTaskFromModal() }
      ]
    });
  }

  saveCustomTaskFromModal() {
    const title = document.getElementById("task-name-input").value.trim();
    const category = document.getElementById("task-category-input").value;
    const description = document.getElementById("task-description-input").value.trim() || "这是带教人员为当前使用者定制的任务。";
    const stepsText = document.getElementById("task-steps-input").value.trim();
    if (!title) {
      this.infoModal("任务名称还没填", "请先给这个任务起一个名字。");
      return;
    }
    if (!stepsText) {
      this.infoModal("步骤内容还没填", "至少写 1 条步骤，任务才能保存。");
      return;
    }

    const lines = stepsText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const customTaskId = `custom-${this.activeProfileId}-${Date.now()}`;
    const iconMap = { restaurant: "🍽️", snack: "🍬", warehouse: "📦", carwash: "🚗" };
    const imageMap = { restaurant: "icon-wipe", snack: "icon-shelf", warehouse: "icon-box", carwash: "icon-hose" };
    const steps = lines.map((line, index) => {
      const parts = line.split("|").map(item => item.trim());
      const instruction = parts[0];
      const detail = parts[1] || `${instruction}，按平时的方式一步一步完成。`;
      const simplify = parts[2] || instruction;
      const whyItMatters = parts[3] || "做完这一步，后面的流程会更顺。";
      const helpers = this.buildDefaultHelp(instruction);
      return {
        instruction,
        detail,
        simplify,
        image: imageMap[category] || "icon-check",
        userImageKey: `${customTaskId}-step-${index}`,
        helpNotFound: helpers.helpNotFound,
        helpNeed: helpers.helpNeed,
        whyItMatters
      };
    });

    this.customTasks.push({
      id: customTaskId,
      title,
      icon: iconMap[category] || "🧩",
      description,
      category,
      isCustom: true,
      steps
    });
    this.saveCustomTasks();
    this.renderTaskGrid();
    this.closeModal();
    this.infoModal("任务已保存", "这个自定义任务已经加入列表，当前使用者下次也能继续使用。");
  }

  createSharePayload() {
    const blocked = Object.values(this.stats.helpByStep || {})
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => ({ taskTitle: item.taskTitle, stepInstruction: item.stepInstruction, count: item.count }));
    return {
      profileName: this.getActiveProfile().name,
      totalTasks: this.stats.totalTasks,
      totalSteps: this.stats.totalSteps,
      helpCount: this.stats.helpCount,
      streak: this.stats.streak,
      recentTasks: this.stats.history.slice(0, 3),
      blocked,
      sharedAt: new Date().toLocaleString("zh-CN")
    };
  }

  createShareUrl(payload) {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return `${window.location.href.split("#")[0]}#share=${encoded}`;
  }

  async copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!copied) throw new Error("copy-failed");
  }

  decodeSharePayload() {
    const hash = window.location.hash || "";
    if (!hash.startsWith("#share=")) return null;
    try {
      return JSON.parse(decodeURIComponent(escape(atob(hash.replace("#share=", "")))));
    } catch (error) {
      return null;
    }
  }

  showSharedViewIfNeeded() {
    const payload = this.decodeSharePayload();
    if (!payload) return;
    const blockedHtml = (payload.blocked || []).length
      ? payload.blocked.map(item => `<li>${escapeHtml(item.taskTitle)} · ${escapeHtml(item.stepInstruction)}（${item.count} 次）</li>`).join("")
      : "<li>当前没有记录到明显卡点</li>";
    this.showModal({
      title: "带教查看进度",
      html: `
        <div class="share-card">
          <div class="share-summary-card">
            <div class="profile-row-title">${escapeHtml(payload.profileName)}</div>
            <div class="profile-row-meta">分享时间：${escapeHtml(payload.sharedAt || "")}</div>
          </div>
          <div class="share-summary-card">
            <div class="profile-row-meta">已完成 ${payload.totalTasks} 个任务 · 完成步骤 ${payload.totalSteps} 次 · 求助 ${payload.helpCount} 次 · 连续 ${payload.streak} 天</div>
          </div>
          <div class="share-summary-card">
            <div class="profile-row-title">最近完成</div>
            <div class="profile-row-meta">${(payload.recentTasks || []).map(item => `${escapeHtml(item.task)}（${escapeHtml(item.time)}）`).join("<br>") || "暂无记录"}</div>
          </div>
          <div class="share-summary-card">
            <div class="profile-row-title">最常卡住的步骤</div>
            <ul>${blockedHtml}</ul>
          </div>
        </div>
      `,
      actions: [{ label: "我知道了", variant: "primary", onClick: () => {} }]
    });
  }

  downloadShareCard(payload) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f5f6fa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#27ae60";
    ctx.fillRect(0, 0, canvas.width, 180);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 60px Microsoft YaHei";
    ctx.fillText("一步步 · 进度分享", 80, 105);
    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 52px Microsoft YaHei";
    ctx.fillText(`${payload.profileName}`, 80, 280);
    ctx.font = "34px Microsoft YaHei";
    ctx.fillStyle = "#4b5563";
    ctx.fillText(`已完成任务：${payload.totalTasks}`, 80, 370);
    ctx.fillText(`完成步骤：${payload.totalSteps}`, 80, 430);
    ctx.fillText(`求助次数：${payload.helpCount}`, 80, 490);
    ctx.fillText(`连续完成：${payload.streak} 天`, 80, 550);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 40px Microsoft YaHei";
    ctx.fillText("最近完成的任务", 80, 670);
    ctx.font = "30px Microsoft YaHei";
    let currentY = 740;
    (payload.recentTasks || []).slice(0, 3).forEach(item => {
      ctx.fillStyle = "#374151";
      ctx.fillText(`• ${item.task}`, 90, currentY);
      currentY += 48;
      ctx.fillStyle = "#6b7280";
      ctx.fillText(item.time, 130, currentY);
      currentY += 58;
    });
    const blocked = (payload.blocked || []).slice(0, 3);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 40px Microsoft YaHei";
    ctx.fillText("最常卡住的步骤", 80, currentY + 40);
    ctx.font = "30px Microsoft YaHei";
    currentY += 110;
    if (!blocked.length) {
      ctx.fillStyle = "#6b7280";
      ctx.fillText("当前没有明显卡点。", 90, currentY);
    } else {
      blocked.forEach(item => {
        ctx.fillStyle = "#374151";
        ctx.fillText(`• ${item.taskTitle} / ${item.stepInstruction}`, 90, currentY);
        currentY += 46;
        ctx.fillStyle = "#6b7280";
        ctx.fillText(`出现 ${item.count} 次`, 130, currentY);
        currentY += 54;
      });
    }
    ctx.fillStyle = "#6b7280";
    ctx.font = "28px Microsoft YaHei";
    ctx.fillText(`生成时间：${payload.sharedAt}`, 80, 1320);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `一步步-${payload.profileName}-进度分享.png`;
    link.click();
  }

  openShareProgress() {
    const payload = this.createSharePayload();
    const shareUrl = this.createShareUrl(payload);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;
    this.showModal({
      title: "分享当前进度",
      html: `
        <div class="share-card">
          <div class="share-summary-card">
            <div class="profile-row-title">${escapeHtml(payload.profileName)} 的进度摘要</div>
            <div class="profile-row-meta">已完成 ${payload.totalTasks} 个任务 · 求助 ${payload.helpCount} 次 · 连续 ${payload.streak} 天</div>
          </div>
          <div class="share-qr-wrap">
            <img class="share-qr" src="${qrUrl}" alt="分享二维码" onerror="handleShareQrError(this)">
            <div class="share-qr-fallback hidden">
              当前网络下二维码没有加载出来，你仍然可以直接复制下面的分享链接。
            </div>
          </div>
          <div class="share-summary-card">
            <div class="profile-row-title">扫码说明</div>
            <div class="profile-row-meta">带教人员扫码后，会在浏览器里看到当前这份进度摘要。部署到 GitHub Pages / Vercel 后更适合跨设备使用。</div>
            <div class="share-link">${escapeHtml(shareUrl)}</div>
          </div>
        </div>
      `,
      actions: [
        { label: "关闭", variant: "secondary", onClick: () => {} },
        {
          label: "复制链接",
          variant: "secondary",
          keepOpen: true,
          onClick: async () => {
            try {
              await this.copyText(shareUrl);
              this.infoModal("链接已复制", "现在可以把链接直接发给带教人员。");
            } catch (error) {
              this.infoModal("复制失败", "这个浏览器暂时没有复制成功，可以手动复制下面的链接。");
            }
          }
        },
        {
          label: "生成分享图",
          variant: "primary",
          keepOpen: true,
          onClick: () => this.downloadShareCard(payload)
        }
      ]
    });
  }

  openVideoIdea() {
    this.showModal({
      title: "📹 一键视频求助",
      html: `
        <div class="share-card">
          <div class="share-summary-card">
            <div class="profile-row-title">未来可以接入的远程协助方式</div>
            <div class="profile-row-meta">当前版本先不做真实视频通话，但可以作为下一阶段扩展方向。</div>
          </div>
          <div class="share-summary-card">
            <ul>
              <li>一键呼叫带教人员，直接连到当前步骤。</li>
              <li>视频通话时同步展示“我做到哪一步了”。</li>
              <li>带教人员可远程圈出图片中的目标位置，例如“抹布在这里”。</li>
              <li>技术上可优先考虑 WebRTC，或接入现成会议服务做轻量化协助。</li>
            </ul>
          </div>
        </div>
      `,
      actions: [{ label: "我知道了", variant: "primary", onClick: () => {} }]
    });
  }

  updateNavState() {
    const homePage = document.getElementById("home-page");
    const statsPage = document.getElementById("stats-page");
    const navHome = document.getElementById("nav-home");
    const navStats = document.getElementById("nav-stats");
    if (statsPage.classList.contains("active")) {
      navHome.classList.remove("active");
      navStats.classList.add("active");
    } else if (homePage.classList.contains("active")) {
      navHome.classList.add("active");
      navStats.classList.remove("active");
    } else {
      navHome.classList.remove("active");
      navStats.classList.remove("active");
    }
  }

  async startTask(taskId) {
    const task = this.getAllTasks().find(item => item.id === taskId);
    if (!task) return;
    this.clearSmartHelpTimers();
    this.currentTask = task;
    this.currentStepIndex = 0;
    this.hideAssist();
    this.stopSpeaking();
    document.getElementById("task-title").textContent = task.title;
    this.showPage("task-page");
    this.updateNavState();
    await this.renderStep();
    setTimeout(() => this.speakCurrentStep(), 250);
  }

  async resumeTask(taskId, stepIndex) {
    const task = this.getAllTasks().find(item => item.id === taskId);
    if (!task) return;
    this.clearSmartHelpTimers();
    this.currentTask = task;
    this.currentStepIndex = stepIndex;
    this.hideAssist();
    this.stopSpeaking();
    document.getElementById("task-title").textContent = task.title;
    this.showPage("task-page");
    this.updateNavState();
    await this.renderStep();
  }

  getCurrentStep() {
    return this.currentTask ? this.currentTask.steps[this.currentStepIndex] : null;
  }

  getCurrentImageKey() {
    const step = this.getCurrentStep();
    if (!step || !this.currentTask) return null;
    const localKey = step.userImageKey || `${this.currentTask.id}-step-${this.currentStepIndex}`;
    return `${this.activeProfileId}-${localKey}`;
  }

  async loadCurrentStepImage() {
    const key = this.getCurrentImageKey();
    if (!key || !this.imageStoreAvailable) return null;
    try {
      return await getStoredImage(key);
    } catch (error) {
      this.imageStoreAvailable = false;
      return null;
    }
  }

  async renderStep() {
    if (!this.currentTask) return;
    const step = this.getCurrentStep();
    const totalSteps = this.currentTask.steps.length;
    const progress = ((this.currentStepIndex + 1) / totalSteps) * 100;
    document.getElementById("progress-fill").style.width = `${progress}%`;
    document.getElementById("progress-text").textContent = `第 ${this.currentStepIndex + 1} 步，共 ${totalSteps} 步`;
    document.getElementById("step-instruction").textContent = step.instruction;
    document.getElementById("step-detail").textContent = step.detail;
    document.getElementById("step-why").textContent = `为什么要做：${step.whyItMatters}`;
    document.getElementById("step-image").innerHTML = `<use href="#${step.image || "icon-check"}"/>`;
    this.currentUserImage = await this.loadCurrentStepImage();
    this.renderStepImageState(step);
    this.renderStepVideo();
    this.renderStepRiskInfo();
    this.hideAssist();
    this.startSmartHelpTimers();
    this.saveProgress();
  }

  renderStepImageState(step) {
    const photo = document.getElementById("step-photo");
    const svg = document.getElementById("step-image");
    const placeholder = document.getElementById("step-image-placeholder");
    const uploadBtn = document.getElementById("upload-image-btn");
    const annotateBtn = document.getElementById("annotate-image-btn");
    const replaceBtn = document.getElementById("replace-image-btn");
    const removeBtn = document.getElementById("remove-image-btn");
    if (this.currentUserImage) {
      photo.src = this.currentUserImage;
      photo.classList.remove("hidden");
      svg.classList.add("hidden");
      placeholder.classList.add("hidden");
      uploadBtn.classList.add("hidden");
      annotateBtn.classList.remove("hidden");
      replaceBtn.classList.remove("hidden");
      removeBtn.classList.remove("hidden");
      return;
    }
    photo.src = "";
    photo.classList.add("hidden");
    if (step.image) {
      svg.classList.remove("hidden");
      placeholder.classList.add("hidden");
    } else {
      svg.classList.add("hidden");
      placeholder.classList.remove("hidden");
    }
    uploadBtn.classList.remove("hidden");
    annotateBtn.classList.add("hidden");
    replaceBtn.classList.add("hidden");
    removeBtn.classList.add("hidden");
  }

  async handleImageSelected(event) {
    const [file] = event.target.files || [];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      this.infoModal("文件格式不支持", "请上传 JPG、PNG 或 WebP 图片。");
      return;
    }
    if (!this.imageStoreAvailable) {
      this.infoModal("当前无法保存图片", "这个浏览器环境暂时不能保存图片，页面会继续使用默认示意图。");
      return;
    }
    try {
      const compressed = await compressImage(file);
      await setStoredImage(this.getCurrentImageKey(), compressed);
      this.currentUserImage = compressed;
      this.renderStepImageState(this.getCurrentStep());
    } catch (error) {
      this.infoModal("图片保存失败", "这张图片没有保存成功，你可以换一张再试。");
    }
  }

  async removeCurrentStepImage() {
    if (!this.imageStoreAvailable) return;
    const confirmed = await this.confirmModal("删除参考图", "要删除这一步的参考图片吗？");
    if (!confirmed) return;
    try {
      await deleteStoredImage(this.getCurrentImageKey());
      this.currentUserImage = null;
      this.renderStepImageState(this.getCurrentStep());
    } catch (error) {
      this.infoModal("删除失败", "这张图片暂时没有删除成功。");
    }
  }

  getCurrentVideoKey() {
    const step = this.getCurrentStep();
    if (!step || !this.currentTask) return null;
    return `video-${this.activeProfileId}-${this.currentTask.id}-step-${this.currentStepIndex}`;
  }

  async loadCurrentStepVideo() {
    const key = this.getCurrentVideoKey();
    if (!key || !this.imageStoreAvailable) return null;
    try {
      return await getStoredImage(key);
    } catch (error) {
      return null;
    }
  }

  async handleVideoSelected(event) {
    const [file] = event.target.files || [];
    event.target.value = "";
    if (!file) return;
    if (!/^video\/(mp4|webm)$/.test(file.type)) {
      this.infoModal("文件格式不支持", "请上传 MP4 或 WebM 格式的视频。");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      this.infoModal("视频文件太大", "请上传小于 50MB 的视频。");
      return;
    }
    try {
      const videoUrl = URL.createObjectURL(file);
      const video = document.getElementById("step-video");
      if (video) {
        video.src = videoUrl;
        video.play().catch(() => {});
      }
      const removeBtn = document.getElementById("remove-video-btn");
      if (removeBtn) removeBtn.style.display = "inline-block";
      await setStoredImage(this.getCurrentVideoKey(), videoUrl);
    } catch (error) {
      this.infoModal("视频保存失败", "这段视频没有保存成功，你可以换一段再试。");
    }
  }

  async removeCurrentStepVideo() {
    const confirmed = await this.confirmModal("删除视频", "要删除这一步的视频教程吗？");
    if (!confirmed) return;
    try {
      const video = document.getElementById("step-video");
      if (video) video.src = "";
      const removeBtn = document.getElementById("remove-video-btn");
      if (removeBtn) removeBtn.style.display = "none";
      if (this.imageStoreAvailable) {
        await deleteStoredImage(this.getCurrentVideoKey());
      }
    } catch (error) {
      this.infoModal("删除失败", "这段视频暂时没有删除成功。");
    }
  }

  async renderStepVideo() {
    const videoContainer = document.getElementById("video-container");
    const video = document.getElementById("step-video");
    const removeBtn = document.getElementById("remove-video-btn");
    const videoUrl = await this.loadCurrentStepVideo();
    if (videoUrl) {
      videoContainer.style.display = "block";
      video.src = videoUrl;
      removeBtn.style.display = "inline-block";
    } else {
      videoContainer.style.display = "none";
      video.src = "";
      removeBtn.style.display = "none";
    }
  }

  showAssist(type) {
    const step = this.getCurrentStep();
    if (!step) return;
    const panel = document.getElementById("assist-panel");
    const title = document.getElementById("assist-title");
    const content = document.getElementById("assist-content");
    if (type === "simplify") {
      this.recordHelp("simplify");
      title.textContent = "再说简单一点";
      content.innerHTML = `<p>${escapeHtml(step.simplify)}</p>`;
      this.speak(step.simplify);
    }
    if (type === "notfound") {
      this.recordHelp("notfound");
      title.textContent = "找不到时可以这样做";
      content.innerHTML = `<ul>${step.helpNotFound.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
      this.speak(step.helpNotFound.join("。"));
    }
    if (type === "need") {
      this.recordHelp("need");
      title.textContent = "需要帮助时可以这样说";
      content.innerHTML = `<ul>${step.helpNeed.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
      this.speak(step.helpNeed.join("。"));
    }
    panel.classList.remove("hidden");
  }

  hideAssist() {
    document.getElementById("assist-panel").classList.add("hidden");
  }

  speakCurrentStep() {
    const step = this.getCurrentStep();
    if (!step) return;
    this.speak(`${step.instruction}。${step.detail}`);
  }

  speak(text) {
    this.stopSpeaking();
    if (!this.synth || typeof window.SpeechSynthesisUtterance === "undefined") return;
    const settings = this.getVoiceSettings();
    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.lang = settings.lang;
    this.currentUtterance.rate = settings.rate;
    this.currentUtterance.pitch = 1;
    const voiceBtn = document.getElementById("voice-btn");
    voiceBtn.classList.add("speaking");
    this.currentUtterance.onend = () => voiceBtn.classList.remove("speaking");
    this.currentUtterance.onerror = () => voiceBtn.classList.remove("speaking");
    this.synth.speak(this.currentUtterance);
  }

  stopSpeaking() {
    if (this.synth) this.synth.cancel();
    const voiceBtn = document.getElementById("voice-btn");
    if (voiceBtn) voiceBtn.classList.remove("speaking");
  }

  getCompletionChecks() {
    const step = this.getCurrentStep();
    if (!step) return [];
    const combined = `${step.instruction} ${step.detail}`;
    const checks = ["\u6211\u5df2\u7ecf\u505a\u5b8c\u8fd9\u4e00\u6b65\u7684\u4e3b\u8981\u52a8\u4f5c"];

    if (/\u68c0\u67e5|\u786e\u8ba4|\u6700\u540e|\u518d\u770b|\u770b\u4e00\u904d/.test(combined)) {
      checks.push("\u6211\u5df2\u7ecf\u91cd\u65b0\u770b\u4e86\u4e00\u904d\uff0c\u6ca1\u6709\u6f0f\u6389");
    } else if (/\u6446|\u653e|\u5f52\u4f4d|\u5957|\u8d34/.test(combined)) {
      checks.push("\u6211\u5df2\u7ecf\u653e\u5230\u6b63\u786e\u4f4d\u7f6e\u4e86");
    } else if (/\u64e6|\u626b|\u51b2|\u6d17|\u6e05\u7406/.test(combined)) {
      checks.push("\u6211\u5df2\u7ecf\u5904\u7406\u5e72\u51c0\u4e86");
    } else if (/\u8865|\u51c6\u5907|\u7a7f|\u6234|\u62ff/.test(combined)) {
      checks.push("\u6211\u5df2\u7ecf\u51c6\u5907\u597d\u9700\u8981\u7684\u4e1c\u897f\u4e86");
    } else {
      checks.push("\u6211\u5df2\u7ecf\u5bf9\u7167\u63d0\u793a\u548c\u56fe\u7247\u786e\u8ba4\u8fc7\u4e86");
    }

    return checks.slice(0, 2);
  }

  async requestCompleteConfirmation() {
    const risk = this.getStepRiskInfo();
    if (!risk && this.smartHelpStage === 0) return true;

    const checks = this.getCompletionChecks();
    const levelLabel = risk?.level === "high" ? "\u9700\u8981\u91cd\u70b9\u786e\u8ba4" : "\u5b8c\u6210\u524d\u5c0f\u786e\u8ba4";
    const reason = risk?.level === "high"
      ? "\u8fd9\u4e00\u6b65\u4ee5\u524d\u66f4\u5bb9\u6613\u5361\u4f4f\uff0c\u5148\u6162\u6162\u5bf9\u7167\u4e00\u4e0b\u4f1a\u66f4\u5b89\u5fc3\u3002"
      : this.smartHelpStage > 0
        ? "\u521a\u624d\u7cfb\u7edf\u5df2\u7ecf\u63d0\u9192\u8fc7\u4f60\uff0c\u6211\u4eec\u518d\u7528\u4e24\u5f20\u5c0f\u5361\u7247\u786e\u8ba4\u4e00\u6b21\u5c31\u597d\u3002"
        : "\u8fd9\u4e00\u6b65\u518d\u786e\u8ba4\u4e00\u4e0b\uff0c\u540e\u9762\u4f1a\u66f4\u987a\u3002";
    return new Promise(resolve => {
      const html = `
        <div class="confirm-list">
          <div class="confirm-intro">
            <div class="confirm-intro-badge">${levelLabel}</div>
            <div class="confirm-intro-row">
              <div class="confirm-intro-mark" aria-hidden="true"></div>
              <div class="confirm-intro-copy">
                <div class="confirm-intro-title">\u518d\u786e\u8ba4\u4e00\u4e0b\uff0c\u5c31\u53ef\u4ee5\u5b89\u5fc3\u70b9\u5b8c\u6210</div>
                <p class="confirm-intro-text">${reason}</p>
              </div>
            </div>
            <div class="confirm-progress" aria-live="polite">
              <span class="confirm-progress-label">\u5df2\u786e\u8ba4</span>
              <strong id="confirm-progress-count">0/${checks.length}</strong>
            </div>
          </div>
          ${checks.map((item, index) => `
            <button type="button" class="confirm-card" data-index="${index}" data-selected="false">
              <span class="confirm-card-check" aria-hidden="true"></span>
              <span class="confirm-card-text">${escapeHtml(item)}</span>
            </button>
          `).join("")}
        </div>
      `;

      this.showModal({
        title: "\u5b8c\u6210\u524d\u518d\u786e\u8ba4\u4e00\u4e0b",
        html,
        modalClass: "confirm-modal",
        actions: [
          { label: "\u518d\u770b\u4e00\u4e0b", variant: "secondary", className: "confirm-back-btn", onClick: () => resolve(false) },
          { label: "\u786e\u8ba4\u5b8c\u6210", variant: "primary", className: "confirm-submit-btn", keepOpen: true, onClick: () => {
              const btn = this.modalActions.querySelector(".btn-primary");
              if (btn && btn.disabled) return;
              this.closeModal();
              resolve(true);
            } }
        ],
        afterRender: () => {
          const checksEls = Array.from(document.querySelectorAll(".confirm-card"));
          const confirmBtn = this.modalActions.querySelector(".btn-primary");
          const progressCount = document.getElementById("confirm-progress-count");
          const sync = () => {
            const selectedCount = checksEls.filter(item => item.dataset.selected === "true").length;
            if (progressCount) progressCount.textContent = `${selectedCount}/${checksEls.length}`;
            if (!confirmBtn) return;
            confirmBtn.disabled = !checksEls.every(item => item.dataset.selected === "true");
            confirmBtn.style.opacity = confirmBtn.disabled ? "0.55" : "1";
          };
          sync();
          checksEls.forEach(item => item.addEventListener("click", () => {
            const selected = item.dataset.selected === "true";
            item.dataset.selected = selected ? "false" : "true";
            item.classList.toggle("active", !selected);
            sync();
          }));
        }
      });
    });
  }

  async completeStep() {
    if (!this.currentTask) return;
    const confirmed = await this.requestCompleteConfirmation();
    if (!confirmed) return;
    const durationMs = this.stepStartedAt ? Date.now() - this.stepStartedAt : 0;
    this.recordStep(durationMs);
    this.clearSmartHelpTimers();
    this.hideAssist();
    this.stopSpeaking();
    playSuccessSound();
    this.currentStepIndex += 1;
    if (this.currentStepIndex >= this.currentTask.steps.length) {
      this.recordTaskComplete(this.currentTask.title);
      this.clearProgress();
      this.showComplete();
      return;
    }
    await this.renderStep();
    setTimeout(() => this.speakCurrentStep(), 200);
  }

  showComplete() {
    this.clearSmartHelpTimers();
    playCompleteSound();
    const message = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
    document.getElementById("complete-icon").textContent = message.icon;
    document.getElementById("complete-title").textContent = message.title;
    document.getElementById("complete-message").textContent = message.text;
    const reward = this.checkAchievements();
    const rewardSection = document.getElementById("reward-section");
    if (reward) {
      rewardSection.style.display = "block";
      document.getElementById("reward-badge").textContent = reward.icon;
      document.getElementById("reward-text").textContent = reward.text;
    } else {
      rewardSection.style.display = "none";
    }
    this.showPage("complete-page");
    this.updateNavState();
    this.updateStreakBadge();
  }

  async restartTask() {
    if (!this.currentTask) return;
    this.clearSmartHelpTimers();
    this.currentStepIndex = 0;
    this.showPage("task-page");
    this.updateNavState();
    await this.renderStep();
  }

  goHome() {
    this.clearSmartHelpTimers();
    this.stopSpeaking();
    this.currentTask = null;
    this.currentStepIndex = 0;
    this.currentUserImage = null;
    this.hideAssist();
    this.showPage("home-page");
    this.updateNavState();
    this.renderTaskGrid();
    this.updateResumeCard();
  }

  showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
    document.getElementById(pageId).classList.add("active");
  }

  showStats() {
    this.renderStats();
    this.renderCalendar();
    this.showPage("stats-page");
    this.updateNavState();
  }

  buildCoachInsights() {
    const blocked = Object.values(this.stats.helpByStep || {}).sort((a, b) => b.count - a.count);
    const autoHelp = Object.values(this.stats.autoHelpByStep || {}).sort((a, b) => b.count - a.count);
    const slowSteps = Object.values(this.stats.stepMetrics || {})
      .filter(item => item.count > 0)
      .sort((a, b) => b.averageDurationMs - a.averageDurationMs);

    const highlights = [];
    const suggestions = [];

    if (blocked[0]) {
      highlights.push(`\u6700\u5e38\u5361\u4f4f\uff1a${blocked[0].taskTitle} / ${blocked[0].stepInstruction}\uff08${blocked[0].count} \u6b21\u6c42\u52a9\uff09`);
      const kinds = blocked[0].kinds || {};
      const dominantKind = Object.keys(kinds).sort((a, b) => (kinds[b] || 0) - (kinds[a] || 0))[0];
      if (dominantKind === "notfound") {
        suggestions.push(`\u7ed9\u201c${blocked[0].stepInstruction}\u201d\u8865\u4e00\u5f20\u73b0\u573a\u5b9e\u62cd\u56fe\uff0c\u5e76\u7528\u7bad\u5934\u6807\u51fa\u5177\u4f53\u4f4d\u7f6e\u3002`);
      } else if (dominantKind === "simplify") {
        suggestions.push(`\u628a\u201c${blocked[0].stepInstruction}\u201d\u518d\u62c6\u7ec6\u4e00\u70b9\uff0c\u5c3d\u91cf\u4fdd\u6301\u4e00\u6b65\u53ea\u505a\u4e00\u4e2a\u52a8\u4f5c\u3002`);
      } else if (dominantKind === "need") {
        suggestions.push(`\u7ed9\u201c${blocked[0].stepInstruction}\u201d\u8865\u4e00\u6761\u540c\u4e8b\u786e\u8ba4\u8bdd\u672f\uff0c\u65b9\u4fbf\u76f4\u63a5\u6c42\u52a9\u3002`);
      }
    }

    if (autoHelp[0]) {
      highlights.push(`\u7cfb\u7edf\u6700\u5e38\u4e3b\u52a8\u63d0\u9192\uff1a${autoHelp[0].taskTitle} / ${autoHelp[0].stepInstruction}\uff08${autoHelp[0].count} \u6b21\uff09`);
      suggestions.push(`\u201c${autoHelp[0].stepInstruction}\u201d\u7ecf\u5e38\u505c\u7559\u8fc7\u4e45\uff0c\u5efa\u8bae\u8865\u4e00\u6761\u66f4\u77ed\u7684\u63d0\u793a\u8bed\u6216\u53c2\u8003\u7167\u7247\u3002`);
    }

    if (slowSteps[0]) {
      highlights.push(`\u5e73\u5747\u8017\u65f6\u6700\u957f\uff1a${slowSteps[0].taskTitle} / ${slowSteps[0].stepInstruction}\uff08\u7ea6 ${this.formatDuration(slowSteps[0].averageDurationMs)}\uff09`);
    }

    if (this.stats.helpCount >= 6) {
      highlights.push(`\u5f53\u524d\u4f7f\u7528\u8005\u7d2f\u8ba1\u6c42\u52a9 ${this.stats.helpCount} \u6b21\uff0c\u8bf4\u660e\u90e8\u5206\u6b65\u9aa4\u8fd8\u9700\u8981\u7ee7\u7eed\u964d\u96be\u5ea6\u3002`);
    }

    if (!highlights.length) {
      highlights.push("\u8bb0\u5f55\u8fd8\u4e0d\u591a\uff0c\u5148\u7ee7\u7eed\u5b8c\u6210\u4efb\u52a1\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u603b\u7ed3\u5361\u70b9\u3002");
    }

    if (!suggestions.length) {
      suggestions.push("\u5148\u8ba9\u4f7f\u7528\u8005\u7ee7\u7eed\u5b8c\u6210 2 \u5230 3 \u4e2a\u4efb\u52a1\uff0c\u7cfb\u7edf\u4f1a\u7ed9\u51fa\u66f4\u5177\u4f53\u7684\u6b65\u9aa4\u4f18\u5316\u5efa\u8bae\u3002");
    }

    return { highlights: highlights.slice(0, 4), suggestions: suggestions.slice(0, 4) };
  }

  buildRiskOverview() {
    const keys = new Set([
      ...Object.keys(this.stats.helpByStep || {}),
      ...Object.keys(this.stats.autoHelpByStep || {}),
      ...Object.keys(this.stats.stepMetrics || {})
    ]);

    const summary = { low: 0, medium: 0, high: 0 };
    keys.forEach(key => {
      const level = this.getRiskLevelFromScore(this.getRiskScoreForKey(key));
      summary[level] += 1;
    });
    return summary;
  }

  renderStats() {
    document.getElementById("total-tasks").textContent = this.stats.totalTasks;
    document.getElementById("total-steps").textContent = this.stats.totalSteps;
    document.getElementById("help-count").textContent = this.stats.helpCount;
    document.getElementById("streak-big").textContent = this.stats.streak;
    document.getElementById("streak-tip").textContent = this.stats.streak > 0 ? `\u5df2\u7ecf\u8fde\u7eed ${this.stats.streak} \u5929\u5b8c\u6210\u4efb\u52a1\uff0c\u7ee7\u7eed\u4fdd\u6301\u3002` : "\u4eca\u5929\u8fd8\u6ca1\u6709\u5b8c\u6210\u4efb\u52a1\uff0c\u505a\u5b8c\u4e00\u9879\u5c31\u4f1a\u5f00\u59cb\u7d2f\u8ba1\u3002";

    const historyList = document.getElementById("history-list");
    if (!this.stats.history.length) {
      historyList.innerHTML = '<p class="empty-history">\u8fd8\u6ca1\u6709\u5b8c\u6210\u8bb0\u5f55\uff0c\u5f00\u59cb\u5b8c\u6210\u4efb\u52a1\u5427\uff01</p>';
    } else {
      historyList.innerHTML = this.stats.history.slice(0, 10).map(item => `<div class="history-item"><span class="task-name">${escapeHtml(item.task)}</span><span class="task-time">${escapeHtml(item.time)}</span></div>`).join("");
    }

    const blockedList = document.getElementById("blocked-list");
    const sortedBlocked = Object.values(this.stats.helpByStep || {}).sort((a, b) => b.count - a.count).slice(0, 5);
    if (!sortedBlocked.length) {
      blockedList.innerHTML = '<p class="empty-history">\u8fd8\u6ca1\u6709\u5361\u70b9\u8bb0\u5f55\uff0c\u5148\u8bd5\u7740\u5b8c\u6210\u4efb\u52a1\u5427\uff01</p>';
    } else {
      blockedList.innerHTML = sortedBlocked.map(item => `<div class="history-item"><div><div class="task-name">${escapeHtml(item.taskTitle)}</div><div class="task-meta">${escapeHtml(item.stepInstruction)}</div></div><span class="task-time">${item.count} \u6b21</span></div>`).join("");
    }

    const coachInsights = document.getElementById("coach-insights");
    const coachSuggestions = document.getElementById("coach-suggestions");
    if (coachInsights && coachSuggestions) {
      const coachData = this.buildCoachInsights();
      coachInsights.innerHTML = coachData.highlights.map(item => `<div class="coach-chip">${escapeHtml(item)}</div>`).join("");
      coachSuggestions.innerHTML = coachData.suggestions.map(item => `<div class="history-item coach-suggestion"><div class="task-name">${escapeHtml(item)}</div></div>`).join("");
    }

    const lowCount = document.getElementById("risk-low-count");
    const mediumCount = document.getElementById("risk-medium-count");
    const highCount = document.getElementById("risk-high-count");
    const riskTip = document.getElementById("risk-overview-tip");
    if (lowCount && mediumCount && highCount && riskTip) {
      const overview = this.buildRiskOverview();
      lowCount.textContent = overview.low;
      mediumCount.textContent = overview.medium;
      highCount.textContent = overview.high;
      if (overview.high > 0) {
        riskTip.textContent = `当前有 ${overview.high} 个高风险步骤，建议优先补图片和更简单提示。`;
      } else if (overview.medium > 0) {
        riskTip.textContent = `当前主要是中风险步骤，继续使用后系统会自动判断哪些地方需要细化。`;
      } else if (overview.low > 0) {
        riskTip.textContent = "当前记录里主要是低风险步骤，说明任务流程已经比较稳定。";
      } else {
        riskTip.textContent = "继续使用后，这里会自动统计风险等级。";
      }
    }
  }

  renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayHeaders = ["日", "一", "二", "三", "四", "五", "六"];
    let html = dayHeaders.map(day => `<div class="calendar-day header">${day}</div>`).join("");
    for (let i = 0; i < firstDay; i += 1) html += '<div class="calendar-day empty"></div>';
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = new Date(year, month, day).toDateString();
      const isToday = dateStr === today.toDateString();
      const isChecked = this.stats.checkInDays.includes(dateStr);
      let classes = "calendar-day";
      if (isChecked) classes += " checked";
      else if (isToday) classes += " unchecked today";
      else if (day < today.getDate()) classes += " unchecked";
      html += `<div class="${classes}">${day}</div>`;
    }
    grid.innerHTML = html;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.houchangApp = new HouChangApp();
});

window.addEventListener("beforeunload", () => {
  if (window.houchangApp) window.houchangApp.stopSpeaking();
});
