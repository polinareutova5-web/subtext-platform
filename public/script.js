// ВСТАВЬ СЮДА URL ТВОЕГО WEB APP ИЗ GOOGLE APPS SCRIPT (без пробелов!)
const API_URL = "https://script.google.com/macros/s/AKfycbyz5iHfF9eBSH-uKIMob6L8Hu49jPAMFaxccVq1oK7YWoqYWnTAV5yXuaY_16-74b1atw/exec";

let userId;

// Переключение между разделами
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(el => {
    el.classList.add('hidden');
  });
  document.getElementById(sectionId).classList.remove('hidden');
}

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
    // Заполняем профиль
    document.getElementById('username').textContent = u.username || '—';
    document.getElementById('level').textContent = u.level || '—';
    document.getElementById('progress').textContent = u.progress || 0;
    document.getElementById('coins').textContent = u.coins || 0;

    // Уроки → в контейнер lessons-list
    const lessonsList = document.getElementById('lessons-list');
    if (data.lessons.length > 0) {
      lessonsList.innerHTML = data.lessons.map(l => 
        `<p><strong>Урок ${l.num}</strong><br>
         <a href="${l.link}" target="_blank">Материалы</a>
         ${l.hwLink ? ` | <a href="${l.hwLink}" target="_blank">ДЗ</a>` : ''}</p>`
      ).join('');
    } else {
      lessonsList.innerHTML = '<p>Нет доступных уроков. Обратитесь к преподавателю.</p>';
    }

    // Магазин → в контейнер shop-items
    const shopItems = document.getElementById('shop-items');
    if (data.shop.length > 0) {
      shopItems.innerHTML = data.shop.map((item, idx) =>
        `<button onclick="buyItem(${idx})" style="display:block; margin:0.5rem 0;">🛒 ${item.name} (${item.price} монет)</button>`
      ).join('');
    } else {
      shopItems.innerHTML = '<p>Магазин временно пуст.</p>';
    }

    // Показываем интерфейс
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
    showSection('profile'); // по умолчанию — профиль

  } catch (err) {
    console.error('Ошибка загрузки:', err);
    document.getElementById('loading').textContent = '❌ Не удалось загрузить данные. Проверьте интернет.';
  }
}

async function submitHomework() {
  const text = document.getElementById('hwText').value.trim();
  if (!text) {
    alert('Пожалуйста, напишите ответ или вставьте ссылку на файл (Google Drive и др.)');
    return;
  }

  document.getElementById('hwStatus').textContent = 'Отправка...';
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit_homework',
        userId: userId,
        homeworkText: text,
        lessonNum: 0 // можно будет уточнить позже
      })
    });
    const data = await res.json();
    
    if (data.success) {
      document.getElementById('hwStatus').textContent = '✅ ДЗ отправлено!';
      document.getElementById('hwText').value = '';
      document.getElementById('hwFile').value = ''; // очистить файл (если добавим позже)
    } else {
      document.getElementById('hwStatus').textContent = `❌ Ошибка: ${data.error}`;
    }
  } catch (err) {
    console.error('Ошибка отправки:', err);
    document.getElementById('hwStatus').textContent = '❌ Не удалось отправить. Попробуйте позже.';
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
      location.reload(); // обновляем страницу, чтобы обновить баланс
    } else {
      alert(`❌ ${data.error || 'Не удалось совершить покупку'}`);
    }
  } catch (err) {
    console.error('Ошибка покупки:', err);
    alert('❌ Ошибка соединения. Попробуйте позже.');
  }
}

// Запуск загрузки при открытии страницы
loadData();
