const API_URL = "https://script.google.com/macros/s/AKfycbzf5Nxa5O4J1smRP8kM4edKK-SMEuXR6ECnCqN87ktDMndIZ6-7LDbt9MkGdtVIlPx8iA/exec";

const GOOGLE_FORM_ID = "1FAIpQLSeOt_4wMFLUbl3RfYE-vgcTPAHDvXMopJOiDovicFJ0lQ621Q"; // ⬅️ ЗАМЕНИ ЭТО НА СВОЙ ID ФОРМЫ

// ⚠️ ВАЖНО: Нужно найти ID полей твоей формы!
// Замени эти значения на реальные ID из твоей Google Forms
const FORM_FIELD_IDS = {
  name: '',     // ID поля "Имя ученика"
  email: 'entry.0987654321',    // ID поля "Email"
  studentId: 'entry.1111111111', // ID поля "ID ученика"
  comment: 'entry.2222222222',  // ID поля "Комментарий"
  file: 'entry.3333333333'      // ID поля "Загрузка файла"
};

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

    // Автоматически заполняем ID и имя ученика в форме
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

    // Инициализируем загрузку файлов
    initFileUpload();

  } catch (err) {
    console.error('Ошибка загрузки:', err);
    document.getElementById('loading').textContent = '❌ Не удалось загрузить данные.';
  }
}

// ==================== ФУНКЦИИ ДЛЯ ФОРМЫ ====================

function initFileUpload() {
  const fileInput = document.getElementById('homework-file');
  const fileName = document.getElementById('file-name');
  const dropArea = document.querySelector('.file-upload-area');
  
  if (fileInput && dropArea) {
    fileInput.addEventListener('change', function(e) {
      if (this.files.length > 0) {
        updateFileInfo(this.files[0]);
      }
    });
    
    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => {
        dropArea.style.backgroundColor = '#e8f5e9';
      }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => {
        dropArea.style.backgroundColor = '#f9f9f9';
      }, false);
    });
    
    dropArea.addEventListener('drop', function(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      
      if (files.length > 0) {
        fileInput.files = files;
        updateFileInfo(files[0]);
        fileInput.dispatchEvent(new Event('change'));
      }
    }, false);
  }
  
  function updateFileInfo(file) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    fileName.textContent = `📄 ${file.name} (${sizeInMB} MB)`;
    fileName.style.color = '#2e7d32';
    fileName.style.fontWeight = '600';
  }
}

// ОСНОВНАЯ ФУНКЦИЯ ОТПРАВКИ
async function submitHomeworkViaForm() {
  const name = document.getElementById('student-name').value.trim();
  const email = document.getElementById('student-email').value.trim();
  const studentId = document.getElementById('student-id').value.trim();
  const fileInput = document.getElementById('homework-file');
  const comment = document.getElementById('homework-comment').value.trim();
  const statusEl = document.getElementById('form-status');
  const submitBtn = document.querySelector('.btn-primary');
  
  // Валидация
  if (!name) return showError('Пожалуйста, введите ваше имя');
  if (!email || !isValidEmail(email)) return showError('Пожалуйста, введите корректный email');
  if (!studentId) return showError('ID ученика не найден');
  if (!fileInput.files.length) return showError('Пожалуйста, выберите файл с ДЗ');
  
  const file = fileInput.files[0];
  if (file.size > 50 * 1024 * 1024) return showError('Файл слишком большой. Максимальный размер - 50 MB');
  
  // Блокируем кнопку и показываем загрузку
  submitBtn.disabled = true;
  submitBtn.innerHTML = '⏳ Отправляется...';
  
  statusEl.innerHTML = `
    <div class="status-message status-loading">
      <p style="margin: 0;">⏳ Отправка домашнего задания...</p>
      <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Не закрывайте страницу</p>
    </div>
  `;
  
  try {
    // Отправляем данные напрямую в Google Forms
    const formData = new FormData();
    
    // Добавляем текстовые поля
    formData.append(FORM_FIELD_IDS.name, name);
    formData.append(FORM_FIELD_IDS.email, email);
    formData.append(FORM_FIELD_IDS.studentId, studentId);
    if (comment) {
      formData.append(FORM_FIELD_IDS.comment, comment);
    }
    
    // Добавляем файл
    formData.append(FORM_FIELD_IDS.file, file);
    
    // URL для отправки в Google Forms
    const submitUrl = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/formResponse`;
    
    // Отправляем POST запрос
    const response = await fetch(submitUrl, {
      method: 'POST',
      body: formData,
      mode: 'no-cors' // Важно для Google Forms
    });
    
    // Так как mode: 'no-cors', мы не можем проверить ответ
    // Но если код выполнился без ошибок - значит отправка прошла
    
    // Успешная отправка
    statusEl.innerHTML = `
      <div class="status-message status-success">
        <p style="margin: 0;">✅ Домашнее задание успешно отправлено!</p>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
          Файл: <strong>${file.name}</strong><br>
          Время: <strong>${new Date().toLocaleTimeString()}</strong>
        </p>
      </div>
    `;
    
    // Очищаем форму
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
    }, 5000);
    
  } catch (error) {
    console.error('Ошибка отправки:', error);
    showError('Ошибка при отправке. Попробуйте еще раз.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '📨 Отправить домашнее задание';
  }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

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

// ==================== ЗАГРУЗКА ПРИЛОЖЕНИЯ ====================

loadData();
// ====================== ЗАГРУЗКА ======================

loadData();
