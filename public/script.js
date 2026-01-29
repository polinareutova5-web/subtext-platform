const API_URL = "https://script.google.com/macros/s/AKfycbwkkeJGpyYNL7mZ57jrEwRbqOXuCc_COhp3NWvW6BhngcHFy5GxRYuR1R47CX1w01UJIQ/exec";

let userId;
let username = "";

// ================= UI =================
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById(sectionId);
  if (el) el.classList.remove('hidden');
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

// ================= CABINET =================
async function loadCabinet() {
  try {
    const res = await fetch(`${API_URL}?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const u = data.user;
    username = u.username || "";

    document.getElementById('username').textContent = u.username || '—';
    document.getElementById('level').textContent = u.level || '—';
    document.getElementById('progress').textContent = u.progress || 0;
    document.getElementById('coins').textContent = u.coins || 0;
    document.getElementById('lesson-link').textContent = u.link || "Не указана";
    document.getElementById('lesson-schedule').textContent = u.schedule || "Не указано";

    const avatarImg = document.getElementById('avatar-img');
    avatarImg.src = u.avatarUrl || "https://via.placeholder.com/120/2e7d32/FFFFFF?text=👤";

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

    const shopItems = document.getElementById('shop-items');
    document.getElementById('shop-coins').textContent = u.coins;
    shopItems.innerHTML = data.shop.length
      ? data.shop.map((item, idx) => `
        <div class="shop-item">
          ${item.image ? `<div style="height:120px;display:flex;align-items:center;justify-content:center;margin-bottom:.5rem"><img src="${item.image}" style="max-width:100%;max-height:100%;object-fit:contain"></div>` : ''}
          <h3>${item.name}</h3>
          <div class="price">${item.price} монет</div>
          <button class="buy-btn" onclick="confirmBuy(${idx}, \`${item.name}\`, ${item.price})">Купить</button>
        </div>
      `).join('')
      : '<p>Магазин пуст.</p>';

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
    showSection('profile');

    await loadSlots();

  } catch (e) {
    console.error(e);
    document.getElementById('loading').textContent = '❌ Ошибка загрузки кабинета';
  }
}

// ================= SLOTS =================
async function loadSlots() {
  try {
    const res = await fetch(`${API_URL}?action=get_slots&userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    if (!data.success) throw new Error();

    const box = document.getElementById("slots");
    box.innerHTML = `<h3 style="grid-column:1/-1;text-align:center;margin-bottom:.5rem">СЛОТЫ</h3>`;

    const hasMySlot = !!data.mySlot;

    data.slots.forEach(s => {
      const btn = document.createElement("button");
      btn.className = "slot-btn";
      btn.style.padding = "8px";
      btn.style.fontSize = "0.9rem";
      btn.textContent = `${s.date} · ${s.time}`;

      if (hasMySlot) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
      } else {
        btn.onclick = () => {
          if (confirm(`Записаться на ${s.date} · ${s.time}?`)) {
            bookSlot(s.id);
          }
        };
      }

      box.appendChild(btn);
    });

    const mySlotDiv = document.getElementById("mySlot");
    if (data.mySlot) {
      mySlotDiv.innerHTML = `
        <p style="color:#b71c1c">
          ❤️ Ваш слот: <strong>${data.mySlot.date} · ${data.mySlot.time}</strong><br>
          <button onclick="cancelSlot('${data.mySlot.id}')" style="margin-top:.5rem">Отменить</button>
        </p>`;
    } else {
      mySlotDiv.innerHTML = "<p>Вы ещё не записаны на слот</p>";
    }

  } catch (e) {
    console.error(e);
    alert("Ошибка соединения с сервером при загрузке слотов");
  }
}

async function bookSlot(slotId) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "book_slot", slotId, userId, username })
    });

    const data = await res.json();
    alert(data.success ? "✅ Вы записались на слот!" : "❌ " + data.error);
    loadSlots();

  } catch (e) {
    console.error(e);
    alert("❌ Ошибка соединения при записи");
  }
}

async function cancelSlot(slotId) {
  if (!confirm("Отменить слот?")) return;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel_slot", slotId, userId })
    });

    const data = await res.json();
    alert(data.success ? "✅ Слот отменён" : "❌ " + data.error);
    loadSlots();

  } catch (e) {
    console.error(e);
    alert("❌ Ошибка соединения при отмене");
  }
}

// ================= HOMEWORK =================
async function submitHomework() {
  /* без изменений */
}

// ================= SHOP =================
async function buyItem(index) {
  try {
    const res = await fetch(`${API_URL}?action=buy_item&userId=${userId}&lessonNum=${index}`);
    const data = await res.json();
    if (data.success) { alert("✅ Куплено!"); location.reload(); }
    else alert("❌ " + data.error);
  } catch { alert("❌ Ошибка соединения"); }
}

// ================= INIT =================
window.addEventListener("load", loadData);
