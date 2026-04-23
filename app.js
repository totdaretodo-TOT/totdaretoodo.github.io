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
const TEACHING_PACKAGE_VERSION = 1;
const CUSTOM_TASK_ICON_MAP = {
  restaurant: "🍽️",
  snack: "🍬",
  warehouse: "📦",
  carwash: "🚗"
};
const CUSTOM_TASK_IMAGE_MAP = {
  restaurant: "icon-wipe",
  snack: "icon-shelf",
  warehouse: "icon-box",
  carwash: "icon-hose"
};

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

/**
 * 打开图像数据库
 * @returns {Promise<IDBDatabase>} 返回图像数据库实例
 */
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

/**
 * 获取存储的图像
 * @param {string} key 图像的键
 * @returns {Promise<string|null>} 返回图像的Base64编码，或null如果不存在
 */
async function getStoredImage(key) {
  try {
    const db = await openImageDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction(IMAGE_STORE_NAME, "readonly").objectStore(IMAGE_STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("读取图片失败"));
    });
  } catch (error) {
    console.error("获取存储图片失败:", error);
    return null;
  }
}

/**
 * 存储图像
 * @param {string} key 图像的键
 * @param {string} value 图像的Base64编码
 * @returns {Promise<void>}
 */
async function setStoredImage(key, value) {
  try {
    const db = await openImageDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction(IMAGE_STORE_NAME, "readwrite").objectStore(IMAGE_STORE_NAME).put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("保存图片失败"));
    });
  } catch (error) {
    console.error("存储图片失败:", error);
    throw error;
  }
}

/**
 * 删除存储的图像
 * @param {string} key 图像的键
 * @returns {Promise<void>}
 */
async function deleteStoredImage(key) {
  try {
    const db = await openImageDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction(IMAGE_STORE_NAME, "readwrite").objectStore(IMAGE_STORE_NAME).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("删除图片失败"));
    });
  } catch (error) {
    console.error("删除存储图片失败:", error);
    return;
  }
}

