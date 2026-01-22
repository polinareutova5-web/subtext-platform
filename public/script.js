const API_URL = "https://script.google.com/macros/s/AKfycbzf5Nxa5O4J1smRP8kM4edKK-SMEuXR6ECnCqN87ktDMndIZ6-7LDbt9MkGdtVIlPx8iA/exec";

let userId;

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(el => {
    el.classList.add('hidden');
  });
  document.getElementById(sectionId).classList.remove('hidden');
}

function confirmBuy(index, name, price) {
  const confirmed = confirm(`Хотите купить?\n\n${name}\nЦена: ${price} монет`);
  if (confirmed) {
    buyItem(index);
  }
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
    document.getElementById('username').textContent = u.username || '—';
    document.getElementById('level').textContent = u.level || '—';
    document.getElementById('progress').textContent = u.progress || 0;
    document.getElementById('coins').textContent = u.coins || 0;

    // Уроки
    const lessonsList = document.getElementById('lessons-list');
    if (data.lessons.length > 0) {
      lessonsList.innerHTML = data.lessons.map(l => 
        `<div class="lesson-card">
           <strong>Урок ${l.num}</strong><br>
           <a href="${l.link}" target="_blank">Материалы</a>
           ${l.hwLink ? `<br><a href="${l.hwLink}" target="_blank">ДЗ</a>` : ''}
         </div>`
      ).join('');
    } else {
      lessonsList.innerHTML = '<p>Нет доступных уроков.</p>';
    }

    // Магазин
    const shopItems = document.getElementById('shop-items');
    document.getElementById('shop-coins').textContent = u.coins;

    if (data.shop.length > 0) {
      shopItems.innerHTML = data.shop.map((item, idx) => {
        return `
        <div class="shop-item">
          ${item.image ? `
            <div style="height: 150px; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; overflow: hidden; border-radius: 8px;">
              <img src="${item.image}" 
                   alt="${item.name}" 
                   style="max-width: 100%; max-height: 100%; object-fit: contain;"
                   onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div style=\'color:#666;font-size:0.9rem\'>Нет изображения</div>'">
            </div>
          ` : ''}
          <h3>${item.name}</h3>
          <div class="price">${item.price} монет</div>
          <button class="buy-btn" onclick="confirmBuy(${idx}, \`${item.name.replace(/'/g, "\\'")}\`, ${item.price})">Купить</button>
        </div>`;
      }).join('');
    } else {
      shopItems.innerHTML = '<p>Магазин пуст.</p>';
    }

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
    showSection('profile');

  } catch (err) {
    console.error('Ошибка загрузки:', err);
    document.getElementById('loading').textContent = '❌ Не удалось загрузить данные.';
  }
}

// === ОТПРАВКА ДЗ ЧЕРЕЗ GET ===
async function submitHomework() {
  const text = document.getElementById('hwText').value.trim();
  if (!text) {
    alert('Введите текст или ссылку на файл.');
    return;
  }

  const encodedText = encodeURIComponent(text);
  const url = `${API_URL}?action=submit_homework&userId=${userId}&homeworkText=${encodedText}&lessonNum=0`;

  document.getElementById('hwStatus').textContent = 'Отправка...';

  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.success) {
      document.getElementById('hwStatus').textContent = '✅ ДЗ отправлено!';
      document.getElementById('hwText').value = '';
    } else {
      document.getElementById('hwStatus').textContent = `❌ Ошибка: ${data.error}`;
    }
  } catch (err) {
    console.error('Ошибка ДЗ:', err);
    document.getElementById('hwStatus').textContent = '❌ Не удалось отправить.';
  }
}

// === ПОКУПКА ЧЕРЕЗ GET ===
async function buyItem(index) {
  const url = `${API_URL}?action=buy_item&userId=${userId}&lessonNum=${index}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.success) {
      alert('✅ Куплено!');
      location.reload();
    } else {
      alert(`❌ ${data.error || 'Не удалось совершить покупку'}`);
    }
  } catch (err) {
    console.error('Ошибка покупки:', err);
    alert('❌ Ошибка соединения.');
  }
}

loadData();
