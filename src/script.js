document.addEventListener('DOMContentLoaded', () => {
      const messages = document.getElementById('messages');
      const form = document.getElementById('chatForm');
      const hint = document.querySelector('.composer-hint');
      const currentClass = document.getElementById('currentClass');
      const sidebar = document.getElementById('sidebar');
      const toast = document.getElementById('toast');
      const openSidebar = document.getElementById('openSidebar');
      const closeSidebar = document.getElementById('closeSidebar');
      const classList = document.getElementById('classList');
      let selectedClass = 'Product Design';

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
                            };

                            const addDemoReply = (prompt) => {
                                    window.setTimeout(() => {
                                              const replies = {
                                                          'Buatkan rencana belajar untuk hari ini': 'Tentu! Kita bisa mulai dengan 25 menit membaca prinsip dasar, 40 menit membedah satu studi kasus, lalu 15 menit merangkum insight utama.',
                                                          'Jelaskan prinsip dasar user experience': 'UX yang baik dimulai dari memahami kebutuhan pengguna, menyederhanakan alur, memberi feedback yang jelas, dan menguji asumsi lewat observasi.',
                                                          'Bantu review tugas saya': 'Siap. Kirimkan brief atau hasil tugasmu, lalu aku bantu cek struktur, kejelasan masalah, dan peluang perbaikannya.'
                                              };
                                              addMessage(replies[prompt] || 'Ini masih mode demo template. Hubungkan fungsi addDemoReply ke API LLM pilihanmu agar jawabannya dinamis.', 'assistant');
                                    }, 450);
                            };

                            const sendMessage = (text) => {
                                    const cleanText = text.trim();
                                    if (!cleanText) return;
                                    addMessage(cleanText, 'user');
                                    hint.textContent = 'Glint sedang menyiapkan jawaban demo...';
                                    addDemoReply(cleanText);
                                    window.setTimeout(() => { hint.textContent = 'Tanya apa saja tentang kelasmu...'; }, 700);
                            };

                            form.addEventListener('submit', (event) => {
                                    event.preventDefault();
                                    const text = window.prompt('Tulis pertanyaanmu untuk Glint AI:');
                                    if (text) sendMessage(text);
                            });

                            document.querySelectorAll('.quick-actions button').forEach((button) => {
                                    button.addEventListener('click', () => sendMessage(button.dataset.prompt || button.textContent));
                            });

                            document.querySelectorAll('.class-item').forEach((item) => {
                                    item.addEventListener('click', () => {
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

                            document.getElementById('addClass').addEventListener('click', () => {
                                    const name = window.prompt('Nama kelas baru:');
                                    if (!name || !name.trim()) return;
                                    const item = document.createElement('button');
                                    item.className = 'class-item';
                                    item.dataset.class = name.trim();
                                    item.innerHTML = '<span class="class-dot violet"></span><span></span><span class="class-more">•••</span>';
                                    item.querySelector('span:nth-child(2)').textContent = name.trim();
                                    item.addEventListener('click', () => {
                                              document.querySelectorAll('.class-item').forEach((classItem) => classItem.classList.remove('active'));
                                              item.classList.add('active');
                                              selectedClass = name.trim();
                                              currentClass.textContent = selectedClass;
                                              showToast('Kelas aktif: ' + selectedClass);
                                    });
                                    classList.appendChild(item);
                                    showToast('Kelas baru ditambahkan');
                            });

                            openSidebar.addEventListener('click', () => sidebar.classList.add('open'));
      closeSidebar.addEventListener('click', () => sidebar.classList.remove('open'));
      document.addEventListener('keydown', (event) => {
              if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.getElementById('newChat').click(); }
              if (event.key === 'Escape') sidebar.classList.remove('open');
      });
});