/**
 * 将文件转换为Image对象
 * @param {File} file 要转换的文件
 * @returns {Promise<HTMLImageElement>} 返回Image对象
 */
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("解析图片失败"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

/**
 * 压缩图像
 * @param {File} file 要压缩的图像文件
 * @returns {Promise<string>} 返回压缩后的图像Base64编码
 */
async function compressImage(file) {
  try {
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
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("创建画布上下文失败");
    }
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch (error) {
    console.error("压缩图片失败:", error);
    throw error;
  }
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
    this.voiceActivated = false;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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

/**
 * 初始化应用
 * @async
 */
  async init() {
    // 显示加载屏幕
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.display = "flex";
    }
    
    try {
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
      this.showIncomingHashViewIfNeeded();
    } catch (error) {
      console.error("初始化失败:", error);
      this.infoModal("初始化失败", "应用初始化时出现错误，请刷新页面重试。");
    } finally {
      // 隐藏加载屏幕
      if (loadingScreen) {
        loadingScreen.style.display = "none";
      }
    }
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (error) {
      console.error("加载用户配置失败:", error);
    }
    const defaults = [{ id: "profile-default", name: "默认使用者" }];
    try {
      localStorage.setItem("houchang-profiles", JSON.stringify(defaults));
    } catch (error) {
      console.error("保存默认配置失败:", error);
    }
    return defaults;
  }

  saveProfiles() {
    try {
      localStorage.setItem("houchang-profiles", JSON.stringify(this.profiles));
    } catch (error) {
      console.error("保存用户配置失败:", error);
    }
  }

  loadActiveProfileId() {
    try {
      const saved = localStorage.getItem("houchang-active-profile");
      if (saved && this.profiles.some(profile => profile.id === saved)) return saved;
    } catch (error) {
      console.error("加载活跃用户ID失败:", error);
    }
    const fallback = this.profiles[0]?.id || "profile-default";
    try {
      localStorage.setItem("houchang-active-profile", fallback);
    } catch (error) {
      console.error("保存活跃用户ID失败:", error);
    }
    return fallback;
  }

  getActiveProfile() {
    return this.profiles.find(profile => profile.id === this.activeProfileId) || this.profiles[0];
  }

  getScopedKey(base) {
    return `${base}-${this.activeProfileId}`;
  }

  getPreferenceKey(name) {
    return this.getScopedKey(`houchang-pref-${name}`);
  }

  loadScopedPreference(name, legacyKey, defaultValue) {
    try {
      const scopedKey = this.getPreferenceKey(name);
      const scopedValue = localStorage.getItem(scopedKey);
      if (scopedValue !== null) return scopedValue;

      if (legacyKey) {
        const legacyValue = localStorage.getItem(legacyKey);
        if (legacyValue !== null) {
          localStorage.setItem(scopedKey, legacyValue);
          return legacyValue;
        }
      }
    } catch (error) {
      console.error(`加载偏好设置 ${name} 失败:`, error);
    }
    return defaultValue;
  }

  saveScopedPreference(name, value) {
    try {
      localStorage.setItem(this.getPreferenceKey(name), String(value));
    } catch (error) {
      console.error(`保存偏好设置 ${name} 失败:`, error);
    }
  }

  reloadProfileScopedData() {
    this.stats = this.loadStats();
    this.customTasks = this.loadCustomTasks();
    this.contacts = this.loadContacts();
  }

  loadStats() {
    try {
      const saved = localStorage.getItem(this.getScopedKey("houchang-stats"));
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this.createEmptyStats(), ...parsed };
      }
    } catch (error) {
      console.error("加载统计数据失败:", error);
    }
    return this.createEmptyStats();
  }

  saveStats() {
    try {
      localStorage.setItem(this.getScopedKey("houchang-stats"), JSON.stringify(this.stats));
    } catch (error) {
      console.error("保存统计数据失败:", error);
    }
  }

  loadCustomTasks() {
    try {
      const saved = localStorage.getItem(this.getScopedKey("houchang-custom-tasks"));
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error("加载自定义任务失败:", error);
    }
    return [];
  }

  saveCustomTasks() {
    try {
      localStorage.setItem(this.getScopedKey("houchang-custom-tasks"), JSON.stringify(this.customTasks));
    } catch (error) {
      console.error("保存自定义任务失败:", error);
    }
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
      const scopedKey = this.getScopedKey("houchang-contacts");
      const saved = localStorage.getItem(scopedKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }

      const legacy = localStorage.getItem("houchang-contacts");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed)) {
          localStorage.setItem(scopedKey, JSON.stringify(parsed));
          return parsed;
        }
      }
    } catch (error) {
      console.error("加载联系人失败:", error);
    }
    return [
      { id: "c1", name: "值班主管", phone: "138-0000-0001", role: "主管" },
      { id: "c2", name: "带教老师", phone: "138-0000-0002", role: "带教" },
      { id: "c3", name: "同事小王", phone: "138-0000-0003", role: "同事" }
    ];
  }

  saveContacts() {
    try {
      localStorage.setItem(this.getScopedKey("houchang-contacts"), JSON.stringify(this.contacts));
    } catch (error) {
      console.error("保存联系人失败:", error);
    }
  }

  showContactList() {
    const hasContacts = this.contacts.length > 0;
    const html = `
      <div class="contact-list">
        ${hasContacts ? this.contacts.map((c, index) => `
          <div class="contact-row">
            <div class="contact-info">
              <div class="contact-name">
                ${escapeHtml(c.name)}
                <span class="contact-role">${escapeHtml(c.role)}</span>
                ${index === 0 ? '<span class="contact-role contact-role-primary">紧急联系人</span>' : ""}
              </div>
              <div class="contact-phone">${escapeHtml(c.phone)}</div>
            </div>
            <button class="btn btn-contact-action" data-phone="${escapeHtml(c.phone)}">拨打电话</button>
          </div>
        `).join("") : `
          <div class="contact-empty">
            <p>当前使用者还没有联系人。</p>
            <p>先添加 1 位带教老师、主管或同事，紧急求助时就能直接拨号。</p>
          </div>
        `}
      </div>
      <p class="inline-note" style="margin-top:16px;text-align:center;">联系人按当前使用者单独保存，排在第一位的会作为“紧急求助”默认联系人。</p>
    `;
    this.showModal({
      title: "📞 联系同事",
      html,
      actions: [
        { label: "关闭", variant: "secondary", onClick: () => {} },
        { label: "管理联系人", variant: "primary", onClick: () => this.openContactManager() }
      ],
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

  openContactManager() {
    const html = `
      <div class="contact-list">
        ${this.contacts.length ? this.contacts.map((contact, index) => `
          <div class="contact-row contact-editor-row">
            <div class="contact-info">
              <div class="contact-name">
                ${escapeHtml(contact.name)}
                <span class="contact-role">${escapeHtml(contact.role || "同事")}</span>
                ${index === 0 ? '<span class="contact-role contact-role-primary">紧急联系人</span>' : ""}
              </div>
              <div class="contact-phone">${escapeHtml(contact.phone)}</div>
            </div>
            <div class="contact-row-actions">
              <button class="btn btn-secondary btn-contact-manage" data-action="call" data-contact-id="${escapeHtml(contact.id)}">拨打</button>
              <button class="btn btn-secondary btn-contact-manage" data-action="edit" data-contact-id="${escapeHtml(contact.id)}">修改</button>
              ${index === 0 ? "" : `<button class="btn btn-secondary btn-contact-manage" data-action="promote" data-contact-id="${escapeHtml(contact.id)}">设为紧急</button>`}
              <button class="btn btn-danger-soft btn-contact-manage" data-action="delete" data-contact-id="${escapeHtml(contact.id)}">删除</button>
            </div>
          </div>
        `).join("") : `
          <div class="contact-empty">
            <p>还没有联系人。</p>
            <p>建议先添加 1 位主管、带教老师或同事，方便需要时直接求助。</p>
          </div>
        `}
      </div>

      <div class="profile-row contact-form-card">
        <span class="field-label">新增联系人</span>
        <input id="contact-name-input" type="text" placeholder="例如：张老师 / 值班主管">
        <input id="contact-role-input" type="text" placeholder="例如：带教 / 主管 / 同事">
        <input id="contact-phone-input" type="tel" placeholder="例如：13800000000">
        <p class="inline-note">排在第一位的联系人会作为“紧急求助”默认拨号对象。</p>
      </div>
    `;

    this.showModal({
      title: `管理联系人 · ${this.getActiveProfile().name}`,
      html,
      actions: [
        { label: "返回", variant: "secondary", onClick: () => this.openProfileManager() },
        { label: "添加联系人", variant: "primary", keepOpen: true, onClick: () => this.addContactFromModal() }
      ],
      afterRender: () => {
        document.querySelectorAll(".btn-contact-manage").forEach(button => {
          button.addEventListener("click", async () => {
            const contactId = button.dataset.contactId;
            const action = button.dataset.action;
            if (!contactId || !action) return;

            if (action === "call") {
              const contact = this.contacts.find(item => item.id === contactId);
              if (contact?.phone) {
                window.location.href = `tel:${contact.phone}`;
              }
              return;
            }

            if (action === "promote") {
              this.promoteContact(contactId);
              return;
            }

            if (action === "delete") {
              const confirmed = await this.confirmModal("删除联系人", "删除后，这位联系人将不会再出现在“联系同事”和“紧急求助”里。", "删除");
              if (!confirmed) {
                this.openContactManager();
                return;
              }
              this.deleteContact(contactId);
            }

            if (action === "edit") {
              this.editContact(contactId);
            }
          });
        });
      }
    });
  }

  addContactFromModal() {
    const name = document.getElementById("contact-name-input")?.value.trim() || "";
    const role = document.getElementById("contact-role-input")?.value.trim() || "同事";
    const phone = document.getElementById("contact-phone-input")?.value.trim() || "";
    if (!name) {
      this.infoModal("还没有填写姓名", "请先输入联系人的姓名或称呼。");
      return;
    }
    if (!phone) {
      this.infoModal("还没有填写电话", "请先输入联系电话。");
      return;
    }
    if (!/^[0-9+()\s-]+$/.test(phone)) {
      this.infoModal("电话号码格式不对", "请只输入数字，或使用 +、-、空格、括号这些常见电话符号。");
      return;
    }

    this.contacts.push({
      id: `contact-${Date.now()}`,
      name,
      role,
      phone
    });
    this.saveContacts();
    this.openContactManager();
  }

  promoteContact(contactId) {
    const index = this.contacts.findIndex(item => item.id === contactId);
    if (index <= 0) return;
    const [contact] = this.contacts.splice(index, 1);
    this.contacts.unshift(contact);
    this.saveContacts();
    this.openContactManager();
  }

  deleteContact(contactId) {
    this.contacts = this.contacts.filter(item => item.id !== contactId);
    this.saveContacts();
    this.openContactManager();
  }

  editContact(contactId) {
    const contact = this.contacts.find(item => item.id === contactId);
    if (!contact) return;
    
    const html = `
      <div class="contact-edit-form">
        <div class="profile-row">
          <span class="field-label">姓名</span>
          <input id="edit-contact-name" type="text" value="${escapeHtml(contact.name)}" placeholder="例如：张老师">
        </div>
        <div class="profile-row">
          <span class="field-label">称呼/职位</span>
          <input id="edit-contact-role" type="text" value="${escapeHtml(contact.role || "同事")}" placeholder="例如：带教 / 主管 / 同事">
        </div>
        <div class="profile-row">
          <span class="field-label">电话</span>
          <input id="edit-contact-phone" type="tel" value="${escapeHtml(contact.phone)}" placeholder="例如：13800000000">
        </div>
      </div>
    `;

    this.showModal({
      title: "修改联系人",
      html,
      actions: [
        { label: "取消", variant: "secondary", onClick: () => this.openContactManager() },
        { label: "保存修改", variant: "primary", keepOpen: true, onClick: () => this.saveEditedContact(contactId) }
      ]
    });
  }

  saveEditedContact(contactId) {
    const name = document.getElementById("edit-contact-name")?.value.trim() || "";
    const role = document.getElementById("edit-contact-role")?.value.trim() || "同事";
    const phone = document.getElementById("edit-contact-phone")?.value.trim() || "";

    if (!name) {
      this.infoModal("姓名不能为空", "请输入联系人的姓名。");
      return;
    }
    if (!phone) {
      this.infoModal("电话不能为空", "请输入联系电话。");
      return;
    }
    if (!/^[0-9+()\s-]+$/.test(phone)) {
      this.infoModal("电话号码格式不对", "请只输入数字，或使用 +、-、空格、括号这些常见电话符号。");
      return;
    }

    const index = this.contacts.findIndex(item => item.id === contactId);
    if (index === -1) return;

    this.contacts[index] = { ...this.contacts[index], name, role, phone };
    this.saveContacts();
    this.infoModal("修改成功", "联系人信息已更新。");
    this.openContactManager();
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
      if (saved) {
        const parsed = JSON.parse(saved);
        // 验证数据结构
        if (parsed && typeof parsed === 'object' && 'taskId' in parsed && 'stepIndex' in parsed) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("加载进度失败:", error);
    }
    return null;
  }

  saveProgress() {
    if (!this.currentTask) return;
    try {
      localStorage.setItem(this.getScopedKey("houchang-progress"), JSON.stringify({
        taskId: this.currentTask.id,
        stepIndex: this.currentStepIndex
      }));
      this.updateResumeCard();
    } catch (error) {
      console.error("保存进度失败:", error);
    }
  }

  clearProgress() {
    try {
      localStorage.removeItem(this.getScopedKey("houchang-progress"));
      this.updateResumeCard();
    } catch (error) {
      console.error("清除进度失败:", error);
    }
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
      <div class="task-card ${task.isCustom ? "task-card-custom" : ""}" data-task-id="${escapeHtml(task.id)}">
        ${task.isCustom ? `<button class="task-manage-btn" data-task-manage="${escapeHtml(task.id)}">管理</button>` : ""}
        <div class="task-icon">${escapeHtml(task.icon)}</div>
        <h3>${escapeHtml(task.title)}</h3>
        <p>${escapeHtml(task.description)}</p>
        <div class="task-badges">
          <span class="task-category">${escapeHtml(categoryNames[task.category] || task.category)}</span>
          ${task.isCustom ? '<span class="task-category task-category-custom">自定义</span>' : ""}
        </div>
      </div>
    `).join("");
  }

/**
 * 绑定所有事件监听器
 */
  bindEvents() {
    this.bindServiceWorker();
    this.bindAudioContextActivation();
    this.bindHomePageEvents();
    this.bindTaskPageEvents();
    this.bindStatsPageEvents();
    this.bindImageVideoEvents();
    this.bindSettingsEvents();
    this.bindHelpAndCommunicationEvents();
    this.bindModalEvents();
    this.bindTaskEditorEvents();
    this.bindCategoryManagerEvents();
  }

  bindServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW注册失败', err));
    }
  }

  bindAudioContextActivation() {
    document.body.addEventListener('click', () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    }, { once: true });
  }

  bindHomePageEvents() {
    document.getElementById("task-grid").addEventListener("click", event => {
      const manageButton = event.target.closest(".task-manage-btn");
      if (manageButton) {
        this.openCustomTaskActions(manageButton.dataset.taskManage);
        return;
      }
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
    document.getElementById("coach-workspace-btn").addEventListener("click", () => this.verifyAndOpenCoachWorkspace());
    document.getElementById("share-progress-btn").addEventListener("click", () => this.openShareProgress());
    document.getElementById("video-idea-btn").addEventListener("click", () => this.openVideoIdea());
    document.getElementById("resume-btn").addEventListener("click", () => {
      const saved = this.loadProgress();
      if (saved) this.resumeTask(saved.taskId, saved.stepIndex);
    });
  }

  bindTaskPageEvents() {
    document.getElementById("back-btn").addEventListener("click", () => this.goHome());
    document.getElementById("done-btn").addEventListener("click", () => this.completeStep());
    document.getElementById("emergency-btn").addEventListener("click", () => this.handleEmergencyCall());
    document.getElementById("assist-close-btn").addEventListener("click", () => this.hideAssist());
    document.getElementById("restart-btn").addEventListener("click", () => this.restartTask());
    document.getElementById("home-btn").addEventListener("click", () => this.goHome());
    document.getElementById("voice-btn").addEventListener("click", () => this.speakCurrentStep());
    
    // 新增功能事件绑定
    document.getElementById("prev-step-btn").addEventListener("click", () => this.goToPrevStep());
    document.getElementById("restart-task-btn").addEventListener("click", () => this.confirmRestartTask());
    document.getElementById("problem-btn").addEventListener("click", () => this.showProblemPanel());
  }

  bindStatsPageEvents() {
    document.getElementById("nav-home").addEventListener("click", () => this.goHome());
    document.getElementById("nav-stats").addEventListener("click", () => this.showStats());
    document.getElementById("stats-back-btn").addEventListener("click", () => this.goHome());
    document.getElementById("clear-stats-btn").addEventListener("click", async () => {
      const confirmed = await this.confirmModal("清除记录", "要清除当前使用者的完成记录和卡点统计吗？");
      if (confirmed) {
        this.clearStats();
        this.renderStats();
        this.renderCalendar();
        this.updateStreakBadge();
      }
    });
  }

  bindImageVideoEvents() {
    document.getElementById("upload-image-btn").addEventListener("click", () => document.getElementById("step-image-input").click());
    document.getElementById("annotate-image-btn").addEventListener("click", () => this.openImageAnnotator());
    document.getElementById("replace-image-btn").addEventListener("click", () => document.getElementById("step-image-input").click());
    document.getElementById("remove-image-btn").addEventListener("click", () => this.removeCurrentStepImage());
    document.getElementById("step-image-input").addEventListener("change", event => this.handleImageSelected(event));

    document.getElementById("upload-video-btn").addEventListener("click", () => document.getElementById("step-video-input").click());
    document.getElementById("remove-video-btn").addEventListener("click", () => this.removeCurrentStepVideo());
    document.getElementById("step-video-input").addEventListener("change", event => this.handleVideoSelected(event));
  }

  bindSettingsEvents() {
    document.getElementById("mode-toggle-btn").addEventListener("click", () => this.toggleDisplayMode());
    document.getElementById("voice-settings-btn").addEventListener("click", () => this.openVoiceSettings());
    document.getElementById("package-file-input").addEventListener("change", event => this.handleTeachingPackageFileSelected(event));
  }

  bindHelpAndCommunicationEvents() {
    document.getElementById("problem-cancel-btn").addEventListener("click", () => this.hideProblemPanel());
    document.getElementById("comm-close-btn").addEventListener("click", () => this.hideCommunicationPanel());
    document.getElementById("calm-open-btn").addEventListener("click", () => this.openCalmMode());
    document.getElementById("calm-done-btn").addEventListener("click", () => this.closeCalmMode());
    document.getElementById("calm-emergency-btn").addEventListener("click", () => {
      this.closeCalmMode();
      this.handleEmergencyCall();
    });
    document.getElementById("affirmation-next-btn").addEventListener("click", () => this.nextAffirmation());
    document.getElementById("grounding-add-btn").addEventListener("click", () => this.addGroundingItem());
    document.getElementById("comm-copy-btn").addEventListener("click", () => this.copyCommScript());
    document.getElementById("comm-speak-btn").addEventListener("click", () => this.speakCommScript());

    // 职场沟通场景按钮
    document.querySelectorAll(".btn-comm-scenario").forEach(btn => {
      btn.addEventListener("click", () => this.selectCommScenario(btn.dataset.scenario));
    });

    // 问题分类选项按钮
    document.querySelectorAll(".btn-problem-option").forEach(btn => {
      btn.addEventListener("click", () => this.handleProblemSelection(btn.dataset.problem));
    });
  }

  bindModalEvents() {
    // 点击遮罩层关闭弹窗
    this.modalOverlay?.addEventListener("click", (e) => {
      if (e.target === this.modalOverlay) {
        this.closeModal();
      }
    });
  }

  bindTaskEditorEvents() {
    // 可视化任务编辑器事件（操作者视角模式）
    document.getElementById("task-editor-close-btn")?.addEventListener("click", () => this.closeTaskEditor());
    document.getElementById("editor-cancel-btn")?.addEventListener("click", () => this.closeTaskEditor());
    document.getElementById("editor-save-btn")?.addEventListener("click", () => this.saveTaskFromEditor());
    document.getElementById("add-step-btn")?.addEventListener("click", () => this.addNewStep());
  }

  bindCategoryManagerEvents() {
    // 分类管理事件
    document.getElementById("manage-categories-btn")?.addEventListener("click", () => this.openCategoryManager());
    document.getElementById("category-manager-close-btn")?.addEventListener("click", () => this.closeCategoryManager());
    document.getElementById("add-category-btn")?.addEventListener("click", () => this.addCustomCategory());
    document.getElementById("icon-select-btn")?.addEventListener("click", () => this.openIconPicker());
    document.getElementById("icon-picker-close-btn")?.addEventListener("click", () => this.closeIconPicker());
    document.getElementById("custom-category-list")?.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest(".category-delete-btn");
      if (deleteBtn) this.deleteCustomCategory(deleteBtn.dataset.id);
    });
  }

  toggleDisplayMode() {
    const currentMode = this.getDisplayMode();
    const nextMode = currentMode === "normal" ? "dark" : currentMode === "dark" ? "high-contrast" : "normal";
    this.setDisplayMode(nextMode);
  }

  applyDisplayMode(mode) {
    document.body.classList.remove("dark-mode", "high-contrast");
    if (mode === "dark") {
      document.body.classList.add("dark-mode");
    } else if (mode === "high-contrast") {
      document.body.classList.add("high-contrast");
    }
  }

  getDisplayMode() {
    return this.loadScopedPreference("display-mode", "display-mode", "normal");
  }

  setDisplayMode(mode) {
    this.saveScopedPreference("display-mode", mode);
    this.applyDisplayMode(mode);
  }

  loadDisplayMode() {
    this.applyDisplayMode(this.getDisplayMode());
  }

  openVoiceSettings() {
    const settings = this.getVoiceSettings();
    const savedLang = settings.lang;
    const savedRate = String(settings.rate);
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
            this.saveVoiceSettings({ lang, rate });
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
    const rate = parseFloat(this.loadScopedPreference("voice-rate", "voice-rate", "0.88"));
    return {
      lang: this.loadScopedPreference("voice-lang", "voice-lang", "zh-CN"),
      rate: Number.isFinite(rate) ? rate : 0.88
    };
  }

  saveVoiceSettings({ lang, rate }) {
    this.saveScopedPreference("voice-lang", lang || "zh-CN");
    this.saveScopedPreference("voice-rate", rate || "0.88");
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
        { label: "管理联系人", variant: "secondary", onClick: () => this.openContactManager() },
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
    this.loadDisplayMode();
    this.currentTask = null;
    this.currentStepIndex = 0;
    this.currentUserImage = null;
    this.updateProfileChip();
    this.updateStreakBadge();
    this.updateResumeCard();
    this.renderTaskGrid();
    this.goHome();
  }

  verifyAndOpenCoachWorkspace() {
    // 随机生成一道10以内的加法题作为防误触锁
    const num1 = Math.floor(Math.random() * 5) + 1;
    const num2 = Math.floor(Math.random() * 5) + 1;

    this.showModal({
      title: "进入带教工作台",
      html: `
        <p style="margin-bottom: 12px; color: var(--text-light);">为防止误触，请输入正确答案进入：</p>
        <label class="field-label" style="font-size: 20px;">${num1} + ${num2} = ?</label>
        <input type="number" id="coach-lock-input" class="editor-input" placeholder="请输入答案">
      `,
      actions: [
        { label: "取消", variant: "secondary", onClick: () => {} },
        {
          label: "确认进入", variant: "primary", keepOpen: true, onClick: () => {
            const input = document.getElementById("coach-lock-input");
            if (parseInt(input.value) === num1 + num2) {
              this.closeModal();
              this.openCoachWorkspace();
            } else {
              input.value = "";
              input.placeholder = "答案错误，请重试";
              input.style.borderColor = "var(--danger)";
            }
          }
        }
      ]
    });
  }

  openCoachWorkspace() {
    const profile = this.getActiveProfile();
    this.showModal({
      title: "带教工作台",
      html: `
        <div class="share-card">
          <div class="share-summary-card">
            <div class="profile-row-title">${escapeHtml(profile.name)} 的带教资料</div>
            <div class="profile-row-meta">在这里管理任务、联系人，以及发送到另一台设备用的“带教包”。</div>
          </div>
          <div class="workspace-grid">
            <button class="workspace-action-btn" data-workspace-action="tasks">
              <strong>📝 自定义任务</strong>
              <span>新建、编辑、复制、置顶和删除</span>
            </button>
            <button class="workspace-action-btn" data-workspace-action="contacts">
              <strong>📞 联系人</strong>
              <span>维护紧急求助和联系同事名单</span>
            </button>
            <button class="workspace-action-btn" data-workspace-action="export">
              <strong>📦 发送带教包</strong>
              <span>把任务和设置发到另一台设备</span>
            </button>
            <button class="workspace-action-btn" data-workspace-action="import">
              <strong>📥 导入带教包</strong>
              <span>接收另一台设备发来的任务配置</span>
            </button>
          </div>
          <p class="inline-note">“分享进度摘要”是给老师、家长或主管看结果；“带教包”是给另一台设备同步任务和配置。</p>
        </div>
      `,
      actions: [{ label: "关闭", variant: "secondary", onClick: () => {} }],
      afterRender: () => {
        document.querySelectorAll(".workspace-action-btn").forEach(button => {
          button.addEventListener("click", () => {
            const action = button.dataset.workspaceAction;
            if (action === "tasks") this.openCustomTaskManager();
            if (action === "contacts") this.openContactManager();
            if (action === "export") this.openTeachingPackageExporter();
            if (action === "import") this.openTeachingPackageImporter();
          });
        });
      }
    });
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

  generateLocalId(prefix) {
    return `${prefix}-${this.activeProfileId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  splitHelpText(value) {
    return value
      .split(/[；;、，]/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  buildTaskStepsEditorText(task) {
    return (task.steps || []).map(step => [
      step.instruction || "",
      step.detail || "",
      step.simplify || "",
      step.whyItMatters || "",
      (step.helpNotFound || []).join("；"),
      (step.helpNeed || []).join("；")
    ].join("|")).join("\n");
  }

  parseTaskStepsText(stepsText, category, taskId) {
    const lines = stepsText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    return lines.map((line, index) => {
      const parts = line.split("|").map(item => item.trim());
      const instruction = parts[0];
      if (!instruction) {
        throw new Error(`第 ${index + 1} 行还没有填写步骤名称。`);
      }
      const detail = parts[1] || `${instruction}，按平时的方式一步一步完成。`;
      const simplify = parts[2] || instruction;
      const whyItMatters = parts[3] || "做完这一步，后面的流程会更顺。";
      const helpers = this.buildDefaultHelp(instruction);
      const helpNotFound = parts[4] ? this.splitHelpText(parts[4]) : helpers.helpNotFound;
      const helpNeed = parts[5] ? this.splitHelpText(parts[5]) : helpers.helpNeed;
      return {
        instruction,
        detail,
        simplify,
        image: CUSTOM_TASK_IMAGE_MAP[category] || "icon-check",
        userImageKey: `${taskId}-step-${index}`,
        helpNotFound,
        helpNeed,
        whyItMatters
      };
    });
  }

  createCustomTaskFingerprint(task) {
    return JSON.stringify({
      title: task.title,
      description: task.description,
      category: task.category,
      steps: (task.steps || []).map(step => ({
        instruction: step.instruction,
        detail: step.detail,
        simplify: step.simplify,
        whyItMatters: step.whyItMatters,
        helpNotFound: step.helpNotFound || [],
        helpNeed: step.helpNeed || []
      }))
    });
  }

  buildCustomTaskRecord({ id, title, category, description, steps, icon, importedFingerprint }) {
    const task = {
      id,
      title,
      icon: icon || CUSTOM_TASK_ICON_MAP[category] || "🧩",
      description,
      category,
      isCustom: true,
      steps
    };
    task.importedFingerprint = importedFingerprint || this.createCustomTaskFingerprint(task);
    return task;
  }

  findCustomTaskIndex(taskId) {
    return this.customTasks.findIndex(task => task.id === taskId);
  }

  clearTaskProgressIfNeeded(taskId) {
    const saved = this.loadProgress();
    if (saved?.taskId === taskId) {
      this.clearProgress();
    }
    if (this.currentTask?.id === taskId) {
      this.goHome();
    }
  }

  saveAndRefreshCustomTasks() {
    this.saveCustomTasks();
    this.renderTaskGrid();
    this.updateResumeCard();
  }

  openCustomTaskManager() {
    const listHtml = this.customTasks.length ? this.customTasks.map((task, index) => `
      <div class="task-admin-row">
        <div class="task-admin-copy">
          <div class="profile-row-title">${escapeHtml(task.title)}</div>
          <div class="profile-row-meta">${escapeHtml(categoryNames[task.category] || task.category)} · ${task.steps.length} 步 · 排序第 ${index + 1}</div>
        </div>
        <button class="btn btn-secondary task-admin-manage-btn" data-task-admin="${escapeHtml(task.id)}">管理</button>
      </div>
    `).join("") : `
      <div class="contact-empty">
        <p>当前还没有自定义任务。</p>
        <p>可以先新建一个常用岗位任务，再通过带教包发到另一台设备。</p>
      </div>
    `;

    this.showModal({
      title: "自定义任务管理",
      html: `
        <div class="share-card">
          <div class="share-summary-card">
            <div class="profile-row-title">当前使用者共有 ${this.customTasks.length} 个自定义任务</div>
            <div class="profile-row-meta">内置任务保持只读；如果要调整内置流程，请先复制成自定义任务再修改。</div>
          </div>
          <div class="profile-list">${listHtml}</div>
        </div>
      `,
      actions: [
        { label: "返回工作台", variant: "secondary", onClick: () => this.openCoachWorkspace() },
        { label: "新建任务", variant: "primary", onClick: () => this.openCustomTaskBuilder() }
      ],
      afterRender: () => {
        document.querySelectorAll(".task-admin-manage-btn").forEach(button => {
          button.addEventListener("click", () => this.openCustomTaskActions(button.dataset.taskAdmin));
        });
      }
    });
  }

  openCustomTaskActions(taskId) {
    const index = this.findCustomTaskIndex(taskId);
    const task = this.customTasks[index];
    if (!task) return;

    this.showModal({
      title: `管理任务 · ${task.title}`,
      html: `
        <div class="share-card">
          <div class="share-summary-card">
            <div class="profile-row-title">${escapeHtml(task.title)}</div>
            <div class="profile-row-meta">${escapeHtml(task.description)}<br>${task.steps.length} 步 · 当前排序第 ${index + 1}</div>
          </div>
        </div>
      `,
      actions: [
        { label: "返回列表", variant: "secondary", onClick: () => this.openCustomTaskManager() },
        { label: "编辑", variant: "secondary", onClick: () => this.openCustomTaskBuilder(taskId) },
        { label: "复制", variant: "secondary", onClick: () => this.duplicateCustomTask(taskId) },
        ...(index > 0 ? [{ label: "置顶", variant: "secondary", onClick: () => this.pinCustomTask(taskId) }] : []),
        ...(index > 0 ? [{ label: "上移", variant: "secondary", onClick: () => this.moveCustomTask(taskId, -1) }] : []),
        ...(index < this.customTasks.length - 1 ? [{ label: "下移", variant: "secondary", onClick: () => this.moveCustomTask(taskId, 1) }] : []),
        { label: "删除", variant: "primary", onClick: () => this.confirmDeleteCustomTask(taskId) }
      ]
    });
  }

  async confirmDeleteCustomTask(taskId) {
    const task = this.customTasks.find(item => item.id === taskId);
    if (!task) return;
    const confirmed = await this.confirmModal("删除自定义任务", `删除后，“${task.title}”会从当前使用者的任务列表里移除。`, "删除");
    if (!confirmed) {
      this.openCustomTaskActions(taskId);
      return;
    }
    this.deleteCustomTask(taskId);
  }

  async deleteCustomTask(taskId) {
    const index = this.findCustomTaskIndex(taskId);
    if (index < 0) return;
    const task = this.customTasks[index];

    // 【新增】清理 IndexedDB 中关联的图片和视频，防止占用设备空间
    if (this.imageStoreAvailable && task.steps) {
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];
        if (step.userImageKey) {
          try { await deleteStoredImage(`${this.activeProfileId}-${step.userImageKey}`); } catch (e) {}
        }
        const videoKey = `video-${this.activeProfileId}-${taskId}-step-${i}`;
        try { await deleteStoredImage(videoKey); } catch (e) {}
      }
    }

    this.customTasks.splice(index, 1);
    this.clearTaskProgressIfNeeded(taskId);
    this.saveAndRefreshCustomTasks();
    this.infoModal("任务已删除", "这个自定义任务已经从列表移除，关联的参考图片和视频也已清理干净。");
  }

  duplicateCustomTask(taskId) {
    const source = this.customTasks.find(task => task.id === taskId);
    if (!source) return;
    const newTaskId = this.generateLocalId("custom");
    const steps = (source.steps || []).map((step, index) => ({
      ...JSON.parse(JSON.stringify(step)),
      userImageKey: `${newTaskId}-step-${index}`
    }));
    const duplicated = this.buildCustomTaskRecord({
      id: newTaskId,
      title: `${source.title}（副本）`,
      category: source.category,
      description: source.description,
      steps,
      icon: source.icon
    });
    this.customTasks.unshift(duplicated);
    this.saveAndRefreshCustomTasks();
    this.infoModal("任务已复制", "已经生成一个不影响原任务的新副本，你可以继续编辑它。");
  }

  pinCustomTask(taskId) {
    const index = this.findCustomTaskIndex(taskId);
    if (index <= 0) return;
    const [task] = this.customTasks.splice(index, 1);
    this.customTasks.unshift(task);
    this.saveAndRefreshCustomTasks();
    this.openCustomTaskManager();
  }

  moveCustomTask(taskId, offset) {
    const index = this.findCustomTaskIndex(taskId);
    const nextIndex = index + offset;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.customTasks.length) return;
    const [task] = this.customTasks.splice(index, 1);
    this.customTasks.splice(nextIndex, 0, task);
    this.saveAndRefreshCustomTasks();
    this.openCustomTaskActions(taskId);
  }

  openCustomTaskBuilder(taskId = null) {
    const task = taskId ? this.customTasks.find(item => item.id === taskId) : null;
    const isEditing = Boolean(task);
    const html = `
      <label class="field-label">任务名称</label>
      <input id="task-name-input" type="text" placeholder="例如：茶水间补给准备" value="${escapeHtml(task?.title || "")}">
      <label class="field-label">任务分类</label>
      <select id="task-category-input">
        <option value="restaurant" ${(task?.category || "") === "restaurant" ? "selected" : ""}>餐厅</option>
        <option value="snack" ${(task?.category || "") === "snack" ? "selected" : ""}>零食</option>
        <option value="warehouse" ${(task?.category || "") === "warehouse" ? "selected" : ""}>仓库</option>
        <option value="carwash" ${(task?.category || "") === "carwash" ? "selected" : ""}>洗车</option>
      </select>
      <label class="field-label">一句话说明</label>
      <input id="task-description-input" type="text" placeholder="例如：把这个岗位的开工准备拆成清楚步骤。" value="${escapeHtml(task?.description || "")}">
      <label class="field-label">步骤内容</label>
      <textarea id="task-steps-input" placeholder="每行写一步，可用 | 分隔更多信息。&#10;格式：步骤名称|补充说明|更简单说法|为什么要做|找不到时提示1；提示2|需要帮助时话术1；话术2">${escapeHtml(task ? this.buildTaskStepsEditorText(task) : "")}</textarea>
      <p class="inline-note">支持完整编辑每一步的 instruction / detail / simplify / whyItMatters / helpNotFound / helpNeed。后两项用中文分号“；”分开即可。</p>
    `;
    this.showModal({
      title: isEditing ? "编辑自定义任务" : "新建自定义任务",
      html,
      actions: [
        { label: isEditing ? "返回管理" : "取消", variant: "secondary", onClick: () => isEditing ? this.openCustomTaskActions(taskId) : this.openCustomTaskManager() },
        { label: isEditing ? "保存修改" : "保存任务", variant: "primary", keepOpen: true, onClick: () => this.saveCustomTaskFromModal(taskId) }
      ]
    });
  }

  saveCustomTaskFromModal(taskId = null) {
    const existingIndex = taskId ? this.findCustomTaskIndex(taskId) : -1;
    const existingTask = existingIndex >= 0 ? this.customTasks[existingIndex] : null;
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

    const customTaskId = existingTask?.id || this.generateLocalId("custom");
    let steps;
    try {
      steps = this.parseTaskStepsText(stepsText, category, customTaskId);
    } catch (error) {
      this.infoModal("步骤内容有一行没写完整", error.message || "请检查每一行的步骤名称是否都已填写。");
      return;
    }

    const record = this.buildCustomTaskRecord({
      id: customTaskId,
      title,
      category,
      description,
      steps,
      icon: existingTask?.icon || CUSTOM_TASK_ICON_MAP[category]
    });

    if (existingIndex >= 0) {
      this.customTasks.splice(existingIndex, 1, record);
      if (this.currentTask?.id === customTaskId) {
        this.currentTask = record;
      }
    } else {
      this.customTasks.unshift(record);
    }

    this.saveAndRefreshCustomTasks();
    this.closeModal();
    this.infoModal(existingTask ? "任务已更新" : "任务已保存", existingTask ? "这个自定义任务已经更新，首页和执行页会使用最新内容。" : "这个自定义任务已经加入列表，当前使用者下次也能继续使用。");
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

  encodeHashPayload(prefix, payload) {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const baseUrl = "https://totdaretodo-tot.github.io/totdaretoodo.github.io/index.html";
    return `${baseUrl}#${prefix}=${encoded}`;
  }

  createShareUrl(payload) {
    return this.encodeHashPayload("share", payload);
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

  downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  decodeHashPayload(prefix) {
    const hash = window.location.hash || "";
    const marker = `#${prefix}=`;
    if (!hash.startsWith(marker)) return null;
    try {
      const raw = decodeURIComponent(hash.slice(marker.length));
      return JSON.parse(decodeURIComponent(escape(atob(raw))));
    } catch (error) {
      return false;
    }
  }

  decodeSharePayload() {
    return this.decodeHashPayload("share");
  }

  showSharedViewIfNeeded() {
    const payload = this.decodeSharePayload();
    if (!payload) return false;
    if (payload === false) {
      this.infoModal("进度摘要无法识别", "这个进度分享链接不完整，暂时没法打开。");
      return true;
    }
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
    return true;
  }

  showIncomingHashViewIfNeeded() {
    if (this.showTeachingPackageIfNeeded()) return;
    this.showSharedViewIfNeeded();
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

  sanitizeTaskForExport(task) {
    return {
      title: task.title,
      description: task.description,
      category: task.category,
      steps: (task.steps || []).map(step => ({
        instruction: step.instruction,
        detail: step.detail,
        simplify: step.simplify,
        whyItMatters: step.whyItMatters,
        helpNotFound: step.helpNotFound || [],
        helpNeed: step.helpNeed || []
      }))
    };
  }

  createTeachingPackagePayload() {
    const voice = this.getVoiceSettings();
    return {
      version: TEACHING_PACKAGE_VERSION,
      profileName: this.getActiveProfile().name,
      exportedAt: new Date().toLocaleString("zh-CN"),
      customTasks: this.customTasks.map(task => this.sanitizeTaskForExport(task)),
      contacts: this.contacts.map(contact => ({
        name: contact.name,
        phone: contact.phone,
        role: contact.role
      })),
      preferences: {
        voiceLang: voice.lang,
        voiceRate: voice.rate,
        displayMode: this.getDisplayMode()
      }
    };
  }

  createTeachingPackageUrl(payload) {
    return this.encodeHashPayload("package", payload);
  }

  isValidTeachingPackage(payload) {
    return Boolean(
      payload &&
      typeof payload === "object" &&
      Array.isArray(payload.customTasks) &&
      Array.isArray(payload.contacts) &&
      payload.preferences &&
      typeof payload.preferences === "object"
    );
  }

  decodeTeachingPackagePayload() {
    return this.decodeHashPayload("package");
  }

  showTeachingPackageIfNeeded() {
    const payload = this.decodeTeachingPackagePayload();
    if (payload === null) return false;
    if (payload === false || !this.isValidTeachingPackage(payload)) {
      this.infoModal("带教包无法识别", "这个带教包链接不完整，暂时没法导入。");
      return true;
    }

    this.showModal({
      title: "收到带教包",
      html: `
        <div class="share-card">
          <div class="share-summary-card">
            <div class="profile-row-title">${escapeHtml(payload.profileName || "未命名使用者")} 的带教包</div>
            <div class="profile-row-meta">导出时间：${escapeHtml(payload.exportedAt || "")} · 版本 ${escapeHtml(String(payload.version || TEACHING_PACKAGE_VERSION))}</div>
          </div>
          <div class="share-summary-card">
            <div class="profile-row-meta">包含 ${payload.customTasks.length} 个自定义任务、${payload.contacts.length} 位联系人，以及语音/显示模式设置。</div>
          </div>
          <div class="share-summary-card">
            <div class="profile-row-title">导入方式</div>
            <div class="profile-row-meta">会导入到当前使用者“${escapeHtml(this.getActiveProfile().name)}”名下；联系人会整体替换，自定义任务会追加导入并自动跳过重复内容。</div>
          </div>
        </div>
      `,
      actions: [
        { label: "暂不导入", variant: "secondary", onClick: () => {} },
        {
          label: "导入到当前使用者",
          variant: "primary",
          onClick: () => {
            const summary = this.applyTeachingPackage(payload);
            this.clearHashAfterImport();
            this.showTeachingPackageImportResult(summary, payload.profileName || "当前带教包");
          }
        }
      ]
    });
    return true;
  }

  clearHashAfterImport() {
    if (window.location.hash.startsWith("#package=")) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }

  normalizeImportedTask(task) {
    const category = task.category && categoryNames[task.category] ? task.category : "restaurant";
    const description = task.description?.trim() || "这是从另一台设备导入的带教任务。";
    const steps = Array.isArray(task.steps) ? task.steps : [];
    const normalizedSteps = steps
      .map(step => {
        const instruction = (step.instruction || "").trim();
        if (!instruction) return null;
        const helpers = this.buildDefaultHelp(instruction);
        return {
          instruction,
          detail: (step.detail || `${instruction}，按平时的方式一步一步完成。`).trim(),
          simplify: (step.simplify || instruction).trim(),
          whyItMatters: (step.whyItMatters || "做完这一步，后面的流程会更顺。").trim(),
          helpNotFound: Array.isArray(step.helpNotFound) && step.helpNotFound.length ? step.helpNotFound : helpers.helpNotFound,
          helpNeed: Array.isArray(step.helpNeed) && step.helpNeed.length ? step.helpNeed : helpers.helpNeed
        };
      })
      .filter(Boolean);

    if (!task.title || !normalizedSteps.length) return null;
    return {
      title: task.title.trim(),
      description,
      category,
      steps: normalizedSteps
    };
  }

  applyTeachingPackage(payload) {
    const existingFingerprints = new Set(
      this.customTasks.map(task => task.importedFingerprint || this.createCustomTaskFingerprint(task))
    );

    let importedCount = 0;
    let skippedCount = 0;

    const importedTasks = [];
    (payload.customTasks || []).forEach(sourceTask => {
      const normalized = this.normalizeImportedTask(sourceTask);
      if (!normalized) {
        skippedCount += 1;
        return;
      }

      const fingerprint = this.createCustomTaskFingerprint(normalized);
      if (existingFingerprints.has(fingerprint)) {
        skippedCount += 1;
        return;
      }

      const localTaskId = this.generateLocalId("custom");
      const localSteps = normalized.steps.map((step, index) => ({
        instruction: step.instruction,
        detail: step.detail,
        simplify: step.simplify,
        whyItMatters: step.whyItMatters,
        helpNotFound: step.helpNotFound,
        helpNeed: step.helpNeed,
        image: CUSTOM_TASK_IMAGE_MAP[normalized.category] || "icon-check",
        userImageKey: `${localTaskId}-step-${index}`
      }));

      importedTasks.push(this.buildCustomTaskRecord({
        id: localTaskId,
        title: normalized.title,
        category: normalized.category,
        description: normalized.description,
        steps: localSteps,
        icon: CUSTOM_TASK_ICON_MAP[normalized.category],
        importedFingerprint: fingerprint
      }));
      existingFingerprints.add(fingerprint);
      importedCount += 1;
    });

    this.customTasks = [...this.customTasks, ...importedTasks];

    const contacts = Array.isArray(payload.contacts) ? payload.contacts : [];
    this.contacts = contacts
      .map(contact => ({
        id: this.generateLocalId("contact"),
        name: (contact.name || "").trim(),
        role: (contact.role || "同事").trim(),
        phone: (contact.phone || "").trim()
      }))
      .filter(contact => contact.name && contact.phone);

    const appliedPreferences = [];
    if (payload.preferences?.voiceLang) {
      this.saveScopedPreference("voice-lang", payload.preferences.voiceLang);
      appliedPreferences.push("语音语言");
    }
    if (payload.preferences?.voiceRate !== undefined && payload.preferences?.voiceRate !== null) {
      this.saveScopedPreference("voice-rate", payload.preferences.voiceRate);
      appliedPreferences.push("语速");
    }
    if (payload.preferences?.displayMode) {
      this.saveScopedPreference("display-mode", payload.preferences.displayMode);
      appliedPreferences.push("显示模式");
    }

    this.saveCustomTasks();
    this.saveContacts();
    this.loadDisplayMode();
    this.renderTaskGrid();
    this.updateResumeCard();

    return {
      importedCount,
      skippedCount,
      contactCount: this.contacts.length,
      contactsReplaced: true,
      appliedPreferences
    };
  }

  showTeachingPackageImportResult(summary, packageName) {
    this.showModal({
      title: "带教包已导入",
      html: `
        <div class="share-card">
          <div class="share-summary-card">
            <div class="profile-row-title">已导入到 ${escapeHtml(this.getActiveProfile().name)}</div>
            <div class="profile-row-meta">来源：${escapeHtml(packageName || "带教包")}</div>
          </div>
          <div class="share-summary-card">
            <ul>
              <li>新增自定义任务：${summary.importedCount} 个</li>
              <li>跳过重复任务：${summary.skippedCount} 个</li>
              <li>联系人已替换：${summary.contactsReplaced ? `是（当前 ${summary.contactCount} 位）` : "否"}</li>
              <li>已覆盖设置：${summary.appliedPreferences.length ? summary.appliedPreferences.join("、") : "无"}</li>
            </ul>
          </div>
        </div>
      `,
      actions: [{ label: "我知道了", variant: "primary", onClick: () => {} }]
    });
  }

  parseTeachingPackageSource(sourceText) {
    const trimmed = (sourceText || "").trim();
    if (!trimmed) {
      throw new Error("还没有粘贴任何带教包内容。");
    }

    let payload = null;
    const hashMatch = trimmed.match(/#package=([A-Za-z0-9+/=%_-]+)/);
    if (hashMatch) {
      payload = this.decodeHashPayloadFromRaw(hashMatch[1]);
    } else if (trimmed.startsWith("#package=")) {
      payload = this.decodeHashPayloadFromRaw(trimmed.replace("#package=", ""));
    } else if (trimmed.startsWith("{")) {
      payload = JSON.parse(trimmed);
    } else {
      payload = this.decodeHashPayloadFromRaw(trimmed);
    }

    if (!this.isValidTeachingPackage(payload)) {
      throw new Error("带教包格式不完整，暂时没法导入。");
    }

    return payload;
  }

  decodeHashPayloadFromRaw(rawValue) {
    return JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(rawValue)))));
  }

  openTeachingPackageExporter() {
    const payload = this.createTeachingPackagePayload();
    const packageUrl = this.createTeachingPackageUrl(payload);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(packageUrl)}`;
    this.showModal({
      title: "发送带教包",
      html: `
        <div class="share-card">
          <div class="share-summary-card">
            <div class="profile-row-title">${escapeHtml(payload.profileName)} 的带教包</div>
            <div class="profile-row-meta">包含 ${payload.customTasks.length} 个自定义任务、${payload.contacts.length} 位联系人，以及语音与显示模式设置。</div>
          </div>
          <div class="share-qr-wrap">
            <img class="share-qr" src="${qrUrl}" alt="带教包二维码" onerror="handleShareQrError(this)">
            <div class="share-qr-fallback hidden">
              当前网络下二维码没有加载出来，你仍然可以复制下面的同步链接，或者直接下载 JSON 文件发送。
            </div>
            <div class="share-qr-note">📌 此链接通过GitHub Pages托管，全球可访问，扫码即可同步。</div>
          </div>
          <div class="share-summary-card">
            <div class="profile-row-title">同步说明</div>
            <div class="profile-row-meta">“发送带教包”是把任务和配置同步到另一台设备，不会带上历史记录、参考图片和本地视频。</div>
            <div class="share-link">${escapeHtml(packageUrl)}</div>
          </div>
        </div>
      `,
      actions: [
        { label: "返回工作台", variant: "secondary", onClick: () => this.openCoachWorkspace() },
        {
          label: "复制同步链接",
          variant: "secondary",
          keepOpen: true,
          onClick: async () => {
            try {
              await this.copyText(packageUrl);
              this.infoModal("同步链接已复制", "现在可以把这条链接发到另一台设备，在那边直接导入。");
            } catch (error) {
              this.infoModal("复制失败", "这个浏览器暂时没有复制成功，可以手动复制下面的链接。");
            }
          }
        },
        {
          label: "下载 JSON",
          variant: "primary",
          keepOpen: true,
          onClick: () => this.downloadJson(`一步步-${payload.profileName}-带教包.json`, payload)
        }
      ]
    });
  }

  openTeachingPackageImporter(prefill = "") {
    this.showModal({
      title: "导入带教包",
      html: `
        <div class="share-card">
          <div class="share-summary-card">
            <div class="profile-row-title">导入到当前使用者：${escapeHtml(this.getActiveProfile().name)}</div>
            <div class="profile-row-meta">支持粘贴同步链接、粘贴 JSON，或直接选择带教包文件。</div>
          </div>
          <label class="field-label">粘贴带教包链接或 JSON</label>
          <textarea id="package-import-input" placeholder="把 #package= 链接或 JSON 内容粘贴到这里">${escapeHtml(prefill)}</textarea>
          <p class="inline-note">导入后会替换当前使用者联系人，追加自定义任务，并覆盖语音/显示模式设置。</p>
        </div>
      `,
      actions: [
        { label: "返回工作台", variant: "secondary", onClick: () => this.openCoachWorkspace() },
        {
          label: "选择 JSON 文件",
          variant: "secondary",
          keepOpen: true,
          onClick: () => document.getElementById("package-file-input").click()
        },
        {
          label: "导入到当前使用者",
          variant: "primary",
          keepOpen: true,
          onClick: () => this.importTeachingPackageFromText()
        }
      ]
    });
  }

  importTeachingPackageFromText() {
    const text = document.getElementById("package-import-input")?.value || "";
    let payload;
    try {
      payload = this.parseTeachingPackageSource(text);
    } catch (error) {
      this.infoModal("带教包无法导入", error.message || "请检查链接或 JSON 是否完整。");
      return;
    }
    this.closeModal();
    const summary = this.applyTeachingPackage(payload);
    this.showTeachingPackageImportResult(summary, payload.profileName || "带教包");
  }

  async handleTeachingPackageFileSelected(event) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const payload = this.parseTeachingPackageSource(text);
      this.closeModal();
      const summary = this.applyTeachingPackage(payload);
      this.showTeachingPackageImportResult(summary, payload.profileName || file.name);
    } catch (error) {
      this.infoModal("带教包文件无法导入", error.message || "请选择完整的 JSON 带教包文件。");
    }
  }

  openShareProgress() {
    const payload = this.createSharePayload();
    const shareUrl = this.createShareUrl(payload);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;
    this.showModal({
      title: "分享进度摘要",
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
            <div class="share-qr-note">📌 此链接通过GitHub Pages托管，全球可访问，扫码即可查看。</div>
          </div>
          <div class="share-summary-card">
            <div class="profile-row-title">扫码说明</div>
            <div class="profile-row-meta">“分享进度摘要”只给老师、家长或主管看结果；如果是想把任务发到另一台设备，请去“带教工作台”发送带教包。</div>
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
    document.getElementById("step-image").innerHTML = `<use href="#${escapeHtml(step.image || "icon-check")}"/>`;
    this.currentUserImage = await this.loadCurrentStepImage();
    this.renderStepImageState(step);
    this.renderStepVideo();
    this.renderStepRiskInfo();
    this.renderSafetyPanel(step);
    this.startStepTimer(step);
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
    
    // 显示加载状态
    const uploadBtn = document.getElementById("upload-image-btn");
    const originalText = uploadBtn.textContent;
    uploadBtn.textContent = "上传中...";
    uploadBtn.disabled = true;
    
    try {
      const compressed = await compressImage(file);
      await setStoredImage(this.getCurrentImageKey(), compressed);
      this.currentUserImage = compressed;
      this.renderStepImageState(this.getCurrentStep());
      this.infoModal("图片上传成功", "参考图片已保存，你可以在步骤中查看。");
    } catch (error) {
      console.error("图片处理失败:", error);
      this.infoModal("图片保存失败", "这张图片没有保存成功，你可以换一张再试。");
    } finally {
      // 恢复按钮状态
      uploadBtn.textContent = originalText;
      uploadBtn.disabled = false;
    }
  }

  async removeCurrentStepImage() {
    if (!this.imageStoreAvailable) return;
    const confirmed = await this.confirmModal("删除参考图", "要删除这一步的参考图片吗？");
    if (!confirmed) return;
    
    // 显示加载状态
    const removeBtn = document.getElementById("remove-image-btn");
    if (removeBtn) {
      removeBtn.textContent = "删除中...";
      removeBtn.disabled = true;
    }
    
    try {
      await deleteStoredImage(this.getCurrentImageKey());
      this.currentUserImage = null;
      this.renderStepImageState(this.getCurrentStep());
      this.infoModal("删除成功", "参考图片已删除。");
    } catch (error) {
      console.error("删除图片失败:", error);
      this.infoModal("删除失败", "这张图片暂时没有删除成功。");
    } finally {
      // 恢复按钮状态
      if (removeBtn) {
        removeBtn.textContent = "删除图片";
        removeBtn.disabled = false;
      }
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
    if (!this.imageStoreAvailable) {
      this.infoModal("当前无法保存视频", "这个浏览器环境暂时不能保存视频，页面会继续使用默认教程。");
      return;
    }
    
    // 显示加载状态
    const uploadBtn = document.querySelector("[data-file-input='video']").parentElement.querySelector("button") || document.getElementById("upload-video-btn");
    if (uploadBtn) {
      uploadBtn.textContent = "上传中...";
      uploadBtn.disabled = true;
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
      this.infoModal("视频上传成功", "视频教程已保存，你可以在步骤中查看。");
    } catch (error) {
      console.error("视频处理失败:", error);
      this.infoModal("视频保存失败", "这段视频没有保存成功，你可以换一段再试。");
    } finally {
      // 恢复按钮状态
      if (uploadBtn) {
        uploadBtn.textContent = "上传视频";
        uploadBtn.disabled = false;
      }
    }
  }

  async removeCurrentStepVideo() {
    const confirmed = await this.confirmModal("删除视频", "要删除这一步的视频教程吗？");
    if (!confirmed) return;
    
    // 显示加载状态
    const removeBtn = document.getElementById("remove-video-btn");
    if (removeBtn) {
      removeBtn.textContent = "删除中...";
      removeBtn.disabled = true;
    }
    
    try {
      const video = document.getElementById("step-video");
      if (video) video.src = "";
      if (removeBtn) removeBtn.style.display = "none";
      if (this.imageStoreAvailable) {
        await deleteStoredImage(this.getCurrentVideoKey());
      }
      this.infoModal("删除成功", "视频教程已删除。");
    } catch (error) {
      console.error("删除视频失败:", error);
      this.infoModal("删除失败", "这段视频暂时没有删除成功。");
    } finally {
      // 恢复按钮状态
      if (removeBtn) {
        removeBtn.textContent = "删除视频";
        removeBtn.disabled = false;
      }
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

  speak(text, force = false) {
    this.stopSpeaking();
    if (!this.synth || typeof window.SpeechSynthesisUtterance === "undefined") return;
    if (this.isMobile && !this.voiceActivated && !force) {
      this.voiceActivated = true;
    }

    // 强制唤醒加载设备语音包（修复 iOS 首次无声 Bug）
    this.synth.getVoices();

    const settings = this.getVoiceSettings();
    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.lang = settings.lang;
    this.currentUtterance.rate = settings.rate;
    this.currentUtterance.pitch = 1;

    const voiceBtn = document.getElementById("voice-btn");
    if (voiceBtn) voiceBtn.classList.add("speaking");

    this.currentUtterance.onend = () => {
      if (voiceBtn) voiceBtn.classList.remove("speaking");
    };
    this.currentUtterance.onerror = () => {
      if (voiceBtn) voiceBtn.classList.remove("speaking");
    };

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

  // ========== 安全警告系统 ==========
  renderSafetyPanel(step) {
    const panel = document.getElementById("safety-panel");
    const warningText = document.getElementById("safety-warning-text");
    const tipsSection = document.getElementById("safety-tips-section");
    const dontSection = document.getElementById("safety-dont-section");
    const emergencySection = document.getElementById("safety-emergency-section");
    const iconEl = document.getElementById("safety-icon");
    const titleEl = document.getElementById("safety-title");

    if (!step.safetyLevel || step.safetyLevel === "low") {
      panel.classList.add("hidden");
      return;
    }

    panel.classList.remove("hidden");
    panel.classList.remove("safety-high");

    if (step.safetyLevel === "high") {
      panel.classList.add("safety-high");
      iconEl.textContent = "🔴";
      titleEl.textContent = "高度危险警示";
    } else if (step.safetyLevel === "medium") {
      iconEl.textContent = "⚠️";
      titleEl.textContent = "安全提示";
    } else {
      iconEl.textContent = "ℹ️";
      titleEl.textContent = "注意事项";
    }

    // 警告文字
    if (step.safetyWarning) {
      warningText.textContent = step.safetyWarning;
      warningText.classList.remove("hidden");
    } else {
      warningText.classList.add("hidden");
    }

    // 安全做法
    if (step.safetyTips && step.safetyTips.length > 0) {
      document.getElementById("safety-tips-list").innerHTML =
        step.safetyTips.map(tip => `<li>${escapeHtml(tip)}</li>`).join("");
      tipsSection.classList.remove("hidden");
    } else {
      tipsSection.classList.add("hidden");
    }

    // 禁止事项
    if (step.dontDoList && step.dontDoList.length > 0) {
      document.getElementById("safety-dont-list").innerHTML =
        step.dontDoList.map(item => `<li>${escapeHtml(item)}</li>`).join("");
      dontSection.classList.remove("hidden");
    } else {
      dontSection.classList.add("hidden");
    }

    // 紧急处理指引
    if (step.emergencyGuide) {
      document.getElementById("safety-emergency-text").textContent = step.emergencyGuide;
      emergencySection.classList.remove("hidden");
    } else {
      emergencySection.classList.add("hidden");
    }
  }

  // ========== 步骤计时器 ==========
  stepTimerInterval = null;
  stepTimerSeconds = 0;

  startStepTimer(step) {
    this.stopStepTimer();
    this.stepTimerSeconds = 0;
    this.updateStepTimerDisplay();

    const estimateEl = document.getElementById("timer-estimate");
    const warningEl = document.getElementById("timer-warning");

    if (step.estimatedTime) {
      estimateEl.textContent = `建议：${step.estimatedTime.min}-${step.estimatedTime.max}分钟`;
      estimateEl.classList.remove("hidden");
    } else {
      estimateEl.classList.add("hidden");
    }
    warningEl.classList.add("hidden");

    this.stepTimerInterval = setInterval(() => {
      this.stepTimerSeconds++;
      this.updateStepTimerDisplay();

      // 超时警告（超过建议时间的3倍）
      if (step.estimatedTime && this.stepTimerSeconds > step.estimatedTime.max * 180) {
        warningEl.classList.remove("hidden");
      }
    }, 1000);
  }

  stopStepTimer() {
    if (this.stepTimerInterval) {
      clearInterval(this.stepTimerInterval);
      this.stepTimerInterval = null;
    }
  }

  updateStepTimerDisplay() {
    const minutes = Math.floor(this.stepTimerSeconds / 60);
    const seconds = this.stepTimerSeconds % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById("timer-time").textContent = timeStr;
    document.getElementById("timer-status").textContent = "计时中...";
  }

  // ========== 错误恢复机制 ==========
  goToPrevStep() {
    if (!this.currentTask || this.currentStepIndex <= 0) return;
    this.stopStepTimer();
    this.currentStepIndex--;
    this.renderStep();
    setTimeout(() => this.speakCurrentStep(), 200);
  }

  confirmRestartTask() {
    this.confirmModal("重新开始", "确定要从头开始这个任务吗？当前进度会丢失。", "确认重做")
      .then(confirmed => {
        if (confirmed) this.restartTask();
      });
  }

  showProblemPanel() {
    document.getElementById("problem-panel").classList.remove("hidden");
  }

  hideProblemPanel() {
    document.getElementById("problem-panel").classList.add("hidden");
  }

  handleProblemSelection(problemType) {
    this.hideProblemPanel();

    switch (problemType) {
      case "wrong":
        this.infoModal("没关系", "做错了可以重来，这一步我们会重新开始计时。");
        this.currentStepIndex = Math.max(0, this.currentStepIndex - 1);
        this.completeStep();
        break;

      case "notfound":
        this.showAssist("notfound");
        break;

      case "confused":
        this.showAssist("simplify");
        setTimeout(() => this.showAssist("need"), 500);
        break;

      case "accident":
        this.showModal({
          title: "⚠️ 出现了意外情况",
          message: "请先确保自己安全，然后：\n1. 如果有人受伤，立即呼叫帮助\n2. 如果只是物品问题，尝试清理或告知同事\n3. 不要慌张，慢慢来",
          actions: [
            { label: "我知道了", variant: "primary", onClick: () => {} },
            { label: "📞 联系主管", variant: "secondary", onClick: () => this.handleEmergencyCall() }
          ]
        });
        break;

      case "tired":
        this.showModal({
          title: "😴 需要休息",
          message: "累了就休息一下，这是很正常的。\n\n你可以：\n• 喝口水，走动一下\n• 深呼吸几次\n• 休息5-10分钟再继续\n\n任务进度已经保存了。",
          actions: [
            { label: "好的，我去休息", variant: "primary", onClick: () => {} },
            { label: "🧘 冷静一下", variant: "secondary", onClick: () => this.openCalmMode() }
          ]
        });
        break;

      case "anxious":
        this.openCalmMode();
        break;

      case "comm":
        this.hideProblemPanel();
        this.toggleCommunicationPanel();
        break;

      case "contact":
        this.hideProblemPanel();
        this.showContactList();
        break;
    }
  }

  // ========== 职场沟通脚本库 ==========
  communicationScripts = {
    late: {
      title: "⏰ 迟到了怎么说",
      scripts: [
        "对不起，我今天迟到了X分钟，我会把时间补回来。",
        "不好意思来晚了，路上有点堵，我现在就开始工作。"
      ]
    },
    "dont-understand": {
      title: "❓ 不懂任务时怎么问",
      scripts: [
        "请问这个任务具体要怎么做？可以再演示一遍吗？",
        "我不太明白这一步，能帮我看看吗？"
      ]
    },
    "need-help": {
      title: "🤝 需要帮助时怎么表达",
      scripts: [
        "我现在在做XX，遇到了XX问题，能帮我看一下吗？",
        "请问这一步应该怎么做？我不太确定。"
      ]
    },
    unwell: {
      title: "🤒 身体不适时怎么请假",
      scripts: [
        "我现在感觉不太舒服，可以去休息一会儿吗？",
        "我今天身体有点不舒服，可能需要早一点离开，可以吗？"
      ]
    },
    criticized: {
      title: "😔 被批评时怎么回应",
      scripts: [
        "好的，我记住了，下次我会注意XX。",
        "谢谢您的提醒，我会改进的。"
      ]
    },
    "finish-work": {
      title: "✅ 下班前怎么确认",
      scripts: [
        "今天的任务都完成了吗？还有需要我做的吗？",
        "我已经完成了XX工作，现在可以下班了吗？"
      ]
    },
    conflict: {
      title: "💢 同事冲突时怎么沟通",
      scripts: [
        "刚才那个情况让我有点困扰，我们可以聊聊吗？",
        "我觉得我们在XX上有些分歧，能找个时间谈谈吗？"
      ]
    },
    mistake: {
      title: "😅 做错了事怎么道歉",
      scripts: [
        "对不起，是我弄错了，我会马上改正。",
        "抱歉给您添麻烦了，下次我会注意的。"
      ]
    }
  };

  currentCommScenario = null;
  currentCommScriptIndex = 0;

  toggleCommunicationPanel() {
    const panel = document.getElementById("communication-panel");
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden")) {
      document.getElementById("communication-scripts").classList.add("hidden");
    }
  }

  hideCommunicationPanel() {
    document.getElementById("communication-panel").classList.add("hidden");
    document.getElementById("communication-scripts").classList.add("hidden");
  }

  selectCommScenario(scenario) {
    this.currentCommScenario = scenario;
    this.currentCommScriptIndex = 0;

    const data = this.communicationScripts[scenario];
    if (!data) return;

    document.querySelectorAll(".btn-comm-scenario").forEach(btn => btn.classList.remove("active"));
    document.querySelector(`[data-scenario="${scenario}"]`)?.classList.add("active");

    document.getElementById("comm-script-title").textContent = data.title;
    this.updateCommScriptContent();

    document.getElementById("communication-scripts").classList.remove("hidden");
  }

  updateCommScriptContent() {
    if (!this.currentCommScenario) return;
    const data = this.communicationScripts[this.currentCommScenario];
    const script = data.scripts[this.currentCommScriptIndex] || data.scripts[0];
    document.getElementById("comm-script-content").textContent = script;
  }

  copyCommScript() {
    const content = document.getElementById("comm-script-content").textContent;
    navigator.clipboard.writeText(content).then(() => {
      this.infoModal("已复制", "话术已复制到剪贴板，可以直接粘贴使用。");
    }).catch(() => {
      this.infoModal("复制失败", "请手动选择文字复制。");
    });
  }

  speakCommScript() {
    const content = document.getElementById("comm-script-content").textContent;
    this.speak(content);
  }

  // ========== 冷静模式/恐慌急救包 ==========
  affirmations = [
    "我可以的",
    "慢慢来，没人催我",
    "深呼吸，我能做到",
    "这只是一小步",
    "我很勇敢",
    "我可以寻求帮助",
    "一切都会好起来的",
    "我相信自己"
  ];
  currentAffirmationIndex = 0;
  groundingItems = [];
  breathingAnimationInterval = null;

  openCalmMode() {
    const overlay = document.getElementById("calm-mode-overlay");
    overlay.classList.remove("hidden");
    this.startBreathingAnimation();
    this.showAffirmation();
    this.groundingItems = [];
    document.getElementById("grounding-list").innerHTML = "";
    document.getElementById("grounding-input").value = "";
  }

  closeCalmMode() {
    document.getElementById("calm-mode-overlay").classList.add("hidden");
    this.stopBreathingAnimation();
  }

  startBreathingAnimation() {
    this.stopBreathingAnimation();
    let phase = 0;
    const instructions = ["吸气...", "屏住呼吸...", "呼气...", "放松..."];
    const instructionEl = document.getElementById("breath-instruction");

    this.breathingAnimationInterval = setInterval(() => {
      instructionEl.textContent = instructions[phase];
      phase = (phase + 1) % 4;
    }, 2000);

    instructionEl.textContent = instructions[0];
  }

  stopBreathingAnimation() {
    if (this.breathingAnimationInterval) {
      clearInterval(this.breathingAnimationInterval);
      this.breathingAnimationInterval = null;
    }
  }

  showAffirmation() {
    const affirmation = this.affirmations[this.currentAffirmationIndex];
    const card = document.getElementById("affirmation-current");
    card.style.animation = "none";
    card.offsetHeight;
    card.style.animation = "affirmation-fade 0.5s ease";
    card.textContent = affirmation;
  }

  nextAffirmation() {
    this.currentAffirmationIndex = (this.currentAffirmationIndex + 1) % this.affirmations.length;
    this.showAffirmation();
  }

  addGroundingItem() {
    const input = document.getElementById("grounding-input");
    const value = input.value.trim();
    if (!value) return;

    this.groundingItems.push(value);
    const list = document.getElementById("grounding-list");
    const li = document.createElement("li");
    li.textContent = value;
    list.appendChild(li);

    input.value = "";

    if (this.groundingItems.length >= 5) {
      document.getElementById("grounding-section").querySelector(".grounding-title")
        .textContent = "✅ 很好！你现在已经回到当下，感觉怎么样？";
    }
  }

  // ========== 可视化任务编辑器 ==========
  editorCurrentTaskId = null;
  editorSteps = [];
  editingStepIndex = -1;

  openCustomTaskBuilder(taskId = null) {
    const task = taskId ? this.customTasks.find(item => item.id === taskId) : null;

    this.editorCurrentTaskId = taskId || null;
    this.editorSteps = task ? JSON.parse(JSON.stringify(task.steps)) : [];

    document.getElementById("task-editor-title").textContent = task ? "编辑自定义任务" : "新建自定义任务";
    document.getElementById("editor-task-name").value = task?.title || "";
    document.getElementById("editor-task-desc").value = task?.description || "";
    this.populateCategorySelect();
    if (task) {
      document.getElementById("editor-task-category").value = task.category;
    }

    this.renderStepsList();
    this.updateStepCount();

    document.getElementById("task-editor-overlay").classList.remove("hidden");
  }

  closeTaskEditor() {
    document.getElementById("task-editor-overlay").classList.add("hidden");
    this.editorSteps = [];
    this.editorCurrentTaskId = null;
    this.editingStepIndex = -1;
  }

  populateCategorySelect() {
    const select = document.getElementById("editor-task-category");
    const customCategories = getCustomCategories();

    select.innerHTML = `
      <option value="restaurant">🍽️ 餐厅</option>
      <option value="snack">🍬 零食</option>
      <option value="warehouse">📦 仓库</option>
      <option value="carwash">🚗 洗车</option>
      ${customCategories.map(cat => `<option value="${cat.id}">${cat.icon || '📁'} ${escapeHtml(cat.name)}</option>`).join('')}
    `;
  }

  renderStepsList() {
    const list = document.getElementById("steps-list");

    if (this.editorSteps.length === 0) {
      list.innerHTML = `
        <div class="empty-steps-hint">
          <span class="hint-icon">📝</span>
          <p>还没有步骤</p>
          <p style="font-size: 13px;">点击上方"+ 添加步骤"开始创建</p>
        </div>
      `;
      return;
    }

    list.innerHTML = this.editorSteps.map((step, index) => `
      <div class="wysiwyg-step-card" data-index="${index}" draggable="true">
        <div class="wysiwyg-step-header">
          <div class="wysiwyg-step-number">
            步骤 <span class="num-badge">${index + 1}</span>
          </div>
          <div class="wysiwyg-step-tools">
            <button class="wysiwyg-tool-btn" data-action="move-up" data-index="${index}" title="上移">⬆️</button>
            <button class="wysiwyg-tool-btn" data-action="move-down" data-index="${index}" title="下移">⬇️</button>
            <button class="wysiwyg-tool-btn danger" data-action="delete" data-index="${index}" title="删除步骤">🗑️</button>
          </div>
        </div>

        <div class="wysiwyg-step-body">
          <!-- 步骤指令（主文字，大字显示） -->
          <div class="wysiwyg-instruction">
            <input type="text"
                   data-field="instruction"
                   data-index="${index}"
                   placeholder="✏️ 点击输入步骤指令..."
                   value="${escapeHtml(step.instruction || "")}">
          </div>

          <!-- 详细说明 -->
          <div class="wysiwyg-detail">
            <textarea data-field="detail"
                      data-index="${index}"
                      placeholder="✏️ 详细说明（操作者看到的补充信息）...">${escapeHtml(step.detail || "")}</textarea>
          </div>

          <!-- 简单说法 -->
          <div class="wysiwyg-simplify">
            <span class="simplify-label">💬</span>
            <input type="text"
                   data-field="simplify"
                   data-index="${index}"
                   placeholder="更简单的说法..."
                   value="${escapeHtml(step.simplify || "")}">
          </div>

          <!-- 图片/视频上传区域 -->
          <div class="wysiwyg-media">
            <div class="media-upload-area ${step.userImageKey ? 'has-media' : ''}" 
                 data-type="image" data-index="${index}">
              ${step.userImageKey ? `
                <img src="" alt="步骤图片" data-preview="image-${index}">
                <button class="media-remove-btn" data-remove="image" data-index="${index}">✕</button>
                <div class="media-change-hint">点击更换图片</div>
              ` : `
                <div class="media-placeholder">
                  <span class="icon">🖼️</span>
                  <span class="text">上传图片</span>
                </div>
              `}
              <input type="file" accept="image/*" hidden data-file-input="image" data-index="${index}">
            </div>

            <div class="media-upload-area ${step.videoUrl ? 'has-media' : ''}"
                 data-type="video" data-index="${index}">
              ${step.videoUrl ? `
                <video src="${escapeHtml(step.videoUrl)}" muted data-preview="video-${index}"></video>
                <button class="media-remove-btn" data-remove="video" data-index="${index}">✕</button>
                <div class="media-change-hint">点击更换视频</div>
              ` : `
                <div class="media-placeholder">
                  <span class="icon">🎬</span>
                  <span class="text">添加视频链接</span>
                </div>
              `}
            </div>
          </div>

          <!-- 更多选项（折叠） -->
          <div class="wysiwyg-more-options">
            <button class="wysiwyg-more-toggle" data-toggle-more="${index}">
              ⚙️ 更多设置（安全等级、时间等）
            </button>
            <div class="wysiwyg-more-content" id="more-content-${index}">
              <div class="wysiwyg-field-group">
                <label>安全等级</label>
                <select data-field="safetyLevel" data-index="${index}">
                  <option value="low" ${step.safetyLevel === 'low' ? 'selected' : ''}>✅ 低风险</option>
                  <option value="medium" ${step.safetyLevel === 'medium' ? 'selected' : ''}>⚠️ 中等风险</option>
                  <option value="high" ${step.safetyLevel === 'high' ? 'selected' : ''}>🔴 高风险</option>
                </select>
              </div>
              <div class="wysiwyg-field-group">
                <label>预计时间（分钟）</label>
                <input type="number" data-field="timeMin" data-index="${index}" 
                       value="${step.estimatedTime?.min || 2}" min="1" max="60" placeholder="最小">
              </div>
              <div class="wysiwyg-field-group">
                <label>找不到时提示</label>
                <input type="text" data-field="helpNotFound" data-index="${index}"
                       placeholder="用；分隔多条" 
                       value="${Array.isArray(step.helpNotFound) ? step.helpNotFound.join('；') : (step.helpNotFound || '')}">
              </div>
              <div class="wysiwyg-field-group">
                <label>需要帮助时话术</label>
                <input type="text" data-field="helpNeed" data-index="${index}"
                       placeholder="用；分隔多条"
                       value="${Array.isArray(step.helpNeed) ? step.helpNeed.join('；') : (step.helpNeed || '')}">
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    this.initWysiwygEvents();
    this.loadStepImages();
  }

  initWysiwygEvents() {
    const list = document.getElementById("steps-list");

    // 文本输入实时保存
    list.querySelectorAll('input[data-field], textarea[data-field], select[data-field]').forEach(el => {
      el.addEventListener("input", (e) => {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        this.updateStepField(index, field, e.target.value);
      });
      el.addEventListener("change", (e) => {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        this.updateStepField(index, field, e.target.value);
      });
    });

    // 工具按钮
    list.querySelectorAll('.wysiwyg-tool-btn').forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index);
        if (action === "delete") this.deleteStep(index);
        if (action === "move-up") this.moveStep(index, -1);
        if (action === "move-down") this.moveStep(index, 1);
      });
    });

    // 折叠更多选项
    list.querySelectorAll('.wysiwyg-more-toggle').forEach(btn => {
      btn.addEventListener("click", (e) => {
        const index = btn.dataset.toggleMore;
        const content = document.getElementById(`more-content-${index}`);
        content.classList.toggle("show");
        btn.textContent = content.classList.contains("show") 
          ? "▲ 收起设置" 
          : "⚙️ 更多设置（安全等级、时间等）";
      });
    });

    // 图片上传
    list.querySelectorAll('.media-upload-area[data-type="image"]').forEach(area => {
      area.addEventListener("click", (e) => {
        if (e.target.closest(".media-remove-btn")) return;
        const fileInput = area.querySelector('[data-file-input]');
        fileInput.click();
      });
      const fileInput = area.querySelector('[data-file-input]');
      fileInput.addEventListener("change", (e) => {
        const index = parseInt(fileInput.dataset.index);
        if (e.target.files[0]) {
          this.uploadStepImage(index, e.target.files[0]);
        }
      });
    });

    // 删除图片/视频
    list.querySelectorAll('.media-remove-btn').forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const type = btn.dataset.remove;
        const index = parseInt(btn.dataset.index);
        if (type === "image") this.removeStepImage(index);
        if (type === "video") this.removeStepVideo(index);
      });
    });

    // 视频链接输入
    list.querySelectorAll('.media-upload-area[data-type="video"]').forEach(area => {
      if (!area.querySelector('video')) {
        area.addEventListener("click", () => {
          const url = prompt("请输入视频URL：");
          if (url && url.trim()) {
            const index = parseInt(area.dataset.index);
            this.updateStepField(index, "videoUrl", url.trim());
            this.renderStepsList();
          }
        });
      } else {
        area.addEventListener("click", () => {
          const index = parseInt(area.dataset.index);
          const newUrl = prompt("修改视频URL：", this.editorSteps[index].videoUrl);
          if (newUrl !== null) {
            this.updateStepField(index, "videoUrl", newUrl.trim() || "");
            this.renderStepsList();
          }
        });
      }
    });

    // 拖拽排序
    this.initDragAndDrop();
  }

  updateStepField(index, field, value) {
    if (!this.editorSteps[index]) return;
    const step = this.editorSteps[index];

    switch(field) {
      case "instruction":
        step.instruction = value;
        break;
      case "detail":
        step.detail = value;
        break;
      case "simplify":
        step.simplify = value;
        break;
      case "safetyLevel":
        step.safetyLevel = value;
        break;
      case "helpNotFound":
        step.helpNotFound = value ? value.split("；").map(s => s.trim()).filter(Boolean) : [];
        break;
      case "helpNeed":
        step.helpNeed = value ? value.split("；").map(s => s.trim()).filter(Boolean) : [];
        break;
      case "timeMin":
        const minVal = parseInt(value) || 2;
        step.estimatedTime = { min: minVal, max: Math.max(minVal, step.estimatedTime?.max || 5) };
        break;
      default:
        step[field] = value;
    }
  }

  async uploadStepImage(index, file) {
    try {
      const key = `editor-temp-${Date.now()}`;
      await this.storeImageToIndexedDB(key, file);
      const url = await this.getImageFromIndexedDB(key);

      this.editorSteps[index].userImageKey = key;

      const img = document.querySelector(`[data-preview="image-${index}"]`);
      if (img) img.src = url;

      const area = document.querySelector(`.media-upload-area[data-type="image"][data-index="${index}"]`);
      if (area) area.classList.add("has-media");

      this.renderStepsList();
    } catch (error) {
      alert("图片上传失败：" + error.message);
    }
  }

  removeStepImage(index) {
    this.editorSteps[index].userImageKey = "";
    this.renderStepsList();
  }

  removeStepVideo(index) {
    this.editorSteps[index].videoUrl = "";
    this.renderStepsList();
  }

  async loadStepImages() {
    for (let i = 0; i < this.editorSteps.length; i++) {
      const step = this.editorSteps[i];
      if (step.userImageKey) {
        try {
          const url = await this.getImageFromIndexedDB(step.userImageKey);
          const img = document.querySelector(`[data-preview="image-${i}"]`);
          if (img) img.src = url;
        } catch (error) {}
      }
    }
  }

  moveStep(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.editorSteps.length) return;

    [this.editorSteps[index], this.editorSteps[newIndex]] = [this.editorSteps[newIndex], this.editorSteps[index]];
    this.renderStepsList();
  }

  initDragAndDrop() {
    const stepsList = document.getElementById("steps-list");
    let draggedItem = null;

    stepsList.querySelectorAll(".wysiwyg-step-card").forEach(item => {
      item.addEventListener("dragstart", (e) => {
        draggedItem = item;
        setTimeout(() => item.classList.add("dragging"), 0);
      });

      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        draggedItem = null;
      });

      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        const afterElement = this.getDragAfterElement(stepsList, e.clientY);
        if (afterElement == null) {
          stepsList.appendChild(draggedItem);
        } else {
          stepsList.insertBefore(draggedItem, afterElement);
        }
      });

      item.addEventListener("drop", () => {
        const allItems = [...stepsList.querySelectorAll(".wysiwyg-step-card")];
        const newOrder = allItems.map(el => parseInt(el.dataset.index));
        const newSteps = newOrder.map(idx => this.editorSteps[idx]);
        this.editorSteps = newSteps;
        this.renderStepsList();
      });
    });
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll(".wysiwyg-step-card:not(.dragging)")];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  updateStepCount() {
    document.getElementById("step-count").textContent = `(${this.editorSteps.length} 步)`;
  }

  addNewStep() {
    const newStep = {
      instruction: "",
      detail: "",
      simplify: "",
      whyItMatters: "",
      image: "icon-check",
      userImageKey: "",
      videoUrl: "",
      safetyLevel: "low",
      safetyWarning: "",
      safetyTips: [],
      dontDoList: [],
      emergencyGuide: "",
      helpNotFound: [],
      helpNeed: [],
      estimatedTime: { min: 2, max: 5 }
    };

    this.editorSteps.push(newStep);
    this.renderStepsList();
    this.updateStepCount();

    setTimeout(() => {
      const list = document.getElementById("steps-list");
      const lastCard = list.querySelector(".wysiwyg-step-card:last-child");
      if (lastCard) {
        lastCard.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = lastCard.querySelector('input[data-field="instruction"]');
        if (input) input.focus();
      }
    }, 100);
  }

  deleteStep(index) {
    if (!confirm(`确定删除第 ${index + 1} 步吗？`)) return;
    this.editorSteps.splice(index, 1);
    this.renderStepsList();
    this.updateStepCount();
  }

  saveTaskFromEditor() {
    const title = document.getElementById("editor-task-name").value.trim();
    const category = document.getElementById("editor-task-category").value;
    const description = document.getElementById("editor-task-desc").value.trim() || "这是带教人员为当前使用者定制的任务。";

    if (!title) {
      alert("请填写任务名称！");
      return;
    }

    if (this.editorSteps.length === 0) {
      alert("至少需要添加一个步骤！");
      return;
    }

    for (let i = 0; i < this.editorSteps.length; i++) {
      if (!this.editorSteps[i].instruction) {
        alert(`第 ${i + 1} 步的步骤指令未填写！`);
        const input = document.querySelector(`input[data-field="instruction"][data-index="${i}"]`);
        if (input) { input.focus(); input.scrollIntoView({ behavior: "smooth" }); }
        return;
      }
    }

    const existingTask = this.editorCurrentTaskId ? this.customTasks.find(t => t.id === this.editorCurrentTaskId) : null;
    const customTaskId = existingTask?.id || this.generateLocalId("custom");

    const stepsWithKeys = this.editorSteps.map((step, index) => ({
      ...step,
      userImageKey: step.userImageKey || `${customTaskId}-step-${index}`
    }));

    const record = this.buildCustomTaskRecord({
      id: customTaskId,
      title,
      category,
      description,
      steps: stepsWithKeys,
      icon: existingTask?.icon || CUSTOM_TASK_ICON_MAP[category] || "📋"
    });

    if (existingTask) {
      const index = this.customTasks.findIndex(t => t.id === customTaskId);
      this.customTasks.splice(index, 1, record);
      if (this.currentTask?.id === customTaskId) {
        this.currentTask = record;
      }
    } else {
      this.customTasks.unshift(record);
    }

    this.saveAndRefreshCustomTasks();
    this.closeTaskEditor();
    this.infoModal(existingTask ? "任务已更新" : "任务已保存", existingTask ? "这个自定义任务已经更新。" : "这个自定义任务已经加入列表。");
  }

  // ========== 分类管理 ==========
  openCategoryManager() {
    this.renderCustomCategoryList();
    document.getElementById("category-manager-overlay").classList.remove("hidden");
  }

  closeCategoryManager() {
    document.getElementById("category-manager-overlay").classList.add("hidden");
  }

  // 图标数据
  iconData = [
    "📋", "📁", "📂", "📅", "📆", "📇", "📈", "📉",
    "🏠", "🏢", "🏥", "🏪", "🏫", "🏬", "🏭", "🏯",
    "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓",
    "🍈", "🍒", "🍑", "🍍", "🥭", "🍎", "🍏", "🍐",
    "🧹", "🧺", "🧻", "🧼", "🧽", "🧴", "🧰", "🧱",
    "💼", "📱", "💻", "⌨️", "🖱️", "🖨️", "📞", "📟",
    "🍵", "☕", "🍽️", "🍴", "🍷", "🥃", "🍺", "🍻",
    "🚶", "🚗", "🚌", "🚕", "🚙", "🚚", "🚛", "🚜"
  ];

  // 打开图标选择器
  openIconPicker() {
    const iconGrid = document.getElementById("icon-grid");
    iconGrid.innerHTML = this.iconData.map(icon => `
      <div class="icon-item" data-icon="${icon}">
        ${icon}
      </div>
    `).join('');

    // 添加图标点击事件
    iconGrid.querySelectorAll(".icon-item").forEach(item => {
      item.addEventListener("click", () => {
        const icon = item.dataset.icon;
        document.getElementById("new-category-icon").value = icon;
        this.closeIconPicker();
      });
    });

    document.getElementById("icon-picker-overlay").classList.remove("hidden");
  }

  // 关闭图标选择器
  closeIconPicker() {
    document.getElementById("icon-picker-overlay").classList.add("hidden");
  }

  renderCustomCategoryList() {
    const list = document.getElementById("custom-category-list");
    const categories = getCustomCategories();

    if (categories.length === 0) {
      list.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 20px 0;">还没有自定义分类</p>';
      return;
    }

    list.innerHTML = categories.map(cat => `
      <div class="category-item" data-id="${cat.id}">
        <span class="category-item-name">${cat.icon || '📁'} ${escapeHtml(cat.name)}</span>
        <button class="category-delete-btn" data-id="${cat.id}" title="删除此分类">✕</button>
      </div>
    `).join('');
  }

  addCustomCategory() {
    const nameInput = document.getElementById("new-category-name");
    const iconInput = document.getElementById("new-category-icon");
    const name = nameInput.value.trim();
    const icon = iconInput.value.trim() || "📁";

    if (!name) {
      alert("请填写分类名称！");
      return;
    }

    const id = name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, "-") + "-" + Date.now();
    const categories = getCustomCategories();

    if (categories.some(c => c.name === name)) {
      alert("该分类名称已存在！");
      return;
    }

    categories.push({ id, name, icon });
    saveCustomCategories(categories);

    nameInput.value = "";
    iconInput.value = "";

    this.renderCustomCategoryList();
    this.populateCategorySelect();
  }

  deleteCustomCategory(id) {
    if (!confirm("确定删除这个分类吗？")) return;
    let categories = getCustomCategories();
    categories = categories.filter(c => c.id !== id);
    saveCustomCategories(categories);
    this.renderCustomCategoryList();
    this.populateCategorySelect();
  }

}

document.addEventListener("DOMContentLoaded", () => {
  window.houchangApp = new HouChangApp();
});

window.addEventListener("beforeunload", () => {
  if (window.houchangApp) window.houchangApp.stopSpeaking();
});
