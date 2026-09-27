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
    const attachCount = document.getElementById('attachCount');
    const attachmentList = document.getElementById('attachmentList');
    const clearAttachmentsButton = document.getElementById('clearAttachments');
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
    let selectedFiles = [];
    const MAX_ATTACHMENTS = 6;
    const MAX_FILE_BYTES = 4 * 1024 * 1024;
    const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

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
    async function sendChatMessage(userMessage, attachments = []) {
      try {
        const formData = new FormData();
        formData.append('message', userMessage);
        attachments.forEach((file) => formData.append('attachments', file, file.name));
        const response = await fetch(`${BACKEND_URL}/api/ai/chat`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
    
        if (response.status === 401) {
          window.location.href = 'login.html';
          return null;
        }
        if (!response.ok) {
          throw new Error(`HTTP Error status: ${response.status}`);
        }
    
        const data = await response.json();
        return data.response || data.error || 'Maaf, AI tidak mengembalikan jawaban.'; // Mengembalikan balasan dari Groq AI
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

    const fileKind = (file) => {
        const type = file.type || '';
        const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'file';
        if (type === 'application/pdf' || ext === 'pdf') return 'PDF';
        if (['doc', 'docx'].includes(ext)) return 'DOC';
        if (['ppt', 'pptx'].includes(ext)) return 'PPT';
        if (type.startsWith('image/')) return 'IMG';
        return ext.slice(0, 4).toUpperCase();
    };

    const formatBytes = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const renderAttachmentList = () => {
        attachmentList.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'attachment-chip';
            item.innerHTML = `<span class="attachment-type">${fileKind(file)}</span><span class="attachment-meta"><strong></strong><small></small></span><button type="button" aria-label="Hapus ${file.name}">×</button>`;
            item.querySelector('strong').textContent = file.name;
            item.querySelector('small').textContent = formatBytes(file.size);
            item.querySelector('button').addEventListener('click', () => {
                selectedFiles.splice(index, 1);
                renderAttachmentList();
                updateAttachmentPreview();
            });
            attachmentList.appendChild(item);
        });
    };

    const updateAttachmentPreview = () => {
        attachCount.textContent = `${selectedFiles.length}/${MAX_ATTACHMENTS}`;
        attachPreview.hidden = selectedFiles.length === 0;
        attachPreview.classList.toggle('show', selectedFiles.length > 0);
        attachButton.setAttribute('aria-expanded', String(selectedFiles.length > 0));
        renderAttachmentList();
    };

    const addMessage = (text, type = 'user', attachments = []) => {
        const message = document.createElement('div');
        message.className = 'message ' + type;
        message.innerHTML = type === 'user'
          ? '<div class="bubble"><p></p></div><div class="message-avatar">T</div>'
          : '<div class="message-avatar">✦</div><div class="bubble"><p></p></div>';
        message.querySelector('p').textContent = text;
        if (attachments.length) {
            const list = document.createElement('div');
            list.className = 'message-attachments';
            attachments.forEach((file) => {
                const card = document.createElement('span');
                card.className = 'message-attachment';
                card.textContent = `${fileKind(file)} · ${file.name}`;
                list.appendChild(card);
            });
            message.querySelector('.bubble').appendChild(list);
        }
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
        return message;
    };

    // 3. Fungsi Utama Pengiriman Pesan (Async)
    const sendMessage = async (text, attachments = []) => {
        if (!currentUser) {
            showToast('Login dengan Google untuk memakai AI');
            return;
        }
        const cleanText = text.trim();
        if (!cleanText && !attachments.length) return;

        // Tampilkan pesan user ke layar
        addMessage(cleanText || 'Tolong analisis file ini.', 'user', attachments);

        // Beri petunjuk visual loading
        hint.textContent = 'Glint sedang berpikir...';

        // Tampilkan indikator loading sementara untuk jawaban assistant
        const loadingMessage = addMessage('Sedang mengetik...', 'assistant');

        // Panggil API Groq
        const aiResponse = await sendChatMessage(cleanText, attachments);

        // Perbarui teks balasan dari indikator loading ke respon asli
        loadingMessage.querySelector('p').textContent = aiResponse;
        messages.scrollTop = messages.scrollHeight;

        hint.textContent = 'Tanya apa saja tentang kelasmu...';
    };

    composerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.requestSubmit();
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = form.querySelector('.textBox').value;
        const files = [...selectedFiles];
        if (text.trim() || files.length) sendMessage(text, files);
        composerInput.value = '';
        clearAttachment();
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

    const clearAttachment = () => {
        selectedFiles = [];
        attachInput.value = '';
        updateAttachmentPreview();
    };

    const addFiles = (fileList) => {
        const incoming = [...fileList];
        if (selectedFiles.length + incoming.length > MAX_ATTACHMENTS) {
            showToast(`Maksimal ${MAX_ATTACHMENTS} file per pesan`);
        }
        for (const file of incoming) {
            if (selectedFiles.length >= MAX_ATTACHMENTS) break;
            if (file.size > MAX_FILE_BYTES) {
                showToast(`${file.name} lebih besar dari 4 MB`);
                continue;
            }
            const total = selectedFiles.reduce((sum, item) => sum + item.size, 0) + file.size;
            if (total > MAX_TOTAL_BYTES) {
                showToast('Total attachment maksimal 4 MB per pesan');
                break;
            }
            if (!selectedFiles.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) {
                selectedFiles.push(file);
            }
        }
        updateAttachmentPreview();
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
        if (attachInput.files && attachInput.files.length) addFiles(attachInput.files);
        attachInput.value = '';
    });

    clearAttachmentsButton.addEventListener('click', (e) => {
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