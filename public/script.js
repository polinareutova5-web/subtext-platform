const API_URL = "https://script.google.com/macros/s/AKfycbzf5Nxa5O4J1smRP8kM4edKK-SMEuXR6ECnCqN87ktDMndIZ6-7LDbt9MkGdtVIlPx8iA/exec";

let userId;

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

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

    // Автоматически заполняем ID и имя ученика
    document.getElementById('student-id').value = userId;
    if (u.username && u.username !== '—') {
      document.getElementById('student-name').value = u.username;
    }

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

    // Простой обработчик файлов
    initSimpleFileUpload();

  } catch (err) {
    console.error('Ошибка загрузки:', err);
    document.getElementById('loading').textContent = '❌ Не удалось загрузить данные.';
  }
}

// ==================== ПРОСТАЯ ОТПРАВКА ====================

function initSimpleFileUpload() {
  const fileInput = document.getElementById('homework-file');
  const fileName = document.getElementById('file-name');
  
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      if (this.files.length > 0) {
        const file = this.files[0];
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        fileName.textContent = `📄 ${file.name} (${sizeMB} MB)`;
        fileName.style.color = '#2e7d32';
      }
    });
  }
}

// ОСНОВНАЯ ФУНКЦИЯ ОТПРАВКИ
async function submitHomeworkSimple() {
  const name = document.getElementById('student-name').value.trim();
  const email = document.getElementById('student-email').value.trim();
  const studentId = document.getElementById('student-id').value.trim();
  const fileInput = document.getElementById('homework-file');
  const comment = document.getElementById('homework-comment').value.trim();
  const statusEl = document.getElementById('form-status');
  const submitBtn = document.querySelector('.btn-primary');
  
  // Простая проверка
  if (!name || !email || !fileInput.files.length) {
    showError('Заполните все обязательные поля');
    return;
  }
  
  const file = fileInput.files[0];
  
  // Показываем загрузку
  submitBtn.disabled = true;
  submitBtn.innerHTML = '⏳ Отправка...';
  
  statusEl.innerHTML = `
    <div class="status-message status-loading">
      <p style="margin: 0;">⏳ Отправка домашнего задания...</p>
    </div>
  `;
  
  try {
    // Формируем текст для отправки
    let homeworkText = `👤 Имя: ${name}\n`;
    homeworkText += `📧 Email: ${email}\n`;
    homeworkText += `🔢 ID ученика: ${studentId}\n`;
    if (comment) {
      homeworkText += `💬 Комментарий: ${comment}\n`;
    }
    homeworkText += `📁 Файл: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    
    // Кодируем текст для URL
    const encodedText = encodeURIComponent(homeworkText);
    
    // Отправляем через твой СУЩЕСТВУЮЩИЙ API
    const url = `${API_URL}?action=submit_homework&userId=${userId}&homeworkText=${encodedText}&lessonNum=0`;
    
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success) {
      // УСПЕХ!
      statusEl.innerHTML = `
        <div class="status-message status-success">
          <p style="margin: 0;">✅ Домашнее задание успешно отправлено!</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
            Файл: <strong>${file.name}</strong><br>
            Данные сохранены в таблицу
          </p>
        </div>
      `;
      
      // Очищаем форму через 3 секунды
      setTimeout(() => {
        document.getElementById('custom-homework-form').reset();
        document.getElementById('file-name').textContent = '';
        document.getElementById('student-id').value = userId;
        if (document.getElementById('username').textContent !== '—') {
          document.getElementById('student-name').value = document.getElementById('username').textContent;
        }
        statusEl.innerHTML = '';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '📨 Отправить домашнее задание';
      }, 3000);
      
    } else {
      showError(result.error || 'Ошибка при сохранении в таблицу');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '📨 Отправить домашнее задание';
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
    showError('Ошибка соединения с сервером');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '📨 Отправить домашнее задание';
  }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function showError(message) {
  const statusEl = document.getElementById('form-status');
  statusEl.innerHTML = `
    <div class="status-message status-error">
      <p style="margin: 0;">❌ ${message}</p>
    </div>
  `;
}

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

// ==================== ЗАПУСК ====================

loadData();
