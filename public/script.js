const API_URL = "https://script.google.com/macros/s/AKfycbzf5Nxa5O4J1smRP8kM4edKK-SMEuXR6ECnCqN87ktDMndIZ6-7LDbt9MkGdtVIlPx8iA/exec";

const GOOGLE_FORM_ID = "1FAIpQLSeOt_4wMFLUbl3RfYE-vgcTPAHDvXMopJOiDovicFJ0lQ621Q"; // ⬅️ ЗАМЕНИ ЭТО НА СВОЙ ID ФОРМЫ

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

    // Автоматически заполняем ID ученика в форме
    document.getElementById('student-id').value = userId;
    
    // Пытаемся заполнить имя из профиля
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

    // Инициализируем Drag & Drop для файлов
    initFileUpload();

  } catch (err) {
    console.error('Ошибка загрузки:', err);
    document.getElementById('loading').textContent = '❌ Не удалось загрузить данные.';
  }
}

// ====================== ФУНКЦИИ ДЛЯ GOOGLE ФОРМЫ ======================

function initFileUpload() {
  const fileInput = document.getElementById('homework-file');
  const fileName = document.getElementById('file-name');
  const dropArea = document.querySelector('.file-upload-area');
  
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      if (this.files.length > 0) {
        const file = this.files[0];
        updateFileInfo(file);
      }
    });
    
    // Drag & Drop функционал
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

function submitHomeworkViaForm() {
  const name = document.getElementById('student-name').value.trim();
  const email = document.getElementById('student-email').value.trim();
  const studentId = document.getElementById('student-id').value.trim();
  const fileInput = document.getElementById('homework-file');
  const comment = document.getElementById('homework-comment').value.trim();
  const statusEl = document.getElementById('form-status');
  
  // Валидация
  if (!name) {
    showError('Пожалуйста, введите ваше имя');
    return;
  }
  
  if (!email || !isValidEmail(email)) {
    showError('Пожалуйста, введите корректный email');
    return;
  }
  
  if (!studentId) {
    showError('ID ученика не найден. Пожалуйста, обновите страницу.');
    return;
  }
  
  if (!fileInput.files.length) {
    showError('Пожалуйста, выберите файл с домашним заданием');
    return;
  }
  
  const file = fileInput.files[0];
  if (file.size > 50 * 1024 * 1024) { // 50 MB лимит
    showError('Файл слишком большой. Максимальный размер - 50 MB');
    return;
  }
  
  // Показываем статус загрузки
  statusEl.innerHTML = `
    <div class="status-message status-loading">
      <p style="margin: 0;">⏳ Подготовка формы для отправки...</p>
    </div>
  `;
  
  // Подготавливаем Google Форму URL
  // Формат: https://docs.google.com/forms/d/e/{FORM_ID}/viewform?usp=pp_url&entry.XXXXX=value&entry.YYYYY=value
  
  // Создаем URL с параметрами
  const formUrl = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/viewform?usp=pp_url`;
  
  // В реальном Google Forms нужно знать ID полей, но для простоты
  // откроем форму в новом окне с инструкцией
  
  // Открываем форму в новом окне
  const newWindow = window.open(formUrl, '_blank');
  
  if (newWindow) {
    // Показываем успех
    statusEl.innerHTML = `
      <div class="status-message status-success">
        <p style="margin: 0;">✅ Форма открывается в новом окне!</p>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
          Пожалуйста, заполните открывшуюся Google Форму:
        </p>
        <ul style="margin: 0.5rem 0 0 1.5rem; font-size: 0.9rem;">
          <li>👤 Имя ученика: <strong>${name}</strong></li>
          <li>📧 Email: <strong>${email}</strong></li>
          <li>🔢 ID ученика: <strong>${studentId}</strong></li>
          <li>📁 Файл: <strong>${file.name}</strong></li>
          ${comment ? `<li>💬 Комментарий: ${comment}</li>` : ''}
        </ul>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; font-weight: 600;">
          Скопируйте эти данные в соответствующие поля формы
        </p>
      </div>
    `;
    
    // Очищаем форму через 10 секунд
    setTimeout(() => {
      document.getElementById('custom-homework-form').reset();
      document.getElementById('file-name').textContent = '';
      document.getElementById('student-id').value = userId;
      if (document.getElementById('username').textContent !== '—') {
        document.getElementById('student-name').value = document.getElementById('username').textContent;
      }
      statusEl.innerHTML = '';
    }, 10000);
    
  } else {
    showError('Не удалось открыть форму. Пожалуйста, разрешите всплывающие окна.');
  }
}

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

// ====================== ПОКУПКА ======================

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

// ====================== ЗАГРУЗКА ======================

loadData();
