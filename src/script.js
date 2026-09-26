document.addEventListener('DOMContentLoaded', () => {
    const messages = document.getElementById('messages');
    const form = document.getElementById('chatForm');
    const hint = document.querySelector('.shortcut-hint');
    const currentClass = document.getElementById('currentClass');
    const sidebar = document.getElementById('sidebar');
    const toast = document.getElementById('toast');
    const openSidebar = document.getElementById('openSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const classList = document.getElementById('classList');
    const miniProfile = document.getElementById('miniProfile');
    const profileMenuToggle = document.getElementById('profileMenuToggle');
    const profileMenu = document.getElementById('profileMenu');
    const attachButton = document.querySelector('.attach-button');
    const attachInput = document.getElementById('attachInput');
    const attachPreview = document.getElementById('attachPreview');
    const attachFileName = document.getElementById('attachFileName');
    const removeAttach = document.querySelector('.remove-attach');
    const authAction = document.getElementById('authAction');
    const topAvatar = document.getElementById('topAvatar');
    const profileName = document.getElementById('profileName');
    const profileStatus = document.getElementById('profileStatus');
    const profileLogin = document.getElementById('profileLogin');
    const profileLogout = profileMenu.querySelector('.action-logout');
    const loginHint = document.getElementById('loginHint');
    const composerInput = form.querySelector('.textBox');
    const sendButton = form.querySelector('.send-button');
    let currentUser = null;
    let selectedFile = null;

    const template = document.getElementById('classItemTemplate');
    // Domain Vercel milikmu
    const BACKEND_URL = 'https://backend-beta-black-91.vercel.app';

    const getCurrentUser = async () => {
        try {
            const response = await fetch(BACKEND_URL + '/api/auth/me', { credentials: 'include' });
            if (!response.ok) return null;
            const data = await response.json();
            return data.authenticated ? data.user : null;
        } catch (error) {
            console.error('Gagal mengecek session login:', error);
            return null;
        }
    };

    const updateAuthUI = (user) => {
        const loggedIn = Boolean(user);
        composerInput.disabled = !loggedIn;
        sendButton.disabled = !loggedIn;
        loginHint.hidden = loggedIn;
        authAction.textContent = loggedIn ? 'Logout' : 'Login Google';
        authAction.href = loggedIn ? '#' : 'login.html';
        profileName.textContent = loggedIn ? (user.name || user.email) : 'Guest';
        profileStatus.textContent = loggedIn ? user.email : 'Login untuk memakai AI';
        profileLogin.hidden = loggedIn;
        profileLogout.hidden = !loggedIn;
        topAvatar.hidden = !loggedIn;
        if (loggedIn) topAvatar.textContent = (user.name || user.email || 'G').charAt(0).toUpperCase();
    };

    const logout = async () => {
        await fetch(BACKEND_URL + '/api/auth/logout', { method: 'POST', credentials: 'include' });
        window.location.reload();
    };

    const initAuth = async () => {
        currentUser = await getCurrentUser();
        updateAuthUI(currentUser);
    };

    authAction.addEventListener('click', async (e) => {
        if (!currentUser) return;
        e.preventDefault();
        await logout();
    });
    
    // 1. Tes Koneksi ke Backend
    async function testConnection() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/test`);
        const data = await res.json();
        console.log('Status Backend:', data.message);
      } catch (err) {
        console.error('Gagal terhubung ke backend:', err);
      }
    }
    
    // 2. Fungsi Kirim Pesan ke AI (Groq)
    async function sendChatMessage(userMessage) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ message: userMessage }),
        });
    
        if (response.status === 401) {
          window.location.href = 'login.html';
          return null;
        }
        if (!response.ok) {
          throw new Error(`HTTP Error status: ${response.status}`);
        }
    
        const data = await response.json();
        return data.response; // Mengembalikan balasan dari Groq AI
      } catch (error) {
        console.error('Error memanggil AI:', error);
        return 'Maaf, terjadi kesalahan saat menghubungkan ke AI.';
      }
    }
    
    // Jalankan tes koneksi saat halaman dimuat
    testConnection();

    const progressInt = document.getElementById('ProgressInt');

    const observer = new MutationObserver(() => {
        const progressBar = document.querySelector(".progress-bar i");
        if (progressBar) {
            const value = parseInt(progressInt.textContent);
            progressBar.style.width = value + "%";
        }
    });

    if (progressInt) {
        observer.observe(progressInt, { childList: true, subtree: true });
    }

    let selectedClass = 'Contoh Kelas';

    const showToast = (message) => {
        toast.textContent = message;
        toast.classList.add('show');
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2400);
    };

    const addMessage = (text, type = 'user') => {
        const message = document.createElement('div');
        message.className = 'message ' + type;
        message.innerHTML = type === 'user'
          ? '<div class="bubble"><p></p></div><div class="message-avatar">T</div>'
          : '<div class="message-avatar">✦</div><div class="bubble"><p></p></div>';
        message.querySelector('p').textContent = text;
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
        return message;
    };

    // 3. Fungsi Utama Pengiriman Pesan (Async)
    const sendMessage = async (text) => {
        if (!currentUser) {
            showToast('Login dengan Google untuk memakai AI');
            return;
        }
        const cleanText = text.trim();
        if (!cleanText) return;

        // Tampilkan pesan user ke layar
        addMessage(cleanText, 'user');

        // Beri petunjuk visual loading
        hint.textContent = 'Glint sedang berpikir...';

        // Tampilkan indikator loading sementara untuk jawaban assistant
        const loadingMessage = addMessage('Sedang mengetik...', 'assistant');

        // Panggil API Groq
        const aiResponse = await sendChatMessage(cleanText);

        // Perbarui teks balasan dari indikator loading ke respon asli
        loadingMessage.querySelector('p').textContent = aiResponse;
        messages.scrollTop = messages.scrollHeight;

        hint.textContent = 'Tanya apa saja tentang kelasmu...';
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = form.querySelector('.textBox').value;
        if (text) sendMessage(text);
        form.reset();
    });

    document.querySelectorAll('.quick-actions button').forEach((button) => {
        button.addEventListener('click', () => sendMessage(button.dataset.prompt || button.textContent));
    });

    document.querySelectorAll('.class-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.class-more')) return; // Jangan aktifkan jika tombol "more" diklik
            document.querySelectorAll('.class-item').forEach((classItem) => classItem.classList.remove('active'));
            item.classList.add('active');
            selectedClass = item.dataset.class || 'Product Design';
            currentClass.textContent = selectedClass;
            showToast('Kelas aktif: ' + selectedClass);
            if (window.innerWidth <= 800) sidebar.classList.remove('open');
        });
    });

    document.getElementById('newChat').addEventListener('click', () => {
        messages.innerHTML = '<div class="message assistant"><div class="message-avatar">✦</div><div class="bubble"><p>Chat baru untuk <strong>' + selectedClass + '</strong> siap. Apa yang ingin kamu pelajari?</p></div></div>';
        showToast('Chat baru dibuat');
    });

    function getRandomColor() {
        // Implement your color generation logic here
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        console.log('Generated random color:', color); // Debug log
        return color;
    }

    document.getElementById('addClass').addEventListener('click', () => {
        const color = getRandomColor();
        let name = "New Class"
        if (!name || !name.trim()) return;
        const itemClone = template.content.cloneNode(true);
        const item = itemClone.querySelector('.class-item');
        item.className = 'class-item';
        item.dataset.class = name.trim();
        item.querySelector('span:nth-child(2)').textContent = name.trim();
        item.querySelector('.class-dot').style.backgroundColor = color;
        item.addEventListener('click', (e) => {
            if (e.target.closest('.class-more')) return; // Jangan aktifkan jika tombol "more" diklik
            document.querySelectorAll('.class-item').forEach((classItem) => classItem.classList.remove('active'));
            item.classList.add('active');
            selectedClass = name.trim();
            currentClass.textContent = selectedClass;
            showToast('Kelas aktif: ' + selectedClass);
        });
        item.querySelector('.action-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            const label = item.querySelector('span:nth-child(2)');

            item.querySelector('.popup-menu').classList.remove('show');
            label.style.display = 'none';

            const rename = item.querySelector('.rename');
            rename.style.display = 'inline-block';
            rename.value = name.trim();
            rename.focus();
            
            function handleRenameKeydown(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    rename.blur();
                }
            }
            const saveRename = () => {
                const newName = rename.value.trim();

                if (newName) {
                    item.dataset.class = newName;
                    label.textContent = newName;
                    name = newName;
                    showToast('Nama kelas diubah menjadi: ' + newName);
                }
                rename.style.display = 'none';
                label.style.display = 'inline-block';
                rename.removeEventListener('keydown', handleRenameKeydown);
            }
            const newName = rename.value;
            // berasumsi bahwa nama sudah terisi
            rename.addEventListener('keydown', handleRenameKeydown);
            rename.addEventListener('blur', saveRename, { once: true });
        });
        item.querySelector('.action-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (confirm('Apakah Anda yakin ingin menghapus kelas ini?')) {
                item.remove();
                showToast('Kelas dihapus');
            }
        });
        classList.appendChild(itemClone);
        showToast('Kelas baru ditambahkan');
    });

    openSidebar.addEventListener('click', () => sidebar.classList.add('open'));
    closeSidebar.addEventListener('click', () => sidebar.classList.remove('open'));
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { 
            e.preventDefault(); 
            document.getElementById('newChat').click(); 
        }
        if (e.key === 'Escape') sidebar.classList.remove('open');
    });

    const closeProfileMenu = () => {
        profileMenu.classList.remove('show');
        profileMenuToggle.setAttribute('aria-expanded', 'false');
        profileMenu.setAttribute('aria-hidden', 'true');
    };

    const showAttachPreview = (file) => {
        selectedFile = file;
        attachFileName.textContent = file.name;
        attachPreview.hidden = false;
        attachPreview.classList.add('show');
        attachButton.setAttribute('aria-expanded', 'true');
    };

    const clearAttachment = () => {
        selectedFile = null;
        attachInput.value = '';
        attachFileName.textContent = '';
        attachPreview.classList.remove('show');
        attachPreview.hidden = true;
        attachButton.setAttribute('aria-expanded', 'false');
    };

    profileMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.popup-menu.show').forEach((menu) => menu.classList.remove('show'));
        const isOpen = profileMenu.classList.toggle('show');
        profileMenuToggle.setAttribute('aria-expanded', String(isOpen));
        profileMenu.setAttribute('aria-hidden', String(!isOpen));
    });

    attachButton.addEventListener('click', (e) => {
        e.stopPropagation();
        attachInput.click();
    });

    attachInput.addEventListener('change', () => {
        const file = attachInput.files && attachInput.files[0];
        if (file) showAttachPreview(file);
    });

    removeAttach.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearAttachment();
    });

    profileMenu.querySelector('.action-logout').addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeProfileMenu();
        await logout();
    });

    classList.addEventListener('click', (e) => {
        if (e.target.classList.contains('class-more')) {
            e.stopPropagation();

            const item = e.target.closest('.class-item');
            const popup = item.querySelector('.popup-menu');
            closeProfileMenu();
            document.querySelectorAll('.popup-menu').forEach((menu) => {
                if (menu !== popup) menu.classList.remove('show');
            });
            popup.classList.add('show');
        };
    });

    window.addEventListener('click', (e) => {
        if (!e.target.closest('.mini-profile')) closeProfileMenu();
        document.querySelectorAll('.popup-menu.show').forEach((menu) => {
            menu.classList.remove('show');
        });
    });

    initAuth();
});