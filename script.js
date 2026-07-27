/* ============================================
   JEJAK BINTANG — logika aplikasi
   ============================================ */

// ---------- Data tugas default ----------
const defaultTugas = [
  "Bangun & mandi pagi (05.00-05.30)",
  "Sarapan & cek perlengkapan sekolah (05.30-06.00)",
  "Sekolah hingga pukul 15.30 (06.30-15.30)",
  "Membersihkan rumah (16.00-17.00)",
  "Mandi sore & istirahat (17.00-18.00)",
  "Makan malam (18.00-18.30)",
  "Sesi Belajar 1 (18.30-19.15)",
  "Sesi Belajar 2 (19.30-20.15)",
  "Waktu bebas (20.15-21.00)",
  "Persiapan tidur & tidur tepat waktu (21.30-22.00)"
];

// ---------- Kunci localStorage ----------
const STORAGE_TUGAS = 'todolist_daftar_tugas';
const STORAGE_KEY_TODAY = 'todolist_today_data';
const DATE_KEY = 'todolist_today_date';
const HISTORY_KEY = 'todolist_history';
const SOUND_KEY = 'todolist_suara_aktif';

let suaraAktif = localStorage.getItem(SOUND_KEY) === '1';
let editorTugas = [];
let audioCtx = null;

// ---------- Penyimpanan dasar ----------

function getDaftarTugas() {
  const saved = localStorage.getItem(STORAGE_TUGAS);
  return saved ? JSON.parse(saved) : [...defaultTugas];
}

function simpanDaftarTugas(daftar) {
  localStorage.setItem(STORAGE_TUGAS, JSON.stringify(daftar));
}

function getTodayString() {
  return formatYMD(new Date());
}

function formatYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadTodayData() {
  const todayStr = getTodayString();
  const savedDate = localStorage.getItem(DATE_KEY);
  const tugas = getDaftarTugas();

  if (savedDate !== todayStr) {
    const data = new Array(tugas.length).fill(false);
    localStorage.setItem(DATE_KEY, todayStr);
    localStorage.setItem(STORAGE_KEY_TODAY, JSON.stringify(data));
    return data;
  }

  const saved = localStorage.getItem(STORAGE_KEY_TODAY);
  if (!saved) {
    const data = new Array(tugas.length).fill(false);
    localStorage.setItem(STORAGE_KEY_TODAY, JSON.stringify(data));
    return data;
  }

  let data = JSON.parse(saved);
  if (data.length !== tugas.length) {
    // sesuaikan panjang tanpa menghapus progres yang masih relevan
    const disesuaikan = new Array(tugas.length).fill(false);
    for (let i = 0; i < Math.min(data.length, tugas.length); i++) disesuaikan[i] = data[i];
    data = disesuaikan;
    localStorage.setItem(STORAGE_KEY_TODAY, JSON.stringify(data));
  }
  return data;
}

function saveTodayData(data) {
  localStorage.setItem(STORAGE_KEY_TODAY, JSON.stringify(data));
}

function getHistory() {
  const saved = localStorage.getItem(HISTORY_KEY);
  return saved ? JSON.parse(saved) : {};
}

function saveHistory(dateStr, data) {
  const history = getHistory();
  history[dateStr] = data;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ---------- Waktu & tugas aktif ----------

function parseRentangWaktu(teks) {
  const match = teks.match(/(\d{1,2})[.:](\d{2})\s*-\s*(\d{1,2})[.:](\d{2})/);
  if (!match) return null;
  return {
    mulai: parseInt(match[1], 10) * 60 + parseInt(match[2], 10),
    selesai: parseInt(match[3], 10) * 60 + parseInt(match[4], 10)
  };
}

function menitSekarang() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function cariIndexTugasAktif(tugas) {
  const menit = menitSekarang();
  for (let i = 0; i < tugas.length; i++) {
    const rentang = parseRentangWaktu(tugas[i]);
    if (!rentang) continue;
    if (rentang.selesai > rentang.mulai) {
      if (menit >= rentang.mulai && menit < rentang.selesai) return i;
    } else if (menit >= rentang.mulai || menit < rentang.selesai) {
      return i;
    }
  }
  return -1;
}

function pisahkanTeksTugas(teks) {
  const match = teks.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match && /\d{1,2}[.:]\d{2}/.test(match[2])) {
    return { judul: match[1].trim(), waktu: match[2].trim() };
  }
  return { judul: teks, waktu: null };
}

