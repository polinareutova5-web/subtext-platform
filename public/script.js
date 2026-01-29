const API_URL = "https://script.google.com/macros/s/AKfycbwWK_kWCPlNdkqy8Mp4wzrxcKzaStrL5JXfYzNwhkXRsqDheKcTfoencudzh7SzYq3ANQ/exec";

let userId;
let username = "";

// ================= UI =================
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById(sectionId);
  if (el) {
    el.classList.remove('hidden');
    if (sectionId === 'schedule') loadSlots();
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
    const data = await res.json();
    if (!data.success) throw new Error();

    const u = data.user;
    username = u.username || "";

    document.getElementById('username').textContent = u.username || '—';
    document.getElementById('level').textContent = u.level || '—';
    document.getElementById('progress').textContent = u.progress || 0;
    document.getElementById('coins').textContent = u.coins || 0;

    document.getElementById('lesson-link').textContent = u.link || "Не указана";
    document.getElementById('lesson-schedule').textContent = u.schedule || "Не указано";

    document.getElementById('avatar-img').src =
      u.avatarUrl || "https://via.placeholder.com/120/2e7d32/FFFFFF?text=👤";

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
          ${item.image ? `<img src="${item.image}">` : ''}
          <h3>${item.name}</h3>
          <div>${item.price} монет</div>
          <button onclick="confirmBuy(${idx}, \`${item.name}\`, ${item.price})">Купить</button>
        </div>
      `).join('')
      : '<p>Магазин пуст.</p>';

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
    showSection('profile');
  } catch {
    document.getElementById('loading').textContent = '❌ Ошибка загрузки кабинета';
  }
}

// ================= СЛОТЫ =================
async function loadSlots() {
  try {
    const [availableRes, userRes] = await Promise.all([
      fetch(`${API_URL}?action=get_slots`),
      fetch(`${API_URL}?action=get_user_slots&userId=${encodeURIComponent(userId)}`)
    ]);

    const availableData = await availableRes.json();
    const userData = await userRes.json();

    const availableBox = document.getElementById('available-slots-container');
    const userBox = document.getElementById('user-slots-container');

    // ---- доступные ----
    if (!availableData.success || !availableData.slots.length) {
      availableBox.innerHTML = '<p>Нет доступных слотов.</p>';
    } else {
      availableBox.innerHTML = availableData.slots.map(s => `
        <div class="slot-card">
          <div>📅 ${s.date}</div>
          <div>⏰ ${s.time}</div>
          <button onclick="bookSlot('${s.id}', this)">Забронировать</button>
        </div>
      `).join('');
    }

    // ---- мои ----
    if (!userData.success || !userData.slots.length) {
      userBox.innerHTML = '<p>У вас нет бронирований.</p>';
    } else {
      userBox.innerHTML = userData.slots.map(s => `
        <div class="slot-card">
          <div>📅 ${s.date}</div>
          <div>⏰ ${s.time}</div>
          <div>📞 ${s.contact || '—'}</div>
          <div>📝 ${s.bookingDate || '—'}</div>
          <button onclick="cancelSlot('${s.id}')">Отменить</button>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error(e);
  }
}

async function bookSlot(slotId, btn) {
  btn.disabled = true;
  const contact = prompt('Введите номер телефона:');
  if (!contact) {
    btn.disabled = false;
    return;
  }

  const res = await fetch(
    `${API_URL}?action=book_slot&userId=${encodeURIComponent(userId)}&slotId=${encodeURIComponent(slotId)}&username=${encodeURIComponent(username)}&contact=${encodeURIComponent(contact)}`
  );
  const data = await res.json();
  alert(data.success ? '✅ Забронировано' : '❌ ' + data.message);
  loadSlots();
}

async function cancelSlot(slotId) {
  if (!confirm('Отменить бронь?')) return;
  const res = await fetch(
    `${API_URL}?action=cancel_slot&userId=${encodeURIComponent(userId)}&slotId=${encodeURIComponent(slotId)}`
  );
  const data = await res.json();
  alert(data.success ? '✅ Отменено' : '❌ ' + data.message);
  loadSlots();
}

// ================= HOMEWORK =================
async function submitHomework() {
  const text = document.getElementById('hwText').value.trim();
  const file = document.getElementById('hwImage').files[0];

  if (!file && !text) {
    alert("Введите текст или прикрепите фото");
    return;
  }

  if (file) {
    const base64 = await new Promise(r => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result.split(",")[1]);
      fr.readAsDataURL(file);
    });

    const payload = {
      action: "submit_homework",
      userId, username,
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
      data.success ? "✅ ДЗ отправлено" : "❌ Ошибка";
  }
}

// ================= SHOP =================
async function buyItem(index) {
  const res = await fetch(`${API_URL}?action=buy_item&userId=${userId}&lessonNum=${index}`);
  const data = await res.json();
  alert(data.success ? "✅ Куплено" : "❌ Ошибка");
  if (data.success) location.reload();
}

// ================= INIT =================
window.addEventListener("DOMContentLoaded", loadData);
