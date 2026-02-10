const API_URL = "https://script.google.com/macros/s/AKfycbx3-76Q7HRy7jEO9h26ZHkZx9QY_x8vnZYeGg-bXTibovVx1nxPCVbOoeTY2pBrOMocnA/exec";


let userId;
let username = "";

// ================= UI =================
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById(sectionId);
  if (el) el.classList.remove('hidden');

  if (sectionId === "schedule") {
    loadSlots();
  }
}

function confirmBuy(index, name, price) {
  if (confirm(`Хотите купить?\n\n${name}\nЦена: ${price} монет`)) {
    buyItem(index);
  }
}

// ================= LOAD DATA =================
async function loadData() {
  const params = new URLSearchParams(window.location.search);
  userId = params.get('id');

  if (!userId) {
    document.getElementById('loading').textContent = '❌ Не указан ID';
    return;
  }

  try {
    const checkRes = await fetch(`${API_URL}?action=check_user&userId=${encodeURIComponent(userId)}`);
    const checkData = await checkRes.json();

    if (!checkData.success) {
      document.getElementById('loading').textContent = '❌ Вы не зарегистрированы';
      return;
    }

    await loadCabinet();

  } catch (e) {
    console.error(e);
    document.getElementById('loading').textContent = '❌ Ошибка соединения';
  }
}

async function loadCabinet() {
  try {
    const res = await fetch(`${API_URL}?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error();

    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const u = data.user;
    username = u.username || "";

    document.getElementById('username').textContent = u.username || '—';
    document.getElementById('level').textContent = u.level || '—';
    document.getElementById('progress').textContent = u.progress || 0;
    document.getElementById('coins').textContent = u.coins || 0;
    // Прогресс-бар (баллы = проценты, максимум 100)
const progressPercent = Math.min(Math.max(u.progress || 0, 0), 100);
document.getElementById('progress-percent').textContent = progressPercent;
document.getElementById('progress-bar-fill').style.width = `${progressPercent}%`;
    document.getElementById('lesson-link').textContent =
      u.link ? u.link : "Не указана";

    document.getElementById('lesson-schedule').textContent =
      u.schedule ? u.schedule : "Не указано";

    const avatarImg = document.getElementById('avatar-img');
    avatarImg.src = u.avatarUrl || "https://via.placeholder.com/120/2e7d32/FFFFFF?text=👤";

    // ===== Уроки =====
    const lessonsList = document.getElementById('lessons-list');
    lessonsList.innerHTML = data.lessons.length
      ? data.lessons.map(l => `
        <div class="lesson-card">
          <strong>Урок ${l.num}</strong><br>
          <a href="${l.link}" target="_blank">Материалы</a>
          ${l.hwLink && l.hwLink !== '-' ? `<br><a href="${l.hwLink}" target="_blank">ДЗ</a>` : ''}
        </div>
      `).join('')
      : '<p>Нет доступных уроков.</p>';

    // ===== Магазин =====
    const shopItems = document.getElementById('shop-items');
    document.getElementById('shop-coins').textContent = u.coins;
    shopItems.innerHTML = data.shop.length
      ? data.shop.map((item, idx) => `
        <div class="shop-item">
          ${item.image ? `<div style="height:120px;display:flex;align-items:center;justify-content:center;margin-bottom:.5rem">
            <img src="${item.image}" style="max-width:100%;max-height:100%;object-fit:contain">
          </div>` : ''}
          <h3>${item.name}</h3>
          <div class="price">${item.price} монет</div>
          <button class="buy-btn" onclick="confirmBuy(${idx}, \`${item.name}\`, ${item.price})">Купить</button>
        </div>
      `).join('')
      : '<p>Магазин пуст.</p>';

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
    showSection('profile');

  } catch (e) {
    console.error(e);
    document.getElementById('loading').textContent = '❌ Ошибка загрузки кабинета';
  }
}

// ================= СЛОТЫ =================
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(timeStr) {
  const d = new Date(timeStr);
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

async function loadSlots() {
  const container = document.getElementById('slots-container');


  container.innerHTML = "Загрузка слотов...";

  try {
    const res = await fetch(`${API_URL}?action=get_slots`);
    const data = await res.json();

    if (!data.success) {
      container.textContent = "Ошибка загрузки слотов";
      return;
    }

    const slots = data.slots;

    if (!slots.length) {
      container.textContent = "Нет доступных слотов";
      return;
    }

    container.innerHTML = slots.map(slot => {
      const isFree = slot.status === "free";

      return `
        <div style="margin-bottom:.8rem;padding:.8rem;border-radius:12px;
          background:${isFree ? '#e8f5e9' : '#eee'}">
         <strong>${formatDate(slot.date)}</strong> ${formatTime(slot.time)}<br>

          ${isFree
            ? `<button class="buy-btn" onclick="bookSlot(${slot.id})">Записаться</button>`
            : `<span style="opacity:.6">Занято</span>`
          }
        </div>
      `;
    }).join("");

  } catch (e) {
    console.error(e);
    container.textContent = "Ошибка соединения";
  }
}

async function bookSlot(slotId) {
  if (!confirm("Записаться на этот слот?")) return;

  try {
    const res = await fetch(
      `${API_URL}?action=book_slot&userId=${encodeURIComponent(userId)}&slotId=${encodeURIComponent(slotId)}`
    );

    const data = await res.json();

    if (data.success) {
      alert("✅ Вы записались!");
      loadSlots();
    } else {
      alert("❌ " + data.error);
    }

  } catch (e) {
    alert("❌ Ошибка соединения");
  }
}

// ================= HOMEWORK =================


// ================= SHOP =================
async function buyItem(index) {
  try {
    const res = await fetch(`${API_URL}?action=buy_item&userId=${userId}&lessonNum=${index}`);
    const data = await res.json();
    if (data.success) {
      alert("✅ Куплено!");
      location.reload();
    } else {
      alert("❌ " + data.error);
    }
  } catch {
    alert("❌ Ошибка соединения");
  }
}
// ================= Mfterials=================

async function loadMaterials() {
  try {
    const res = await fetch(`${API_URL}?action=get_materials`);
    const data = await res.json();
    
    const container = document.getElementById('materials-list');
    if (!data.success || !data.materials.length) {
      container.innerHTML = '<p>Материалы скоро появятся</p>';
      return;
    }

    container.innerHTML = data.materials.map(item => `
      <div class="lesson-card">
        <strong>${item.title}</strong><br>
        ${item.description ? `<small style="color:#666">${item.description}</small><br>` : ''}
        <a href="${item.url}" target="_blank" class="lesson-btn">Открыть</a>
      </div>
    `).join('');
  } catch (e) {
    console.error(e);
    document.getElementById('materials-list').innerHTML = '<p>❌ Не удалось загрузить материалы</p>';
  }
} // ← ЭТА СКОБКА БЫЛА ПРОПУЩЕНА!

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById(sectionId);
  if (el) el.classList.remove('hidden');

  // Загружать материалы только при открытии
  if (sectionId === 'materials') {
    loadMaterials();
  }
}
// ================= INIT =================
window.addEventListener("DOMContentLoaded", loadData);