function perbaruiJam() {
  const el = document.getElementById('jamSekarang');
  const d = new Date();
  el.textContent = `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

// ---------- Render daftar tugas ----------

function renderList() {
  const tugas = getDaftarTugas();
  const data = loadTodayData();
  const listEl = document.getElementById('taskList');
  listEl.innerHTML = '';

  const indexAktif = cariIndexTugasAktif(tugas);

  data.forEach((selesai, index) => {
    if (index >= tugas.length) return;
    const { judul, waktu } = pisahkanTeksTugas(tugas[index]);

    const li = document.createElement('li');
    li.className = 'trail-node' + (selesai ? ' selesai' : '') + (index === indexAktif && !selesai ? ' aktif' : '');

    const marker = document.createElement('label');
    marker.className = 'node-marker';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selesai;
    checkbox.setAttribute('aria-label', judul);
    checkbox.addEventListener('change', () => onToggleTugas(index, checkbox.checked));

    const dot = document.createElement('span');
    dot.className = 'node-dot';

    marker.appendChild(checkbox);
    marker.appendChild(dot);

    const content = document.createElement('div');
    content.className = 'node-content';

    const label = document.createElement('span');
    label.className = 'node-label';
    label.textContent = judul;
    content.appendChild(label);

    if (waktu) {
      const chip = document.createElement('span');
      chip.className = 'node-waktu';
      chip.textContent = waktu;
      content.appendChild(chip);
    }

    if (index === indexAktif && !selesai) {
      const pill = document.createElement('span');
      pill.className = 'node-sekarang';
      pill.textContent = 'SEKARANG';
      content.appendChild(pill);
    }

    li.appendChild(marker);
    li.appendChild(content);
    listEl.appendChild(li);
  });

  perbaruiProgres(data);
}

function cekSelesaiSemua(data, tugas) {
  if (!tugas.length) return false;
  for (let i = 0; i < tugas.length; i++) {
    if (data[i] !== true) return false;
  }
  return true;
}

function onToggleTugas(index, checked) {
  const tugas = getDaftarTugas();
  const data = loadTodayData();
  const sebelumSelesaiSemua = cekSelesaiSemua(data, tugas);

  data[index] = checked;
  saveTodayData(data);
  saveHistory(getTodayString(), data);

  const sesudahSelesaiSemua = cekSelesaiSemua(data, tugas);

  if (checked) mainkanBunyiCentang();
  if (!sebelumSelesaiSemua && sesudahSelesaiSemua) rayakanSelesai();

  renderList();
  perbaruiRiwayat();
  perbaruiStatistik();
}

// ---------- Progres & pesan ----------

function perbaruiProgres(data) {
  const tugas = getDaftarTugas();
  const jumlahSelesai = data.filter((v, i) => i < tugas.length && v === true).length;
  const total = tugas.length;
  const persen = total === 0 ? 0 : Math.round((jumlahSelesai / total) * 100);

  const keliling = 2 * Math.PI * 52;
  const ring = document.getElementById('progressRing');
  ring.style.strokeDasharray = `${keliling}`;
  ring.style.strokeDashoffset = `${keliling * (1 - persen / 100)}`;

  document.getElementById('progressPercent').textContent = persen + '%';
  document.getElementById('statSelesai').textContent = `${jumlahSelesai}/${total}`;
  document.getElementById('pesanMotivasi').textContent = pesanUntukPersen(persen);
}

function pesanUntukPersen(p) {
  if (p === 0) return 'Langit masih gelap. Yuk mulai perjalanannya.';
  if (p < 50) return 'Bintang pertama sudah menyala.';
  if (p < 100) return 'Separuh jalan menuju langit penuh bintang.';
  return 'Jejak bintang malam ini lengkap ✨';
}

// ---------- Statistik & beruntun ----------

function selisihHari(tgl1, tgl2) {
  const d1 = new Date(tgl1 + 'T00:00:00');
  const d2 = new Date(tgl2 + 'T00:00:00');
  return Math.round((d2 - d1) / 86400000);
}

function hitungStatistik() {
  const tugas = getDaftarTugas();
  const history = getHistory();
  const tanggalList = Object.keys(history).sort();

  const hariTuntas = new Set();
  tanggalList.forEach(tgl => {
    const data = history[tgl];
    if (!Array.isArray(data) || tugas.length === 0) return;
    const jumlahBenar = data.filter((v, i) => i < tugas.length && v === true).length;
    if (jumlahBenar === tugas.length) hariTuntas.add(tgl);
  });

  // rekor terpanjang
  let terpanjang = 0, jalan = 0, tglSebelumnya = null;
  tanggalList.forEach(tgl => {
    if (!hariTuntas.has(tgl)) { jalan = 0; tglSebelumnya = null; return; }
    jalan = (tglSebelumnya && selisihHari(tglSebelumnya, tgl) === 1) ? jalan + 1 : 1;
    terpanjang = Math.max(terpanjang, jalan);
    tglSebelumnya = tgl;
  });

  // beruntun saat ini (mundur dari hari ini, atau kemarin jika hari ini belum tuntas)
  const todayStr = getTodayString();
  let streakSekarang = 0;
  const cursor = new Date();
  if (!hariTuntas.has(todayStr)) cursor.setDate(cursor.getDate() - 1);

  while (hariTuntas.has(formatYMD(cursor))) {
    streakSekarang += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { terpanjang, streakSekarang };
}

function perbaruiStatistik() {
  const s = hitungStatistik();
  document.getElementById('statStreak').textContent = s.streakSekarang;
  document.getElementById('statTerpanjang').textContent = s.terpanjang;
}

// ---------- Riwayat 7 hari ----------

function formatHari(tglStr) {
  const d = new Date(tglStr + 'T00:00:00');
  const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  return hari[d.getDay()];
}

function formatTanggalPendek(tglStr) {
  const parts = tglStr.split('-');
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${parts[2]} ${bulan[parseInt(parts[1], 10) - 1]}`;
}

