// Убраны лишние пробелы в URL
const API_URL = "https://script.google.com/macros/s/AKfycbxKqTLrrekUVGjH0BQSsMvn0-KhGAQ8japil7yn7VFKS3wQsK0bs_OSDfRUu5wDSWlEOg/exec";

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

    // Загружаем аватар
    loadAvatar(u.avatarUrl);

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
      shopItems.innerHTML = data.shop.map((item, idx) => `
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
        </div>
      `).join('');
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

// === ЗАГРУЗКА АВАТАРА ===
function loadAvatar(avatarUrl) {
  const avatarImg = document.getElementById('avatar-img');
  if (avatarImg) {
    if (avatarUrl) {
      avatarImg.src = avatarUrl;
      avatarImg.classList.remove('avatar-placeholder');
      avatarImg.alt = "Аватар";
    } else {
      avatarImg.src = "";
      avatarImg.classList.add('avatar-placeholder');
      avatarImg.alt = "Добавить аватар";
    }
  }
}

// === ЗАГРУЗКА АВАТАРА ПРИ ВЫБОРЕ ФАЙЛА ===
async function uploadAvatar(file) {
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    alert('Пожалуйста, выберите изображение.');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    alert('Файл слишком большой. Максимум 5 МБ.');
    return;
  }

  try {
    const base64 = await fileToBase64(file);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "upload_avatar",
        userId: userId,
        fileName: file.name,
        fileBase64: base64
      })
    });

    const result = await response.json();
    
    if (result.success) {
      loadAvatar(result.fileUrl);
      alert('✅ Аватар обновлён!');
    } else {
      alert('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
    }
  } catch (err) {
    console.error('Ошибка загрузки аватара:', err);
    alert('❌ Не удалось загрузить аватар.');
  }
}

// === ОТПРАВКА ДЗ С ФОТО ===
async function submitHomework() {
  const text = document.getElementById('hwText').value.trim();
  const fileInput = document.getElementById('hwFile');
  const file = fileInput.files[0];

  if (file) {
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение.');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('Файл слишком большой. Максимум 10 МБ.');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "submit_homework_photo",
          userId: userId,
          userName: document.getElementById('username').textContent || '—',
          userEmail: '',
          fileName: file.name,
          fileBase64: base64,
          comment: text
        })
      });

      const result = await response.json();
      
      if (result.success) {
        document.getElementById('hwStatus').textContent = '✅ ДЗ с фото отправлено!';
        document.getElementById('hwText').value = '';
        fileInput.value = '';
      } else {
        document.getElementById('hwStatus').textContent = `❌ Ошибка: ${result.error || 'Неизвестная ошибка'}`;
      }
    } catch (err) {
      console.error('Ошибка отправки ДЗ:', err);
      document.getElementById('hwStatus').textContent = '❌ Не удалось отправить ДЗ.';
    }
  } 
  else if (text) {
    const encodedText = encodeURIComponent(text);
    const url = `${API_URL}?action=submit_homework&userId=${userId}&homeworkText=${encodedText}&lessonNum=0`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        document.getElementById('hwStatus').textContent = '✅ Текстовое ДЗ отправлено!';
        document.getElementById('hwText').value = '';
      } else {
        document.getElementById('hwStatus').textContent = `❌ Ошибка: ${data.error}`;
      }
    } catch (err) {
      console.error('Ошибка ДЗ:', err);
      document.getElementById('hwStatus').textContent = '❌ Не удалось отправить.';
    }
  } 
  else {
    alert('Введите текст или прикрепите фото.');
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

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

// Запуск
loadData();
