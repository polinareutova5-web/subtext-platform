const API_URL = "https://script.google.com/macros/s/AKfycbwHKB_QtqVQN8XHjq8ftpKUG7pFa1gd2yG5nE76o-ssxBujJdfh3LOOw2ouGNgn7yudRw/exec";


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
async function loadSlots() {
  const container = document.getElementById('lesson-schedule');

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
          <strong>${slot.date}</strong> — ${slot.time}<br>
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
async function submitHomework() {
  const text = document.getElementById('hwText').value.trim();
  const fileInput = document.getElementById('hwImage');
  const file = fileInput.files[0];

  if (!file && !text) {
    alert("Введите текст или прикрепите фото");
    return;
  }

  try {
    if (file) {
      if (!file.type.match(/image\/(jpeg|png|gif)/)) {
        alert("Поддерживаются JPG, PNG, GIF");
        return;
      }

      const base64 = await new Promise(resolve => {
        const r = new FileReader();
        r.onload = () => resolve(r.result.split(",")[1]);
        r.readAsDataURL(file);
      });

      const payload = {
        action: "submit_homework",
        userId,
        username,
        lessonNum: 0,
        text,
        fileName: file.name,
        fileBase64: base64
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      document.getElementById('hwStatus').textContent =
        data.success ? "✅ ДЗ отправлено!" : "❌ " + data.error;

      if (data.success) {
        document.getElementById('hwText').value = "";
        fileInput.value = "";
      }

    } else {
      const res = await fetch(
        `${API_URL}?action=submit_homework&userId=${encodeURIComponent(userId)}&homeworkText=${encodeURIComponent(text)}&lessonNum=0`
      );

      const data = await res.json();
      document.getElementById('hwStatus').textContent =
        data.success ? "✅ ДЗ отправлено!" : "❌ " + data.error;

      if (data.success) document.getElementById('hwText').value = "";
    }

  } catch {
    document.getElementById('hwStatus').textContent = "❌ Ошибка отправки";
  }
}

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

// ================= INIT =================
window.addEventListener("DOMContentLoaded", loadData);