function perbaruiRiwayat() {
  const tugas = getDaftarTugas();
  const history = getHistory();
  const chart = document.getElementById('historyChart');
  chart.innerHTML = '';

  const tanggalList = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    tanggalList.push(formatYMD(d));
  }

  const adaData = tanggalList.some(t => history[t]);
  if (!adaData) {
    chart.innerHTML = '<p class="no-history">Belum ada riwayat. Mulai centang tugas hari ini.</p>';
    return;
  }

  const todayStr = getTodayString();
  tanggalList.forEach(tgl => {
    const data = history[tgl];
    const jumlahSelesai = Array.isArray(data) ? data.filter((v, i) => i < tugas.length && v === true).length : 0;
    const persen = tugas.length > 0 ? Math.round((jumlahSelesai / tugas.length) * 100) : 0;

    const bar = document.createElement('div');
    bar.className = 'history-bar' + (persen === 100 ? ' penuh' : '') + (tgl === todayStr ? ' hari-ini' : '');
    bar.title = `${formatTanggalPendek(tgl)} • ${persen}%`;

    const isi = document.createElement('div');
    isi.className = 'history-bar-isi';
    isi.style.setProperty('--tinggi', persen + '%');
    bar.appendChild(isi);

    const label = document.createElement('span');
    label.className = 'history-bar-label';
    label.textContent = formatHari(tgl);
    bar.appendChild(label);

    chart.appendChild(bar);
  });
}

// ---------- Reset harian ----------

function resetHarian() {
  if (!confirm('Reset checklist untuk hari ini? Riwayat tidak akan hilang.')) return;
  const todayStr = getTodayString();
  const tugas = getDaftarTugas();
  const freshData = new Array(tugas.length).fill(false);
  localStorage.setItem(STORAGE_KEY_TODAY, JSON.stringify(freshData));
  saveHistory(todayStr, freshData);
  renderList();
  perbaruiRiwayat();
  perbaruiStatistik();
}

// ---------- Editor daftar tugas ----------

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bukaEditorTugas() {
  editorTugas = [...getDaftarTugas()];
  renderEditor();
  document.getElementById('editorModal').classList.add('terbuka');
}

function tutupEditor() {
  document.getElementById('editorModal').classList.remove('terbuka');
}

