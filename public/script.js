const API_URL = "https://script.google.com/macros/s/AKfycbyfkS_uIvJ6BNJ1k6xrOXvfSMYbIP4vz7TAxTkMRvIVUjZw3myR5ZVDHOZY7pPDwRjtDg/exec";

let userId;
let username = "";

// ================= UI =================

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
  document.getElementById(sectionId).classList.remove('hidden');
}

function confirmBuy(index, name, price) {
  if (confirm(`Хотите купить?\n\n${name}\nЦена: ${price} монет`)) {
    buyItem(index);
  }
}

// ================= LOAD DATA =================
async function loadData() {
  const urlParams = new URLSearchParams(window.location.search);
  userId = urlParams.get('id');

  // 👉 ЕСЛИ ID НЕТ — ПОКАЗЫВАЕМ СТАРТ
  if (!userId) {
    document.getElementById('loading').classList.add('hidden');
    showSection('start'); // стартовая секция
    return;
  }

  // 👉 ЕСЛИ ID ЕСТЬ — ПРОВЕРЯЕМ, ЗАРЕГАН ЛИ
  try {
    const checkRes = await fetch(
      `${API_URL}?action=check_user&userId=${encodeURIComponent(userId)}`
    );
    const checkData = await checkRes.json();

    if (!checkData.success) {
      document.getElementById('loading').textContent =
        '❌ Вы не зарегистрированы';
      return;
    }

    // 👉 ЕСЛИ ВСЁ ОК — ГРУЗИМ ЛК
    await loadCabinet();

  } catch (e) {
    console.error(e);
    document.getElementById('loading').textContent =
      '❌ Ошибка соединения';
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

    const avatarImg = document.getElementById('avatar-img');
    avatarImg.src = u.avatarUrl || "https://via.placeholder.com/120/2e7d32/FFFFFF?text=👤";

    // уроки
    const lessonsList = document.getElementById('lessons-list');
    lessonsList.innerHTML = data.lessons.length
      ? data.lessons.map(l => `
        <div class="lesson-card">
          <strong>Урок ${l.num}</strong><br>
          <a href="${l.link}" target="_blank">Материалы</a>
          ${l.hwLink ? `<br><a href="${l.hwLink}" target="_blank">ДЗ</a>` : ''}
        </div>
      `).join('')
      : '<p>Нет доступных уроков.</p>';

    // магазин
    const shopItems = document.getElementById('shop-items');
    document.getElementById('shop-coins').textContent = u.coins;

    shopItems.innerHTML = data.shop.map((item, idx) => `
      <div class="shop-item">
        ${item.image ? `<img src="${item.image}">` : ''}
        <h3>${item.name}</h3>
        <div class="price">${item.price} монет</div>
        <button onclick="confirmBuy(${idx}, '${item.name}', ${item.price})">
          Купить
        </button>
      </div>
    `).join('');

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
    showSection('profile');

  } catch (e) {
    console.error(e);
    document.getElementById('loading').textContent =
      '❌ Ошибка загрузки кабинета';
  }
}

// ================= HOMEWORK =================

async function submitHomework() {
  const text = document.getElementById('hwText').value.trim();
  const fileInput = document.getElementById('hwImage');
  const file = fileInput.files[0];

  // === Только текст ===
  if (!file) {
    if (!text) {
      alert("Введите текст или прикрепите фото");
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}?action=submit_homework&userId=${encodeURIComponent(userId)}&homeworkText=${encodeURIComponent(text)}&lessonNum=0`
      );

      if (!res.ok) throw new Error();

      const data = await res.json();
      document.getElementById('hwStatus').textContent =
        data.success ? "✅ ДЗ отправлено!" : "❌ " + data.error;

      if (data.success) document.getElementById('hwText').value = "";

    } catch {
      document.getElementById('hwStatus').textContent = "❌ Ошибка отправки";
    }
    return;
  }

  // === Фото ===
  if (!file.type.match(/image\/(jpeg|png|gif)/)) {
    alert("Поддерживаются JPG, PNG, GIF");
    return;
  }

  const base64 = await new Promise(resolve => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]); // ⚠️ ВАЖНО
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

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error();

    const data = await res.json();
    document.getElementById('hwStatus').textContent =
      data.success ? "✅ ДЗ отправлено!" : "❌ " + data.error;

    if (data.success) {
      document.getElementById('hwText').value = "";
      fileInput.value = "";
    }

  } catch {
    document.getElementById('hwStatus').textContent = "❌ Ошибка отправки";
  }
}

// ================= SHOP =================

async function buyItem(index) {
  try {
    const res = await fetch(`${API_URL}?action=buy_item&userId=${userId}&lessonNum=${index}`);
    if (!res.ok) throw new Error();

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

loadData();
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (id) {
    // сразу идем в ЛК
    document.getElementById("start").classList.add("hidden");
    document.getElementById("loading").classList.remove("hidden");
    loadData();
  } else {
    // показываем стартовую
    document.getElementById("start").classList.remove("hidden");
    document.getElementById("main").classList.add("hidden");
  }
});
function enterById() {
  const id = document.getElementById("idInput").value.trim();
  if (!id) {
    alert("Введите ID");
    return;
  }

  // редирект сразу в ЛК
  window.location.href = `/?id=${encodeURIComponent(id)}`;
}
