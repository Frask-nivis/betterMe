document.addEventListener('DOMContentLoaded', () => {
  const BACKEND_URL = 'https://backend-beta-black-91.vercel.app';
  const STORAGE_KEY = 'goalglint.workspace.v2';
  const MAX_ATTACHMENTS = 6;
  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
  const MAX_WIRE_BYTES = 3.8 * 1024 * 1024;
  const colors = ['#7167f7', '#ff7c70', '#40c99a', '#5d9cf7', '#a884f7'];
  const AGENT_ACTIONS = ['create_class', 'open_class', 'rename_class', 'delete_class', 'add_material', 'add_task', 'delete_document', 'focus_document', 'navigate'];

  const $ = (selector) => document.querySelector(selector);
  const messages = $('#messages');
  const form = $('#chatForm');
  const composerInput = form.querySelector('.textBox');
  const sendButton = form.querySelector('.send-button');
  const hint = $('.shortcut-hint');
  const sidebar = $('#sidebar');
  const toast = $('#toast');
  const classList = $('#classList');
  const template = $('#classItemTemplate');
  const attachInput = $('#attachInput');
  const attachButton = $('.attach-button');
  const attachPreview = $('#attachPreview');
  const attachmentList = $('#attachmentList');
  const attachCount = $('#attachCount');
  const currentClassLabel = $('#currentClass');
  const profileMenu = $('#profileMenu');
  const profileMenuToggle = $('#profileMenuToggle');
  const profileLogout = $('.action-logout');
  const profileLogin = $('#profileLogin');
  const authAction = $('#authAction');
  const topAvatar = $('#topAvatar');
  const loginHint = $('#loginHint');
  let currentUser = null;
  let selectedFiles = [];
  let pendingUploadClassId = null;
  let activeDocumentId = null;
  const runtimeFiles = new Map();
  const fileStore = {
    dbPromise: null,
    open() {
      if (this.dbPromise) return this.dbPromise;
      if (!('indexedDB' in window)) return Promise.resolve(null);
      this.dbPromise = new Promise((resolve) => {
        const request = indexedDB.open('goalglint-workspace-files', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('files', { keyPath: 'id' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
      return this.dbPromise;
    },
    save(id, file) {
      return this.open().then((db) => new Promise((resolve) => {
        if (!db) return resolve(false);
        const transaction = db.transaction('files', 'readwrite');
        transaction.objectStore('files').put({ id, file });
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => resolve(false);
      }));
    },
    get(id) {
      return this.open().then((db) => new Promise((resolve) => {
        if (!db) return resolve(null);
        const request = db.transaction('files', 'readonly').objectStore('files').get(id);
        request.onsuccess = () => resolve(request.result?.file || null);
        request.onerror = () => resolve(null);
      }));
    },
    remove(id) {
      return this.open().then((db) => { if (db) db.transaction('files', 'readwrite').objectStore('files').delete(id); });
    }
  };

  const defaultState = () => ({ classes: [], currentClassId: null, messages: [] });
  let state;
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState(); } catch (_) { state = defaultState(); }
  state.classes = Array.isArray(state.classes) ? state.classes : [];
  state.messages = Array.isArray(state.messages) ? state.messages : [];

  const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const escapeText = (value) => String(value || '').trim();
  const showToast = (message) => { toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600); };
  const fileKind = (file) => { const ext = (file.name || '').split('.').pop().toLowerCase(); if (ext === 'pdf') return 'PDF'; if (['doc', 'docx'].includes(ext)) return 'DOC'; if (['ppt', 'pptx'].includes(ext)) return 'PPT'; if (['xls', 'xlsx'].includes(ext)) return 'XLS'; if ((file.type || '').startsWith('image/')) return 'IMG'; return ext.slice(0, 4).toUpperCase() || 'FILE'; };
  const formatBytes = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  const titleCase = (value) => value.replace(/[-_]+/g, ' ').replace(/\.[^.]+$/, '').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase());

  const inferClassName = (text, fileName = '') => {
    const match = text.match(/(?:materi|mata kuliah|kelas|class|modul|course)(?:\s+(?:kuliah|tentang|untuk))?\s*[:\-]?\s*([^.!?\n]+)/i);
    const candidate = match && match[1] ? match[1].replace(/\b(ini|saya|aku|tolong|please)\b/gi, '').trim() : titleCase(fileName);
    return (candidate || 'Workspace Baru').slice(0, 70);
  };
  const currentClass = () => state.classes.find((item) => item.id === state.currentClassId) || null;
  const totalDocuments = () => state.classes.reduce((sum, item) => sum + (item.documents || []).length, 0);

  const createClass = (name, options = {}) => {
    const cleanName = escapeText(name) || 'Workspace Baru';
    const item = { id: uid('class'), name: cleanName, color: options.color || colors[state.classes.length % colors.length], description: options.description || 'Dokumen, materi, tugas, dan konteks AI untuk Class ini.', createdAt: new Date().toISOString(), documents: [], materials: [], tasks: [] };
    state.classes.push(item);
    state.currentClassId = item.id;
    persist();
    renderAll();
    showToast(`Class “${item.name}” dibuat`);
    return item;
  };

  const ensureClassForFiles = (text, files) => {
    if (pendingUploadClassId) return state.classes.find((item) => item.id === pendingUploadClassId) || null;
    if (state.currentClassId) return currentClass();
    if (!files.length) return null;
    return createClass(inferClassName(text, files[0].name), { description: 'Class dibuat otomatis dari materi yang kamu kirim.' });
  };

  const addFilesToClass = (classItem, files) => {
    if (!classItem) return;
    files.forEach((file) => {
      const duplicate = classItem.documents.some((doc) => doc.name === file.name && doc.size === file.size);
      if (duplicate) return;
      const doc = { id: uid('doc'), name: file.name, type: file.type || 'application/octet-stream', kind: fileKind(file), size: file.size, addedAt: new Date().toISOString(), status: 'ready' };
      classItem.documents.push(doc);
      classItem.materials.push({ id: uid('material'), title: file.name, sourceDocumentId: doc.id, createdAt: doc.addedAt });
      runtimeFiles.set(doc.id, file);
      fileStore.save(doc.id, file);
    });
    state.currentClassId = classItem.id;
    pendingUploadClassId = null;
    persist();
    renderAll();
    if (files.length) openDocument(classItem.documents[classItem.documents.length - 1].id);
  };

  const removeDocument = (classItem, documentId) => {
    const doc = classItem.documents.find((item) => item.id === documentId);
    classItem.documents = classItem.documents.filter((item) => item.id !== documentId);
    classItem.materials = classItem.materials.filter((item) => item.sourceDocumentId !== documentId);
    runtimeFiles.delete(documentId);
    fileStore.remove(documentId);
    if (activeDocumentId === documentId) activeDocumentId = null;
    persist(); renderAll(); showToast(doc ? `Dokumen “${doc.name}” dihapus` : 'Dokumen dihapus');
  };

  const navigateToClass = (id, announce = true) => {
    const item = state.classes.find((entry) => entry.id === id);
    if (!item) return;
    state.currentClassId = id; activeDocumentId = null; persist(); renderAll();
    if (window.innerWidth <= 800) sidebar.classList.remove('open');
    if (announce) showToast(`Class aktif: ${item.name}`);
  };

  const renderSidebar = () => {
    classList.innerHTML = '';
    $('#emptyClasses').hidden = state.classes.length > 0;
    state.classes.forEach((item) => {
      const fragment = template.content.cloneNode(true);
      const row = fragment.querySelector('.class-item');
      const nameButton = fragment.querySelector('.class-name');
      row.dataset.classId = item.id; row.classList.toggle('active', item.id === state.currentClassId);
      row.querySelector('.class-dot').style.backgroundColor = item.color; nameButton.textContent = item.name;
      nameButton.addEventListener('click', () => navigateToClass(item.id));
      row.querySelector('.class-more').addEventListener('click', (event) => { event.stopPropagation(); document.querySelectorAll('.popup-menu.show').forEach((menu) => menu.classList.remove('show')); row.querySelector('.popup-menu').classList.add('show'); });
      row.querySelector('.action-edit').addEventListener('click', () => { const next = window.prompt('Nama Class', item.name); if (next && next.trim()) { item.name = next.trim(); persist(); renderAll(); showToast('Nama Class diperbarui'); } });
      row.querySelector('.action-delete').addEventListener('click', () => { if (!window.confirm(`Hapus Class “${item.name}”?`)) return; state.classes = state.classes.filter((entry) => entry.id !== item.id); if (state.currentClassId === item.id) state.currentClassId = state.classes[0]?.id || null; persist(); renderAll(); showToast('Class dihapus'); });
      classList.appendChild(fragment);
    });
  };

  const renderClassItems = (tab = document.querySelector('.content-tab.active')?.dataset.contentTab || 'documents') => {
    const item = currentClass(); const container = $('#classItems'); container.innerHTML = '';
    if (!item) { container.innerHTML = '<div class="content-empty">Pilih atau buat Class untuk melihat isinya.</div>'; return; }
    const list = tab === 'documents' ? item.documents : tab === 'materials' ? item.materials : item.tasks;
    if (!list.length) { container.innerHTML = `<div class="content-empty">Belum ada ${tab === 'documents' ? 'dokumen' : tab === 'materials' ? 'materi' : 'tugas'} di Class ini.</div>`; return; }
    list.forEach((entry) => {
      const sourceDoc = entry.sourceDocumentId ? item.documents.find((doc) => doc.id === entry.sourceDocumentId) : null;
      const row = document.createElement('div'); row.className = 'class-content-item';
      const button = document.createElement('button'); button.type = 'button'; button.className = 'content-item-main';
      button.innerHTML = `<span class="content-item-icon">${sourceDoc?.kind || (tab === 'tasks' ? '✓' : '✦')}</span><span><strong></strong><small>${sourceDoc ? `${sourceDoc.kind} · ${formatBytes(sourceDoc.size)}` : tab === 'tasks' ? 'Tugas Class' : 'Catatan materi'}</small></span>`;
      button.querySelector('strong').textContent = entry.name || entry.title || 'Item';
      if (sourceDoc) button.addEventListener('click', () => openDocument(sourceDoc.id));
      row.appendChild(button);
      if (sourceDoc) { const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'content-item-delete'; remove.textContent = '×'; remove.title = 'Hapus dokumen'; remove.addEventListener('click', () => removeDocument(item, sourceDoc.id)); row.appendChild(remove); }
      container.appendChild(row);
    });
  };

  const renderWorkspace = () => {
    const item = currentClass(); const workspace = $('#classWorkspace');
    workspace.hidden = !item; currentClassLabel.textContent = item ? item.name : 'Global chat'; $('#contextStat').textContent = item ? 'Class' : 'Global'; $('#contextStripText').textContent = item ? `Class aktif · ${item.name} · ${item.documents.length} dokumen` : 'Global chat · belum memilih Class';
    if (!item) { $('#classStat').textContent = String(state.classes.length); $('#documentStat').textContent = String(totalDocuments()); $('#contextJump').textContent = 'Buka Class'; return; }
    $('#workspaceTitle').textContent = item.name; $('#workspaceDescription').textContent = item.description; $('#classStat').textContent = String(state.classes.length); $('#documentStat').textContent = String(totalDocuments()); $('#documentBadge').textContent = `${item.documents.length} dokumen`; $('#contextJump').textContent = 'Lihat Class';
    $('#classProgressBar').style.width = `${Math.min(100, item.documents.length ? 20 + item.materials.length * 10 : 8)}%`;
    renderClassItems();
  };

  const renderStats = () => { $('#savedCount').textContent = String(state.classes.reduce((sum, item) => sum + item.materials.length, 0)); $('#documentDots').innerHTML = Array.from({ length: 7 }, (_, index) => `<i class="${index < Math.min(7, totalDocuments()) ? 'done' : 'none'}"></i>`).join(''); };
  const renderAll = () => { renderSidebar(); renderWorkspace(); renderStats(); };

  const openDocument = async (documentId) => {
    const item = currentClass(); const doc = item?.documents.find((entry) => entry.id === documentId); if (!doc) return;
    activeDocumentId = doc.id; $('#viewerTitle').textContent = doc.name; const stage = $('#viewerStage'); stage.innerHTML = '';
    const file = runtimeFiles.get(doc.id) || await fileStore.get(doc.id); if (file) runtimeFiles.set(doc.id, file);
    const ext = doc.name.split('.').pop().toLowerCase();
    if (!file) { stage.innerHTML = '<div class="viewer-empty"><span>◌</span><strong>Dokumen tersedia setelah dibuka ulang</strong><p>Metadata Class tersimpan. Unggah ulang file ini untuk melihat preview lokal.</p></div>'; return; }
    const url = URL.createObjectURL(file); stage.dataset.objectUrl = url;
    if (doc.kind === 'PDF') { const frame = document.createElement('iframe'); frame.title = `Preview ${doc.name}`; frame.src = url; stage.appendChild(frame); }
    else if (file.type.startsWith('image/')) { const image = document.createElement('img'); image.alt = doc.name; image.src = url; stage.appendChild(image); }
    else if (['txt', 'md', 'csv', 'json'].includes(ext)) { const pre = document.createElement('pre'); pre.textContent = await file.text(); stage.appendChild(pre); }
    else { stage.innerHTML = `<div class="viewer-empty"><span>${doc.kind}</span><strong>Preview native belum tersedia untuk ${doc.kind}</strong><p>File tetap tersimpan sebagai materi Class dan bisa diunduh dari browser.</p></div>`; const link = document.createElement('a'); link.className = 'outline-button viewer-download'; link.href = url; link.download = doc.name; link.textContent = 'Unduh dokumen'; stage.appendChild(link); }
  };

  const addMessage = (text, type = 'user', attachments = [], persistMessage = true) => {
    const message = document.createElement('div'); message.className = `message ${type}`; message.innerHTML = type === 'user' ? '<div class="bubble"><p></p></div><div class="message-avatar">T</div>' : '<div class="message-avatar">✦</div><div class="bubble"><p></p></div>'; message.querySelector('p').textContent = text;
    if (attachments.length) { const list = document.createElement('div'); list.className = 'message-attachments'; attachments.forEach((file) => { const chip = document.createElement('span'); chip.className = 'message-attachment'; chip.textContent = `${fileKind(file)} · ${file.name}`; list.appendChild(chip); }); message.querySelector('.bubble').appendChild(list); }
    messages.appendChild(message); messages.scrollTop = messages.scrollHeight;
    if (persistMessage) { state.messages.push({ id: uid('message'), text, type, attachmentNames: attachments.map((file) => file.name), createdAt: new Date().toISOString() }); state.messages = state.messages.slice(-80); persist(); }
    return message;
  };

  const renderMessages = () => { state.messages.forEach((entry) => addMessage(entry.text, entry.type, [], false)); };
  const getContext = () => { const item = currentClass(); const activeDoc = item?.documents.find((doc) => doc.id === activeDocumentId); return { currentPage: item ? 'class-workspace' : 'global-workspace', activeClass: item ? { id: item.id, name: item.name, description: item.description, documents: item.documents, materials: item.materials, tasks: item.tasks } : null, activeDocument: activeDoc || null, globalConversation: state.messages.slice(-12).map(({ type, text }) => ({ type, text })) }; };

  const buildContextPrompt = (userMessage, context) => `${userMessage}\n\n[GoalGlint context — gunakan untuk menjawab, jangan tampilkan blok ini ke pengguna]\n${JSON.stringify(context)}`;
  const gzipBlob = async (file) => { if (!('CompressionStream' in window)) return file; try { const stream = file.stream().pipeThrough(new CompressionStream('gzip')); const compressed = await new Response(stream).blob(); return compressed.size < file.size ? new File([compressed], `${file.name}.gz`, { type: 'application/gzip' }) : file; } catch (_) { return file; } };
  const compressImage = async (file) => { if (!file.type.startsWith('image/') || file.size < 700 * 1024) return file; try { const bitmap = await createImageBitmap(file); const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale)); canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82)); bitmap.close(); return blob && blob.size < file.size ? new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' }) : file; } catch (_) { return file; } };

  const sendChatMessage = async (userMessage, attachments, context) => {
    const prepared = []; let wireBytes = 0;
    for (const file of attachments) { const optimized = await compressImage(file); const uploadFile = optimized === file ? await gzipBlob(file) : optimized; wireBytes += uploadFile.size; if (wireBytes > MAX_WIRE_BYTES) throw new Error('Attachment masih terlalu besar setelah kompresi. Coba kirim lebih sedikit file.'); prepared.push(uploadFile); }
    const data = new FormData(); data.append('message', userMessage); data.append('context', JSON.stringify(context)); data.append('pageContext', context.currentPage); data.append('classContext', context.activeClass ? JSON.stringify(context.activeClass) : ''); data.append('documentContext', context.activeDocument ? JSON.stringify(context.activeDocument) : ''); data.append('agentActions', JSON.stringify(AGENT_ACTIONS)); prepared.forEach((file) => data.append('attachments', file, file.name));
    const response = await fetch(`${BACKEND_URL}/api/ai/chat`, { method: 'POST', credentials: 'include', body: data });
    if (response.status === 401) { window.location.href = 'login.html'; return null; }
    if (!response.ok) throw new Error(`AI tidak tersedia (HTTP ${response.status}).`);
    const result = await response.json(); return { text: result.response || result.error || 'Maaf, AI tidak mengembalikan jawaban.', actions: Array.isArray(result.agentActions) ? result.agentActions : Array.isArray(result.actions) ? result.actions : [] };
  };

  const applyAgentActions = (actions) => {
    const notices = [];
    const findActionClass = (action) => state.classes.find((entry) => entry.id === action.classId || (action.className && entry.name.toLowerCase().includes(String(action.className).toLowerCase()))) || currentClass();
    for (const action of Array.isArray(actions) ? actions : []) {
      if (!action || !AGENT_ACTIONS.includes(action.type)) continue;
      let item = findActionClass(action);
      if (action.type === 'create_class' && action.name) { item = createClass(action.name, { description: action.description }); notices.push(`Class “${item.name}” dibuat.`); }
      if (action.type === 'open_class') { const target = state.classes.find((entry) => entry.id === action.classId || entry.name.toLowerCase().includes(String(action.name || '').toLowerCase())); if (target) { navigateToClass(target.id); item = target; notices.push(`Membuka Class “${target.name}”.`); } }
      if (action.type === 'rename_class' && item && action.name) { item.name = String(action.name).trim(); persist(); renderAll(); notices.push(`Nama Class diubah menjadi “${item.name}”.`); }
      if (action.type === 'delete_class' && item) { const name = item.name; if (window.confirm(`AI meminta menghapus Class “${name}”. Lanjutkan?`)) { state.classes = state.classes.filter((entry) => entry.id !== item.id); state.currentClassId = state.classes[0]?.id || null; persist(); renderAll(); notices.push(`Class “${name}” dihapus.`); } else notices.push(`Penghapusan Class “${name}” dibatalkan.`); }
      if (action.type === 'add_material' && item && action.title) { item.materials.push({ id: uid('material'), title: String(action.title), createdAt: new Date().toISOString() }); persist(); renderAll(); notices.push(`Materi ditambahkan ke “${item.name}”.`); }
      if (action.type === 'add_task' && item && action.title) { item.tasks.push({ id: uid('task'), title: String(action.title), createdAt: new Date().toISOString() }); persist(); renderAll(); notices.push(`Tugas ditambahkan ke “${item.name}”.`); }
      if (action.type === 'delete_document' && item && action.documentId) { const target = item.documents.find((doc) => doc.id === action.documentId); if (target && window.confirm(`AI meminta menghapus dokumen “${target.name}” dari “${item.name}”. Lanjutkan?`)) { removeDocument(item, target.id); notices.push(`Dokumen “${target.name}” dihapus.`); } else if (target) notices.push(`Penghapusan dokumen “${target.name}” dibatalkan.`); }
      if (action.type === 'focus_document' && item && action.documentId) { navigateToClass(item.id, false); openDocument(action.documentId); notices.push('Dokumen dibuka di viewer.'); }
      if (action.type === 'navigate' && action.route === 'global-workspace') { state.currentClassId = null; persist(); renderAll(); notices.push('Kembali ke Global chat.'); }
    }
    return notices;
  };

  const applyLocalIntent = (text) => {
    const lower = text.toLowerCase(); const actions = []; let item = currentClass();
    const createMatch = text.match(/(?:buat|buatkan|create)\s+(?:class|kelas)(?:\s+(?:untuk|bernama|dengan nama))?\s*[:\-]?\s*(.*)/i);
    if (createMatch && createMatch[1].trim()) { item = createClass(createMatch[1].replace(/[.!?]+$/, '').trim()); actions.push(`Class “${item.name}” siap digunakan.`); }
    const renameMatch = text.match(/(?:ubah|ganti)\s+nama\s+(?:class|kelas)\s+(.+?)\s+(?:menjadi|jadi|ke)\s+(.+)/i);
    if (renameMatch) { const target = state.classes.find((entry) => entry.name.toLowerCase().includes(renameMatch[1].trim().toLowerCase())); if (target) { target.name = renameMatch[2].replace(/[.!?]+$/, '').trim(); state.currentClassId = target.id; item = target; persist(); renderAll(); actions.push(`Nama Class diubah menjadi “${target.name}”.`); } }
    const deleteClassMatch = text.match(/(?:hapus|delete)\s+(?:class|kelas)\s+(.+)/i);
    if (deleteClassMatch && !renameMatch) { const target = state.classes.find((entry) => entry.name.toLowerCase().includes(deleteClassMatch[1].trim().toLowerCase())); if (target) { state.classes = state.classes.filter((entry) => entry.id !== target.id); state.currentClassId = state.classes[0]?.id || null; persist(); renderAll(); item = currentClass(); actions.push(`Class “${target.name}” dihapus.`); } }
    const openMatch = text.match(/(?:buka|open|pindah(?:kan)? ke|gunakan)\s+(?:class|kelas)?\s*[:\-]?\s*(.*)/i);
    if (openMatch && openMatch[1].trim() && !createMatch && !renameMatch && !deleteClassMatch) { const target = state.classes.find((entry) => entry.name.toLowerCase().includes(openMatch[1].trim().toLowerCase())); if (target) { navigateToClass(target.id); item = target; actions.push(`Membuka Class “${target.name}”.`); } }
    if (/(?:tampilkan|lihat|baca|show).*(?:isi|konten|dokumen|materi)/i.test(text) && item) { navigateToClass(item.id, false); actions.push(`Menampilkan isi Class “${item.name}”.`); }
    const deleteDocumentMatch = text.match(/(?:hapus|delete)\s+(?:dokumen|file|materi)\s+(.+)/i);
    if (deleteDocumentMatch && item) { const target = item.documents.find((entry) => entry.name.toLowerCase().includes(deleteDocumentMatch[1].trim().toLowerCase())); if (target) { removeDocument(item, target.id); actions.push(`Dokumen “${target.name}” dihapus dari “${item.name}”.`); } }
    const taskMatch = text.match(/(?:tambah|buat|catat)\s+(?:tugas|task)\s*[:\-]?\s*(.*)/i);
    if (taskMatch && item) { const title = taskMatch[1].trim() || 'Tugas baru'; item.tasks.push({ id: uid('task'), title, createdAt: new Date().toISOString() }); persist(); renderAll(); actions.push(`Tugas “${title}” ditambahkan ke “${item.name}”.`); }
    if (/(?:organisasi|organisir|rapikan|susun).*(?:materi|dokumen|class|kelas)/i.test(text) && item) { item.documents.sort((a, b) => a.name.localeCompare(b.name)); item.materials.sort((a, b) => (a.title || '').localeCompare(b.title || '')); persist(); renderAll(); actions.push(`Materi di “${item.name}” dirapikan berdasarkan nama.`); }
    if (/(?:tambah|buat).*(?:catatan|note)/i.test(text) && item) { const note = text.replace(/.*(?:catatan|note)\s*[:\-]?/i, '').trim() || 'Catatan baru'; item.materials.push({ id: uid('material'), title: note, createdAt: new Date().toISOString() }); persist(); renderAll(); actions.push(`Catatan ditambahkan ke “${item.name}”.`); }
    if (lower.includes('ke homepage') || lower.includes('global chat')) { state.currentClassId = null; persist(); renderAll(); actions.push('Kembali ke Global chat.'); }
    return actions;
  };

  const sendMessage = async (text, attachments = []) => {
    if (!currentUser) { showToast('Login dengan Google untuk memakai AI'); return; }
    const cleanText = text.trim(); if (!cleanText && !attachments.length) return;
    const classForFiles = ensureClassForFiles(cleanText, attachments);
    if (attachments.length && classForFiles) { addFilesToClass(classForFiles, attachments); }
    const localActions = applyLocalIntent(cleanText);
    addMessage(cleanText || 'Tolong analisis file ini.', 'user', attachments);
    const actionMessage = localActions.length ? addMessage(localActions.join(' '), 'assistant') : null;
    hint.textContent = attachments.length ? 'Mengecilkan attachment lalu membaca...' : 'Glint sedang berpikir...';
    const loading = addMessage('Sedang membaca konteks workspace…', 'assistant');
    try { const result = await sendChatMessage(cleanText || 'Analisis materi yang saya lampirkan.', attachments, getContext()); const agentNotices = applyAgentActions(result?.actions || []); loading.querySelector('p').textContent = [result?.text || 'Silakan lanjutkan setelah login.', ...agentNotices].join(' '); }
    catch (error) { loading.querySelector('p').textContent = error.message || 'Maaf, terjadi kesalahan saat menghubungkan ke AI.'; }
    hint.textContent = 'Tanya apa saja tentang workspace-mu...'; if (actionMessage) actionMessage.scrollIntoView({ block: 'nearest' });
  };

  const updateAuthUI = (user) => { const loggedIn = Boolean(user); composerInput.disabled = !loggedIn; sendButton.disabled = !loggedIn; loginHint.hidden = loggedIn; authAction.textContent = loggedIn ? 'Logout' : 'Login Google'; authAction.href = loggedIn ? '#' : 'login.html'; profileLogin.hidden = loggedIn; profileLogout.hidden = !loggedIn; $('#profileName').textContent = loggedIn ? (user.name || user.email) : 'Guest'; $('#profileStatus').textContent = loggedIn ? user.email : 'Login untuk memakai AI'; topAvatar.hidden = !loggedIn; if (loggedIn) topAvatar.textContent = (user.name || user.email || 'G').charAt(0).toUpperCase(); };
  const getCurrentUser = async () => { try { const response = await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: 'include' }); if (!response.ok) return null; const data = await response.json(); return data.authenticated ? data.user : null; } catch (_) { return null; } };
  const logout = async () => { await fetch(`${BACKEND_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }); window.location.reload(); };

  const updateAttachmentPreview = () => { attachCount.textContent = `${selectedFiles.length}/${MAX_ATTACHMENTS}`; attachPreview.hidden = selectedFiles.length === 0; attachPreview.classList.toggle('show', selectedFiles.length > 0); attachButton.setAttribute('aria-expanded', String(selectedFiles.length > 0)); attachmentList.innerHTML = ''; selectedFiles.forEach((file, index) => { const item = document.createElement('div'); item.className = 'attachment-chip'; item.innerHTML = `<span class="attachment-type">${fileKind(file)}</span><span class="attachment-meta"><strong></strong><small>${formatBytes(file.size)}</small></span><button type="button" aria-label="Hapus lampiran">×</button>`; item.querySelector('strong').textContent = file.name; item.querySelector('button').addEventListener('click', () => { selectedFiles.splice(index, 1); updateAttachmentPreview(); }); attachmentList.appendChild(item); }); };
  const addFiles = (fileList) => { for (const file of [...fileList]) { if (selectedFiles.length >= MAX_ATTACHMENTS) break; if (file.size > MAX_FILE_BYTES) { showToast(`${file.name} lebih besar dari 20 MB`); continue; } if (selectedFiles.reduce((sum, entry) => sum + entry.size, 0) + file.size > MAX_TOTAL_BYTES) { showToast('Total file asli maksimal 30 MB per pesan'); break; } if (!selectedFiles.some((entry) => entry.name === file.name && entry.size === file.size)) selectedFiles.push(file); } updateAttachmentPreview(); };
  const clearAttachments = () => { selectedFiles = []; attachInput.value = ''; updateAttachmentPreview(); };

  form.addEventListener('submit', (event) => { event.preventDefault(); const text = composerInput.value; const files = [...selectedFiles]; composerInput.value = ''; clearAttachments(); sendMessage(text, files); });
  composerInput.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
  attachButton.addEventListener('click', () => attachInput.click());
  attachInput.addEventListener('change', () => { if (attachInput.files?.length) { addFiles(attachInput.files); if (pendingUploadClassId) { const target = state.classes.find((item) => item.id === pendingUploadClassId); if (target) { addFilesToClass(target, selectedFiles); clearAttachments(); } } } attachInput.value = ''; });
  $('#clearAttachments').addEventListener('click', clearAttachments);
  $('#addClass').addEventListener('click', () => { const name = window.prompt('Nama Class baru'); if (name?.trim()) navigateToClass(createClass(name.trim()).id); });
  $('#newChat').addEventListener('click', () => { state.messages = []; persist(); messages.innerHTML = '<div class="message assistant"><div class="message-avatar">✦</div><div class="bubble"><p>Chat global baru siap. Class aktif tetap bisa kamu buka dari sidebar.</p></div></div>'; showToast('Chat global baru dibuat'); });
  $('#uploadToClass').addEventListener('click', () => { if (!currentClass()) { showToast('Pilih Class dulu'); return; } pendingUploadClassId = state.currentClassId; attachInput.click(); });
  $('#addNoteButton').addEventListener('click', () => { const item = currentClass(); if (!item) return; const note = window.prompt('Isi catatan untuk Class ini'); if (note?.trim()) { item.materials.push({ id: uid('material'), title: note.trim(), createdAt: new Date().toISOString() }); persist(); renderAll(); showToast('Catatan ditambahkan'); } });
  $('#focusClassButton').addEventListener('click', () => currentClass() && showToast(`AI sekarang memakai “${currentClass().name}” sebagai konteks`));
  $('#contextJump').addEventListener('click', () => currentClass() ? $('#classWorkspace').scrollIntoView({ behavior: 'smooth' }) : (state.classes[0] ? navigateToClass(state.classes[0].id) : showToast('Belum ada Class')));
  $('#closeViewer').addEventListener('click', () => { activeDocumentId = null; $('#viewerTitle').textContent = 'Pilih dokumen'; $('#viewerStage').innerHTML = '<div class="viewer-empty"><span>▣</span><strong>Belum ada dokumen dibuka</strong><p>Pilih materi dari daftar Class untuk melihatnya di sini.</p></div>'; });
  document.querySelectorAll('.content-tab').forEach((tab) => tab.addEventListener('click', () => { document.querySelectorAll('.content-tab').forEach((entry) => entry.classList.remove('active')); tab.classList.add('active'); renderClassItems(tab.dataset.contentTab); }));
  $('#openSidebar').addEventListener('click', () => sidebar.classList.add('open')); $('#closeSidebar').addEventListener('click', () => sidebar.classList.remove('open')); document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#newChat').click(); } if (event.key === 'Escape') sidebar.classList.remove('open'); });
  profileMenuToggle.addEventListener('click', (event) => { event.stopPropagation(); const open = profileMenu.classList.toggle('show'); profileMenuToggle.setAttribute('aria-expanded', String(open)); profileMenu.setAttribute('aria-hidden', String(!open)); }); profileLogout.addEventListener('click', logout); authAction.addEventListener('click', (event) => { if (currentUser) { event.preventDefault(); logout(); } }); window.addEventListener('click', (event) => { if (!event.target.closest('.mini-profile')) profileMenu.classList.remove('show'); document.querySelectorAll('.popup-menu.show').forEach((menu) => menu.classList.remove('show')); });
  document.querySelectorAll('.quick-actions button').forEach((button) => button.addEventListener('click', () => sendMessage(button.dataset.prompt || button.textContent)));
  document.querySelectorAll('[data-route]').forEach((link) => link.addEventListener('click', (event) => { if (link.dataset.route === 'chat') return; event.preventDefault(); showToast(`${link.textContent.trim()} akan tersedia setelah datanya terhubung.`); }));

  renderAll(); renderMessages();
  getCurrentUser().then((user) => { currentUser = user; updateAuthUI(user); });
});