function renderEditor() {
  const container = document.getElementById('editorList');
  container.innerHTML = '';

  editorTugas.forEach((teks, idx) => {
    const div = document.createElement('div');
    div.className = 'task-edit-item';
    div.innerHTML = `
      <div class="reorder-col">
        <button type="button" class="btn-reorder" data-dir="-1" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''} aria-label="Naikkan urutan">▲</button>
        <button type="button" class="btn-reorder" data-dir="1" data-idx="${idx}" ${idx === editorTugas.length - 1 ? 'disabled' : ''} aria-label="Turunkan urutan">▼</button>
      </div>
      <input type="text" value="${escapeHtml(teks)}" data-idx="${idx}" class="input-tugas" aria-label="Nama tugas">
      <button type="button" class="btn-delete" data-idx="${idx}" aria-label="Hapus tugas">✕</button>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll('.btn-reorder').forEach(btn => {
    btn.addEventListener('click', () => {
      pindahTugas(parseInt(btn.dataset.idx, 10), parseInt(btn.dataset.dir, 10));
    });
  });
  container.querySelectorAll('.input-tugas').forEach(inp => {
    inp.addEventListener('input', () => {
      editorTugas[parseInt(inp.dataset.idx, 10)] = inp.value;
    });
  });
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => hapusTugas(parseInt(btn.dataset.idx, 10)));
  });
}

function pindahTugas(idx, dir) {
  const baru = idx + dir;
  if (baru < 0 || baru >= editorTugas.length) return;
  [editorTugas[idx], editorTugas[baru]] = [editorTugas[baru], editorTugas[idx]];
  renderEditor();
}

function tambahTugas() {
  editorTugas.push('');
  renderEditor();
  setTimeout(() => {
    const inputs = document.querySelectorAll('.input-tugas');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }, 0);
}

function hapusTugas(idx) {
  editorTugas.splice(idx, 1);
  renderEditor();
}

function simpanTugas() {
  const bersih = editorTugas.map(t => t.trim()).filter(t => t !== '');
  if (bersih.length === 0) {
    alert('Daftar tugas tidak boleh kosong.');
    return;
  }
  simpanDaftarTugas(bersih);
  const todayStr = getTodayString();
  const fresh = new Array(bersih.length).fill(false);
  localStorage.setItem(STORAGE_KEY_TODAY, JSON.stringify(fresh));
  localStorage.setItem(DATE_KEY, todayStr);
  saveHistory(todayStr, fresh);
  tutupEditor();
  renderList();
  perbaruiRiwayat();
  perbaruiStatistik();
}

// ---------- Suara ----------

function pastikanAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function mainkanBunyiCentang() {
  if (!suaraAktif) return;
  try {
    const ctx = pastikanAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(990, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) { /* abaikan jika audio tidak tersedia */ }
}

function mainkanBunyiRayakan() {
  if (!suaraAktif) return;
  try {
    const ctx = pastikanAudioCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const mulai = now + i * 0.08;
      gain.gain.setValueAtTime(0.0001, mulai);
      gain.gain.exponentialRampToValueAtTime(0.07, mulai + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, mulai + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(mulai);
      osc.stop(mulai + 0.65);
    });
  } catch (e) { /* abaikan jika audio tidak tersedia */ }
}

function toggleSuara() {
  suaraAktif = !suaraAktif;
  localStorage.setItem(SOUND_KEY, suaraAktif ? '1' : '0');
  perbaruiTombolSuara();
  if (suaraAktif) mainkanBunyiCentang();
}

function perbaruiTombolSuara() {
  const btn = document.getElementById('btnSuara');
  btn.textContent = suaraAktif ? '🔊 Bunyi' : '🔈 Bunyi';
  btn.classList.toggle('aktif', suaraAktif);
}

// ---------- Perayaan saat 100% ----------

function rayakanSelesai() {
  mainkanBunyiRayakan();

  const toast = document.getElementById('toastCelebrate');
  toast.textContent = '✨ Jejak bintang malam ini lengkap';
  toast.classList.add('tampil');
  setTimeout(() => toast.classList.remove('tampil'), 3200);

  const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (kurangiGerak) return;

  const wadah = document.querySelector('.progress-ring-wrap');
  if (!wadah) return;

  for (let i = 0; i < 14; i++) {
    const partikel = document.createElement('span');
    partikel.className = 'partikel-rayakan';
    const sudut = Math.random() * Math.PI * 2;
    const jarak = 55 + Math.random() * 50;
    partikel.style.setProperty('--dx', Math.cos(sudut) * jarak + 'px');
    partikel.style.setProperty('--dy', Math.sin(sudut) * jarak + 'px');
    partikel.style.left = '50%';
    partikel.style.top = '50%';
    partikel.style.background = Math.random() > 0.5 ? 'var(--gold)' : 'var(--magenta)';
    wadah.appendChild(partikel);
    partikel.addEventListener('animationend', () => partikel.remove());
  }
}

// ---------- Ekspor & impor cadangan ----------

function eksporData() {
  const paket = {
    versi: 1,
    diekspor: new Date().toISOString(),
    tugas: getDaftarTugas(),
    hariIni: {
      tanggal: localStorage.getItem(DATE_KEY),
      data: JSON.parse(localStorage.getItem(STORAGE_KEY_TODAY) || '[]')
    },
    riwayat: getHistory()
  };
  const blob = new Blob([JSON.stringify(paket, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jejak-bintang-cadangan-${getTodayString()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const paket = JSON.parse(e.target.result);
      if (!paket || !Array.isArray(paket.tugas) || typeof paket.riwayat !== 'object') {
        throw new Error('format tidak sesuai');
      }
      if (!confirm('Pulihkan data dari cadangan ini? Data saat ini akan ditimpa.')) return;

      simpanDaftarTugas(paket.tugas);
      if (paket.hariIni && paket.hariIni.tanggal) {
        localStorage.setItem(DATE_KEY, paket.hariIni.tanggal);
        localStorage.setItem(STORAGE_KEY_TODAY, JSON.stringify(paket.hariIni.data || []));
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(paket.riwayat));

      renderList();
      perbaruiRiwayat();
      perbaruiStatistik();
      alert('Data berhasil dipulihkan.');
    } catch (err) {
      alert('Gagal memulihkan data. Pastikan file cadangan valid.');
    }
  };
  reader.readAsText(file);
}

// ---------- Latar bintang ----------

function buatBintangLatar() {
  const wadah = document.getElementById('starfield');
  const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const lapisan = [
    { jumlah: 70, ukuran: 1, kelas: 'lapisan-jauh' },
    { jumlah: 40, ukuran: 2, kelas: 'lapisan-tengah' },
    { jumlah: 18, ukuran: 3, kelas: 'lapisan-dekat' }
  ];

  lapisan.forEach(l => {
    const div = document.createElement('div');
    div.className = 'lapisan-bintang ' + l.kelas;
    const bayangan = [];
    for (let i = 0; i < l.jumlah; i++) {
      const x = Math.round(Math.random() * 100);
      const y = Math.round(Math.random() * 100);
      bayangan.push(`${x}vw ${y}vh 0 rgba(232,234,245,${(0.4 + Math.random() * 0.6).toFixed(2)})`);
    }
    div.style.boxShadow = bayangan.join(',');
    div.style.width = l.ukuran + 'px';
    div.style.height = l.ukuran + 'px';
    wadah.appendChild(div);
  });

  if (!kurangiGerak) {
    setInterval(tembakkanBintangJatuh, 9000 + Math.random() * 6000);
  }
}

function tembakkanBintangJatuh() {
  const wadah = document.getElementById('starfield');
  const bintang = document.createElement('div');
  bintang.className = 'bintang-jatuh';
  bintang.style.top = (Math.random() * 40) + 'vh';
  bintang.style.left = (50 + Math.random() * 40) + 'vw';
  wadah.appendChild(bintang);
  bintang.addEventListener('animationend', () => bintang.remove());
}

// ---------- Inisialisasi ----------

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('tanggal').textContent = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  buatBintangLatar();
  perbaruiJam();
  renderList();
  perbaruiRiwayat();
  perbaruiStatistik();
  perbaruiTombolSuara();

  document.getElementById('btnReset').addEventListener('click', resetHarian);
  document.getElementById('btnEdit').addEventListener('click', bukaEditorTugas);
  document.getElementById('btnTutupEditor').addEventListener('click', tutupEditor);
  document.getElementById('btnTambahTugas').addEventListener('click', tambahTugas);
  document.getElementById('btnSimpanTugas').addEventListener('click', simpanTugas);
  document.getElementById('btnSuara').addEventListener('click', toggleSuara);
  document.getElementById('btnExport').addEventListener('click', eksporData);

  document.getElementById('importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importData(file);
    e.target.value = '';
  });

  document.getElementById('editorModal').addEventListener('click', e => {
    if (e.target.id === 'editorModal') tutupEditor();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') tutupEditor();
  });

  setInterval(perbaruiJam, 1000);
  setInterval(() => { renderList(); perbaruiRiwayat(); perbaruiStatistik(); }, 60000);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
