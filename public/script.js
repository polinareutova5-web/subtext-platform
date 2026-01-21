// ВСТАВЬ СЮДА URL ТВОЕГО WEB APP ИЗ GOOGLE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbwU0SmmQhpjc-C0-YeLWkyAFZu1qqDZOy1drxjUlz4T1UsSnM_thCXjIJGqYD52B9GrVQ/exec";

let userId;

async function loadData() {
  const urlParams = new URLSearchParams(window.location.search);
  userId = urlParams.get('id');
  if (!userId) {
    document.getElementById('loading').textContent = '❌ Не указан ID ученика';
    return;
  }

  try {
    const res = await fetch(`${API_URL}?userId=${userId}`);
    const data = await res.json();

    if (!data.success) {
      document.getElementById('loading').textContent = `❌ Ошибка: ${data.error}`;
      return;
    }

    const u = data.user;
    document.getElementById('username').textContent = u.username;
    document.getElementById('level').textContent = u.level;
    document.getElementById('progress').textContent = u.progress;
    document.getElementById('coins').textContent = u.coins;

    // Уроки
    const lessonsDiv = document.getElementById('lessons');
    lessonsDiv.innerHTML = data.lessons.map(l => 
      `<p><strong>Урок ${l.num}</strong><br>
       <a href="${l.link}" target="_blank">Материалы</a>
       ${l.hwLink ? ` | <a href="${l.hwLink}" target="_blank">ДЗ</a>` : ''}</p>`
    ).join('');

    // Магазин
    const shopDiv = document.getElementById('shop');
    shopDiv.innerHTML = data.shop.map((item, idx) =>
      `<button onclick="buyItem(${idx})">${item.name} (${item.price} монет)</button>`
    ).join('');

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');

  } catch (err) {
    document.getElementById('loading').textContent = '❌ Ошибка загрузки';
  }
}

async function submitHomework() {
  const text = document.getElementById('hwText').value.trim();
  if (!text) return alert('Введите текст ДЗ');

  document.getElementById('hwStatus').textContent = 'Отправка...';
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit_homework',
        userId: userId,
        homeworkText: text
      })
    });
    const data = await res.json();
    document.getElementById('hwStatus').textContent = data.success ? 
      '✅ ДЗ отправлено!' : `❌ Ошибка: ${data.error}`;
    if (data.success) document.getElementById('hwText').value = '';
  } catch (err) {
    document.getElementById('hwStatus').textContent = '❌ Не удалось отправить';
  }
}

async function buyItem(index) {
  if (!confirm('Подтвердите покупку')) return;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'buy_item',
        userId: userId,
        lessonNum: index
      })
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ Куплено!');
      location.reload(); // обновить баланс
    } else {
      alert(`❌ ${data.error}`);
    }
  } catch (err) {
    alert('❌ Ошибка покупки');
  }
}

loadData();
