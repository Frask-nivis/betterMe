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

    const template = document.getElementById('classItemTemplate');
    // Domain Vercel milikmu
    const BACKEND_URL = 'https://backend-beta-black-91.vercel.app';
    
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
          body: JSON.stringify({ message: userMessage }),
        });
    
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

    classList.addEventListener('click', (e) => {
        if (e.target.classList.contains('class-more')) {
            e.stopPropagation();

            const item = e.target.closest('.class-item');
            const popup = item.querySelector('.popup-menu');
            document.querySelectorAll('.popup-menu').forEach((menu) => {
                if (menu !== popup) menu.classList.remove('show');
            });
            popup.classList.add('show');
        };
    });

    window.addEventListener('click', () => {
        document.querySelectorAll('.popup-menu.show').forEach((menu) => {
            menu.classList.remove('show');
        });
    });
});