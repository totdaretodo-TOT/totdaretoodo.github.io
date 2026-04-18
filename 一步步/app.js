const encouragementMessages = [
  { icon: "🌟", title: "这一项完成了", text: "你已经把这项任务做好了。" },
  { icon: "👏", title: "做得不错", text: "继续保持现在的节奏。" },
  { icon: "✅", title: "已经完成", text: "这一轮准备已经结束了。" }
];

const rewardMessages = {
  first: { icon: "🌱", text: "第一次完成任务，已经迈出很好的一步。" },
  streak3: { icon: "🔥", text: "连续 3 天完成任务，状态越来越稳。" },
  streak7: { icon: "⭐", text: "连续 7 天完成任务，很有坚持力。" },
  tasks10: { icon: "🎯", text: "已经完成 10 个任务，熟练度在提升。" }
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

    this.modalOverlay = document.getElementById("modal-overlay");
    this.modalTitle = document.getElementById("modal-title");
    this.modalMessage = document.getElementById("modal-message");
    this.modalActions = document.getElementById("modal-actions");

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
      history: [],
      streak: 0,
      lastCompletedDate: null,
      checkInDays: [],
      achievements: [],
      helpByStep: {}
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

  showModal({ title, message = "", html = "", actions = [], afterRender = null }) {
    this.modalTitle.textContent = title;
    this.modalMessage.innerHTML = html || escapeHtml(message).replace(/\n/g, "<br>");
    this.modalActions.innerHTML = "";
    this.modalOverlay.classList.remove("hidden");
    actions.forEach(action => {
      const button = document.createElement("button");
      button.className = action.variant === "primary" ? "btn btn-primary" : "btn btn-secondary";
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

  recordStep() {
    this.stats.totalSteps += 1;
    this.saveStats();
  }

  recordTaskComplete(taskTitle) {
    this.stats.totalTasks += 1;
    this.stats.history.unshift({ task: taskTitle, time: new Date().toLocaleString("zh-CN") });
    if (this.stats.history.length > 20) this.stats.history = this.stats.history.slice(0, 20);
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
    if (this.stats.totalTasks >= 10 && !this.stats.achievements.includes("tasks10")) {
      this.stats.achievements.push("tasks10");
      rewards.push(rewardMessages.tasks10);
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
    document.getElementById("replace-image-btn").addEventListener("click", () => document.getElementById("step-image-input").click());
    document.getElementById("remove-image-btn").addEventListener("click", () => this.removeCurrentStepImage());
    document.getElementById("step-image-input").addEventListener("change", event => this.handleImageSelected(event));
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
      title: "视频通话功能设想",
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
    this.hideAssist();
    this.saveProgress();
  }

  renderStepImageState(step) {
    const photo = document.getElementById("step-photo");
    const svg = document.getElementById("step-image");
    const placeholder = document.getElementById("step-image-placeholder");
    const uploadBtn = document.getElementById("upload-image-btn");
    const replaceBtn = document.getElementById("replace-image-btn");
    const removeBtn = document.getElementById("remove-image-btn");
    if (this.currentUserImage) {
      photo.src = this.currentUserImage;
      photo.classList.remove("hidden");
      svg.classList.add("hidden");
      placeholder.classList.add("hidden");
      uploadBtn.classList.add("hidden");
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
    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.lang = "zh-CN";
    this.currentUtterance.rate = 0.88;
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

  async completeStep() {
    if (!this.currentTask) return;
    this.recordStep();
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
    this.currentStepIndex = 0;
    this.showPage("task-page");
    this.updateNavState();
    await this.renderStep();
  }

  goHome() {
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

  renderStats() {
    document.getElementById("total-tasks").textContent = this.stats.totalTasks;
    document.getElementById("total-steps").textContent = this.stats.totalSteps;
    document.getElementById("help-count").textContent = this.stats.helpCount;
    document.getElementById("streak-big").textContent = this.stats.streak;
    document.getElementById("streak-tip").textContent = this.stats.streak > 0 ? `已经连续 ${this.stats.streak} 天完成任务，继续保持。` : "今天还没有完成任务，做完一项就会开始累计。";
    const historyList = document.getElementById("history-list");
    if (!this.stats.history.length) {
      historyList.innerHTML = '<p class="empty-history">还没有完成记录，开始完成任务吧！</p>';
    } else {
      historyList.innerHTML = this.stats.history.slice(0, 10).map(item => `<div class="history-item"><span class="task-name">${escapeHtml(item.task)}</span><span class="task-time">${escapeHtml(item.time)}</span></div>`).join("");
    }
    const blockedList = document.getElementById("blocked-list");
    const sortedBlocked = Object.values(this.stats.helpByStep || {}).sort((a, b) => b.count - a.count).slice(0, 5);
    if (!sortedBlocked.length) {
      blockedList.innerHTML = '<p class="empty-history">还没有卡点记录，先试着完成任务吧！</p>';
    } else {
      blockedList.innerHTML = sortedBlocked.map(item => `<div class="history-item"><div><div class="task-name">${escapeHtml(item.taskTitle)}</div><div class="task-meta">${escapeHtml(item.stepInstruction)}</div></div><span class="task-time">${item.count} 次</span></div>`).join("");
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
