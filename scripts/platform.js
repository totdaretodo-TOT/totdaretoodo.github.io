(function () {
  const JSON_INDENT = 2;

  function getString(key, fallback = "") {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  }

  function setString(key, value) {
    localStorage.setItem(key, String(value));
  }

  function getJSON(key, fallback = null) {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("Cannot parse local data", key, error);
      return fallback;
    }
  }

  function setJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value, null, JSON_INDENT));
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  function keys() {
    return Object.keys(localStorage);
  }

  async function writeText(text) {
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

  function createImageStore(dbName, storeName) {
    function open() {
      return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          reject(new Error("IndexedDB unavailable"));
          return;
        }
        const request = window.indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Cannot open image database"));
      });
    }

    async function get(key) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, "readonly").objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error("Cannot read image"));
      });
    }

    async function set(key, value) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, "readwrite").objectStore(storeName).put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error("Cannot save image"));
      });
    }

    async function deleteItem(key) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, "readwrite").objectStore(storeName).delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error("Cannot delete image"));
      });
    }

    async function list() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const store = db.transaction(storeName, "readonly").objectStore(storeName);
        const request = store.openCursor();
        const items = [];
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push({ key: cursor.key, value: cursor.value });
          cursor.continue();
        };
        request.onerror = () => reject(request.error || new Error("Cannot list media"));
      });
    }

    async function clear() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, "readwrite").objectStore(storeName).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error("Cannot clear media"));
      });
    }

    async function importItems(items) {
      if (!Array.isArray(items) || !items.length) return;
      const db = await open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        items.forEach(item => {
          if (!item || typeof item.key !== "string") return;
          store.put(item.value, item.key);
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("Cannot import media"));
      });
    }

    return { open, get, set, delete: deleteItem, list, clear, importItems };
  }

  window.HouChangPlatform = {
    storage: { getString, setString, getJSON, setJSON, remove, keys },
    clipboard: { writeText },
    createImageStore
  };
})();
