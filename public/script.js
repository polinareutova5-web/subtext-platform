const API_URL = "https://script.google.com/macros/s/AKfycbwdweR0BFaH4RbhXJS_huYtDqp1MwCuCnfNP92EsSXYk2zPAu83PDcGQO90XdugdU9qWQ/exec";

let userId;
let userData;

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

    userData = data.user;
    
    // Отображаем профиль
    displayProfile(userData);
    
    // Загружаем аватар
    await loadUserAvatar();
    
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
    document.getElementById('shop-coins').textContent = userData.coins;

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

// ==================== ПРОФИЛЬ И АВАТАРЫ ====================

function displayProfile(user) {
  document.getElementById('username').textContent = user.username || '—';
  document.getElementById('level').textContent = user.level || '—';
  document.getElementById('progress').textContent = user.progress || 0;
  document.getElementById('coins').textContent = user.coins || 0;
  
  // Автозаполнение формы ДЗ
  document.getElementById('student-id').value = userId;
  if (user.username && user.username !== '—') {
    document.getElementById('student-name').value = user.username;
  }
}

async function loadUserAvatar() {
  try {
    const response = await fetch(`${API_URL}?action=get_avatar&userId=${userId}`);
    const data = await response.json();
    
    const avatarContainer = document.getElementById('avatar-container');
    if (!avatarContainer) return;
    
    if (data.success && data.avatarUrl) {
      avatarContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <img src="${data.avatarUrl}" 
               alt="Аватар" 
               id="user-avatar"
               style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; border: 4px solid #2e7d32; cursor: pointer;"
               onclick="openAvatarUpload()">
          <p style="margin-top: 10px; color: #666;">
            <a href="javascript:void(0)" onclick="openAvatarUpload()" style="color: #2e7d32; text-decoration: none;">
              📷 Изменить аватар
            </a>
          </p>
        </div>
      `;
    } else {
      avatarContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="width: 150px; height: 150px; border-radius: 50%; background: #e0f0e9; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 4px solid #a8d8b9; cursor: pointer;"
               onclick="openAvatarUpload()">
            <span style="font-size: 3rem; color: #4CAF50;">👤</span>
          </div>
          <p style="margin-top: 10px; color: #666;">
            <a href="javascript:void(0)" onclick="openAvatarUpload()" style="color: #2e7d32; text-decoration: none;">
              📷 Загрузить аватар
            </a>
          </p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Ошибка загрузки аватара:', error);
  }
}

function openAvatarUpload() {
  const modalHTML = `
    <div id="avatar-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
      <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 400px; width: 90%;">
        <h3 style="margin-top: 0; color: #2c3e50;">Изменить аватар</h3>
        <div style="margin: 1.5rem 0;">
          <input type="file" id="avatar-file-input" accept="image/*" style="display: none;">
          <div onclick="document.getElementById('avatar-file-input').click()" 
               style="border: 2px dashed #4CAF50; padding: 2rem; text-align: center; border-radius: 8px; cursor: pointer; background: #f9f9f9;">
            <div style="font-size: 2.5rem; color: #4CAF50;">📷</div>
            <p style="margin: 10px 0; font-weight: 600; color: #333;">Выберите изображение</p>
            <p style="color: #666; font-size: 0.9rem;">JPG, PNG, GIF до 5 MB</p>
          </div>
          <div id="avatar-preview" style="margin-top: 1rem; display: none;">
            <img id="avatar-preview-img" style="max-width: 150px; max-height: 150px; border-radius: 8px; margin: 0 auto; display: block;">
          </div>
          <p id="avatar-file-info" style="margin-top: 10px; color: #666; font-size: 0.9rem;"></p>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button onclick="closeAvatarModal()" 
                  style="padding: 0.7rem 1.5rem; background: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-weight: 600;">
            Отмена
          </button>
          <button onclick="uploadAvatar()" 
                  style="padding: 0.7rem 1.5rem; background: #2e7d32; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            Загрузить
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Обработчик выбора файла
  document.getElementById('avatar-file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой. Максимум 5 MB');
        return;
      }
      
      // Показываем информацию о файле
      document.getElementById('avatar-file-info').textContent = 
        `Выбрано: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
      document.getElementById('avatar-file-info').style.color = '#2e7d32';
      
      // Показываем превью
      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('avatar-preview').style.display = 'block';
        document.getElementById('avatar-preview-img').src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
}

function closeAvatarModal() {
  const modal = document.getElementById('avatar-modal');
  if (modal) modal.remove();
}

async function uploadAvatar() {
  const fileInput = document.getElementById('avatar-file-input');
  if (!fileInput.files.length) {
    alert('Выберите изображение');
    return;
  }
  
  const file = fileInput.files[0];
  const uploadBtn = document.querySelector('#avatar-modal button:last-child');
  const originalText = uploadBtn.textContent;
  
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '⏳ Загрузка...';
  
  try {
    // Конвертируем файл в Base64
    const base64 = await fileToBase64(file);
    
    // Отправляем на сервер
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'upload_avatar',
        userId: userId,
        fileName: file.name,
        fileBase64: base64
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Обновляем аватар на странице
      const avatarImg = document.getElementById('user-avatar');
      if (avatarImg) {
        avatarImg.src = result.fileUrl + '?t=' + Date.now();
      } else {
        // Если аватар не был загружен ранее
        await loadUserAvatar();
      }
      
      alert('✅ Аватар успешно обновлен!');
      closeAvatarModal();
      
    } else {
      alert('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
      uploadBtn.disabled = false;
      uploadBtn.textContent = originalText;
    }
    
  } catch (error) {
    console.error('Ошибка загрузки аватара:', error);
    alert('❌ Ошибка соединения с сервером');
    uploadBtn.disabled = false;
    uploadBtn.textContent = originalText;
  }
}

// ==================== ОТПРАВКА ФОТО ДЗ ====================

function initFileUpload() {
  const fileInput = document.getElementById('homework-file');
  const fileName = document.getElementById('file-name');
  
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      if (this.files.length > 0) {
        const file = this.files[0];
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        fileName.textContent = `📸 ${file.name} (${sizeMB} MB)`;
        fileName.style.color = '#2e7d32';
        fileName.style.fontWeight = '600';
      }
    });
  }
}

async function submitHomeworkWithPhoto() {
  const name = document.getElementById('student-name').value.trim();
  const email = document.getElementById('student-email').value.trim();
  const studentId = document.getElementById('student-id').value.trim();
  const fileInput = document.getElementById('homework-file');
  const comment = document.getElementById('homework-comment').value.trim();
  const statusEl = document.getElementById('form-status');
  const submitBtn = document.querySelector('.btn-primary');
  
  // Проверка
  if (!name || !email || !fileInput.files.length) {
    showError('Заполните все обязательные поля');
    return;
  }
  
  const file = fileInput.files[0];
  
  // Проверяем что это изображение
  if (!file.type.startsWith('image/')) {
    showError('Пожалуйста, выберите изображение (JPG, PNG, GIF)');
    return;
  }
  
  // Лимит размера (10 MB)
  if (file.size > 10 * 1024 * 1024) {
    showError('Изображение слишком большое. Максимум 10 MB');
    return;
  }
  
  // Блокируем кнопку
  submitBtn.disabled = true;
  submitBtn.innerHTML = '🔄 Конвертация...';
  
  statusEl.innerHTML = `
    <div class="status-message status-loading">
      <p style="margin: 0;">⏳ Конвертируем фото в Google Drive...</p>
      <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
        ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)
      </p>
    </div>
  `;
  
  try {
    // 1. Конвертируем файл в Base64
    const base64 = await fileToBase64(file);
    
    // 2. Отправляем на сервер
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: studentId,
        userName: name,
        userEmail: email,
        fileName: file.name,
        fileBase64: base64,
        comment: comment
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // УСПЕХ!
      statusEl.innerHTML = `
        <div class="status-message status-success">
          <p style="margin: 0;">✅ Фото сохранено в Google Drive!</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
            📁 <strong>${result.fileName}</strong><br>
            🔗 <a href="${result.fileUrl}" target="_blank" style="color: #2e7d32; text-decoration: underline;">
              Открыть в Google Drive
            </a><br>
            📊 Файл добавлен в таблицу "ДЗ"
          </p>
        </div>
      `;
      
      // Очищаем форму через 5 секунд
      setTimeout(() => {
        resetHomeworkForm();
        submitBtn.disabled = false;
        submitBtn.innerHTML = '📸 Отправить фото';
      }, 5000);
      
    } else {
      throw new Error(result.error || 'Неизвестная ошибка');
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
    showError('Ошибка: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '📸 Отправить фото';
  }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

function resetHomeworkForm() {
  document.getElementById('custom-homework-form').reset();
  document.getElementById('file-name').textContent = '';
  document.getElementById('student-id').value = userId;
  if (document.getElementById('username').textContent !== '—') {
    document.getElementById('student-name').value = document.getElementById('username').textContent;
  }
  document.getElementById('form-status').innerHTML = '';
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

// ==================== ЗАПУСК ====================

loadData();
