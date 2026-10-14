import { appState, saveLocalState } from "./state.js";
import { syncFullStateToGoogleSheets } from "./api.js";
import {
  escapeHtml,
  normalizeWa,
  guessIconType,
  showToast,
  openModalElement,
  closeModalElement,
  updateRoleUI,
  switchMainTab
} from "./ui.js";

export function closeAdminLoginModal() {
  closeModalElement("modalAdminLogin");
}

export function verifyAdminPin() {
  const inputPin = document.getElementById("inputAdminPin").value.trim();
  if (inputPin === appState.adminPin) {
    appState.role = "admin";
    closeAdminLoginModal();
    updateRoleUI();
    switchMainTab("secondary");
    showToast("Mode Admin aktif.", "success");
  } else {
    document.getElementById("adminPinError").classList.remove("hidden");
  }
}

export function logoutAdmin() {
  appState.role = "staff";
  updateRoleUI();
  switchMainTab("spin");
  showToast("Kembali ke mode Karyawan Toko.", "info");
}

export function renderAdminViews() {
  renderAdminStockList();
  renderAdminCustomerList();
  document.getElementById("inputGasUrl").value = appState.gasWebAppUrl || "";
  document.getElementById("currentPinDisplay").textContent = appState.adminPin;
}

export function renderAdminStockList() {
  const container = document.getElementById("adminStockList");
  if (!container) return;

  const totalStock = appState.prizes.reduce((sum, p) => sum + Math.max(0, Number(p.stok)), 0);

  if (appState.prizes.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 px-4 bg-white rounded-[10px] border border-[#dcd3c6] text-xs text-[#524b44]">
        <div class="font-bold text-[#141210]">Daftar Hadiah Kosong</div>
        <p class="mt-1">Tekan tombol "Tambah Item" di atas untuk menambahkan hadiah ke roda spinwheel.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = appState.prizes.map(p => {
    const stokNum = Math.max(0, Number(p.stok));
    const probPct = totalStock > 0 ? ((stokNum / totalStock) * 100).toFixed(1) : "0.0";
    return `
      <div class="p-3 rounded-[10px] bg-white border border-[#dcd3c6] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-4 h-4 rounded-[4px] shrink-0 border border-black/25" style="background:${escapeHtml(p.warna_sektor)}"></span>
          <div class="min-w-0">
            <div class="text-xs sm:text-sm font-extrabold text-[#141210] truncate">${escapeHtml(p.nama_hadiah)}</div>
            <div class="font-mono-num text-[11px] font-semibold text-[#524b44]">
              Proporsi Peluang: <strong class="text-[#9e1316]">${probPct}%</strong>
              ${stokNum === 0 ? ' (Stok Habis)' : ''}
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#e4ddd3]">
          <div class="flex items-center gap-1">
            <button
              type="button"
              onclick="quickAdjustStock('${escapeHtml(p.id_hadiah)}', -1)"
              aria-label="Kurangi 1 stok ${escapeHtml(p.nama_hadiah)}"
              class="min-w-[44px] min-h-[44px] rounded-[8px] bg-[#f0ebe1] hover:bg-[#e4ddd3] text-[#141210] font-mono-num font-bold text-sm flex items-center justify-center"
            >
              -1
            </button>
            <span class="w-10 text-center font-mono-num text-sm font-extrabold text-[#141210]">${stokNum}</span>
            <button
              type="button"
              onclick="quickAdjustStock('${escapeHtml(p.id_hadiah)}', 1)"
              aria-label="Tambah 1 stok ${escapeHtml(p.nama_hadiah)}"
              class="min-w-[44px] min-h-[44px] rounded-[8px] bg-[#f0ebe1] hover:bg-[#e4ddd3] text-[#141210] font-mono-num font-bold text-sm flex items-center justify-center"
            >
              +1
            </button>
          </div>

          <div class="flex items-center gap-1">
            <button
              type="button"
              onclick="openPrizeModal('${escapeHtml(p.id_hadiah)}')"
              aria-label="Ubah hadiah ${escapeHtml(p.nama_hadiah)}"
              class="min-w-[44px] min-h-[44px] rounded-[8px] bg-amber-500/15 hover:bg-amber-500/25 text-[#8c620a] flex items-center justify-center text-xs font-bold"
            >
              <i class="fa-solid fa-pen" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              onclick="deletePrizeItem('${escapeHtml(p.id_hadiah)}')"
              aria-label="Hapus hadiah ${escapeHtml(p.nama_hadiah)}"
              class="min-w-[44px] min-h-[44px] rounded-[8px] bg-[#9e1316]/15 hover:bg-[#9e1316]/25 text-[#9e1316] flex items-center justify-center text-xs font-bold"
            >
              <i class="fa-solid fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

export function renderAdminCustomerList() {
  const container = document.getElementById("adminCustomerList");
  if (!container) return;

  const query = (document.getElementById("adminCustomerSearch")?.value || "").toLowerCase().trim();
  const filtered = appState.customers.filter(c =>
    c.nama_customer.toLowerCase().includes(query) ||
    c.no_wa.toLowerCase().includes(query) ||
    c.hadiah_didapat.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 px-4 bg-white rounded-[10px] border border-[#dcd3c6] text-xs text-[#524b44]">
        <div class="font-bold text-[#141210]">Belum Ada Data Pelanggan</div>
        <p class="mt-1">Data pelanggan akan muncul secara otomatis setelah klaim hadiah atau melalui tombol "Input Manual".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(c => `
    <div class="p-3 rounded-[10px] bg-white border border-[#dcd3c6] flex items-center justify-between gap-2">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs sm:text-sm font-extrabold text-[#141210] truncate">${escapeHtml(c.nama_customer)}</span>
          <span class="px-2 py-0.5 rounded-[6px] bg-[#9e1316]/10 text-[#9e1316] text-[11px] font-extrabold">
            ${escapeHtml(c.hadiah_didapat)}
          </span>
        </div>
        <div class="font-mono-num text-[11px] text-[#524b44] font-semibold mt-1">
          WA: ${escapeHtml(c.no_wa)} | ${escapeHtml(c.waktu_spin)}
        </div>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onclick="openCustomerModal('${escapeHtml(c.id_transaksi)}')"
          aria-label="Ubah data pelanggan ${escapeHtml(c.nama_customer)}"
          class="min-w-[44px] min-h-[44px] rounded-[8px] bg-amber-500/15 hover:bg-amber-500/25 text-[#8c620a] flex items-center justify-center text-xs"
        >
          <i class="fa-solid fa-pen" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          onclick="openDeleteCustomerModal('${escapeHtml(c.id_transaksi)}')"
          aria-label="Hapus data pelanggan ${escapeHtml(c.nama_customer)}"
          class="min-w-[44px] min-h-[44px] rounded-[8px] bg-[#9e1316]/15 hover:bg-[#9e1316]/25 text-[#9e1316] flex items-center justify-center text-xs"
        >
          <i class="fa-solid fa-trash" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `).join("");
}

export async function quickAdjustStock(prizeId, delta) {
  const item = appState.prizes.find(p => String(p.id_hadiah) === String(prizeId));
  if (!item) return;
  item.stok = Math.max(0, Number(item.stok) + delta);
  await syncFullStateToGoogleSheets();
}

export function openPrizeModal(prizeId = "") {
  const titleEl = document.getElementById("modalPrizeTitle");
  const idInput = document.getElementById("prizeFormId");
  const nameInput = document.getElementById("prizeFormName");
  const stockInput = document.getElementById("prizeFormStock");
  const colorInput = document.getElementById("prizeFormColor");
  const iconInput = document.getElementById("prizeFormIconType");
  const imgInput = document.getElementById("prizeFormImageUrl");

  if (prizeId) {
    const item = appState.prizes.find(p => String(p.id_hadiah) === String(prizeId));
    if (!item) return;
    titleEl.textContent = "Ubah Detail Hadiah";
    idInput.value = item.id_hadiah;
    nameInput.value = item.nama_hadiah;
    stockInput.value = item.stok;
    colorInput.value = item.warna_sektor || "#9E1316";
    iconInput.value = item.icon_type || guessIconType(item.nama_hadiah);
    imgInput.value = item.url_gambar || "";
  } else {
    titleEl.textContent = "Tambah Item Hadiah";
    idInput.value = "";
    nameInput.value = "";
    stockInput.value = 10;
    colorInput.value = "#9E1316";
    iconInput.value = "gift";
    imgInput.value = "";
  }

  openModalElement("modalPrizeCrud");
}

export function closePrizeModal() {
  closeModalElement("modalPrizeCrud");
}

export async function savePrizeForm() {
  const id = document.getElementById("prizeFormId").value.trim();
  const nama = document.getElementById("prizeFormName").value.trim();
  const stok = Math.max(0, Number(document.getElementById("prizeFormStock").value || 0));
  const warna = document.getElementById("prizeFormColor").value;
  const iconType = document.getElementById("prizeFormIconType").value;
  const urlGambar = document.getElementById("prizeFormImageUrl").value.trim();

  if (!nama) {
    showToast("Nama hadiah wajib diisi.", "error");
    return;
  }

  if (id) {
    const existing = appState.prizes.find(p => String(p.id_hadiah) === String(id));
    if (existing) {
      existing.nama_hadiah = nama;
      existing.stok = stok;
      existing.warna_sektor = warna;
      existing.icon_type = iconType;
      existing.url_gambar = urlGambar;
    }
  } else {
    appState.prizes.push({
      id_hadiah: "GIFT-" + Date.now().toString().slice(-4),
      nama_hadiah: nama,
      stok,
      warna_sektor: warna,
      icon_type: iconType,
      url_gambar: urlGambar
    });
  }

  closePrizeModal();
  await syncFullStateToGoogleSheets("Data hadiah berhasil disimpan.");
}

export function deletePrizeItem(prizeId) {
  const target = appState.prizes.find(p => String(p.id_hadiah) === String(prizeId));
  if (!target) return;
  openGenericConfirm(
    "Hapus Item Hadiah?",
    `Hapus "${target.nama_hadiah}" dari daftar stok hadiah toko?`,
    false,
    "",
    async () => {
      appState.prizes = appState.prizes.filter(p => String(p.id_hadiah) !== String(prizeId));
      await syncFullStateToGoogleSheets(`Item "${target.nama_hadiah}" telah dihapus.`);
    }
  );
}

export function openCustomerModal(trxId = "") {
  const titleEl = document.getElementById("modalCustomerTitle");
  const idInput = document.getElementById("custFormId");
  const nameInput = document.getElementById("custFormName");
  const waInput = document.getElementById("custFormWa");
  const prizeSelect = document.getElementById("custFormPrize");

  const prizeNames = appState.prizes.map(p => p.nama_hadiah);
  prizeSelect.innerHTML = prizeNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");

  if (trxId) {
    const cust = appState.customers.find(c => String(c.id_transaksi) === String(trxId));
    if (!cust) return;
    titleEl.textContent = "Ubah Catatan Pelanggan";
    idInput.value = cust.id_transaksi;
    nameInput.value = cust.nama_customer;
    waInput.value = cust.no_wa;
    if (!prizeNames.includes(cust.hadiah_didapat)) {
      prizeSelect.innerHTML += `<option value="${escapeHtml(cust.hadiah_didapat)}">${escapeHtml(cust.hadiah_didapat)}</option>`;
    }
    prizeSelect.value = cust.hadiah_didapat;
  } else {
    titleEl.textContent = "Input Manual Data Pelanggan";
    idInput.value = "";
    nameInput.value = "";
    waInput.value = "";
  }

  openModalElement("modalCustomerCrud");
}

export function closeCustomerModal() {
  closeModalElement("modalCustomerCrud");
}

export async function saveCustomerForm() {
  const id = document.getElementById("custFormId").value.trim();
  const nama = document.getElementById("custFormName").value.trim();
  const wa = normalizeWa(document.getElementById("custFormWa").value);
  const hadiah = document.getElementById("custFormPrize").value;

  if (!nama || wa.length < 8) {
    showToast("Nama dan nomor WhatsApp wajib diisi dengan benar.", "error");
    return;
  }

  if (id) {
    const cust = appState.customers.find(c => String(c.id_transaksi) === String(id));
    if (cust) {
      cust.nama_customer = nama;
      cust.no_wa = wa;
      cust.hadiah_didapat = hadiah;
    }
  } else {
    appState.customers.unshift({
      id_transaksi: "TRX-" + Date.now().toString().slice(-6),
      waktu_spin: new Date().toLocaleString("id-ID"),
      nama_customer: nama,
      no_wa: wa,
      hadiah_didapat: hadiah
    });
  }

  closeCustomerModal();
  await syncFullStateToGoogleSheets("Catatan pelanggan berhasil disimpan.");
}

export function openDeleteCustomerModal(trxId) {
  const cust = appState.customers.find(c => String(c.id_transaksi) === String(trxId));
  if (!cust) return;
  appState.deleteTargetCustomerId = trxId;
  document.getElementById("deleteCustomerText").innerHTML =
    `Hapus catatan klaim <strong>${escapeHtml(cust.nama_customer)}</strong> (<span class="font-mono-num">${escapeHtml(cust.no_wa)}</span>) untuk hadiah <strong>${escapeHtml(cust.hadiah_didapat)}</strong>?`;
  document.getElementById("chkRestoreStock").checked = true;
  openModalElement("modalDeleteCustomer");
}

export function closeDeleteCustomerModal() {
  closeModalElement("modalDeleteCustomer");
  appState.deleteTargetCustomerId = null;
}

export async function confirmDeleteCustomer() {
  const trxId = appState.deleteTargetCustomerId;
  const cust = appState.customers.find(c => String(c.id_transaksi) === String(trxId));
  if (!cust) {
    closeDeleteCustomerModal();
    return;
  }

  const restoreStock = document.getElementById("chkRestoreStock").checked;
  if (restoreStock) {
    const prizeObj = appState.prizes.find(
      p => p.nama_hadiah.toLowerCase() === cust.hadiah_didapat.toLowerCase()
    );
    if (prizeObj) {
      prizeObj.stok = Number(prizeObj.stok) + 1;
    }
  }

  appState.customers = appState.customers.filter(c => String(c.id_transaksi) !== String(trxId));
  closeDeleteCustomerModal();
  await syncFullStateToGoogleSheets(
    restoreStock
      ? `Catatan dihapus dan +1 unit "${cust.hadiah_didapat}" dikembalikan ke stok.`
      : "Catatan pelanggan telah dihapus."
  );
}

export function exportCustomerCSV() {
  if (appState.customers.length === 0) {
    showToast("Belum ada catatan pelanggan untuk diunduh.", "error");
    return;
  }
  const headers = ["ID_Transaksi", "Waktu_Spin", "Nama_Customer", "No_WhatsApp", "Hadiah_Didapat"];
  const rows = appState.customers.map(c => [
    `"${String(c.id_transaksi).replace(/"/g, '""')}"`,
    `"${String(c.waktu_spin).replace(/"/g, '""')}"`,
    `"${String(c.nama_customer).replace(/"/g, '""')}"`,
    `"'${String(c.no_wa).replace(/"/g, '""')}"`,
    `"${String(c.hadiah_didapat).replace(/"/g, '""')}"`
  ]);
  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Laporan_Spinwheel_WatchClub_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast("Laporan CSV berhasil diunduh.", "success");
}

export function copyAppsScriptCode() {
  const textarea = document.getElementById("gasCodeTextarea");
  textarea.select();
  textarea.setSelectionRange(0, 99999);
  try {
    document.execCommand("copy");
    showToast("Kode Google Apps Script berhasil disalin.", "success");
  } catch (e) {
    showToast("Silakan salin manual dari kotak kode.", "info");
  }
}

export function openChangePinModal() {
  openGenericConfirm(
    "Ubah PIN Admin Toko",
    "Masukkan PIN baru untuk akses Admin (minimal 4 karakter):",
    true,
    appState.adminPin,
    (newVal) => {
      if (!newVal || newVal.trim().length < 4) {
        showToast("PIN harus terdiri dari minimal 4 karakter.", "error");
        return;
      }
      appState.adminPin = newVal.trim();
      saveLocalState();
      renderAdminViews();
      showToast("PIN Admin berhasil diperbarui.", "success");
    }
  );
}

export function openGenericConfirm(title, message, showInput, defaultVal, onConfirm) {
  document.getElementById("genericConfirmTitle").textContent = title;
  document.getElementById("genericConfirmMessage").textContent = message;
  const inputContainer = document.getElementById("genericInputContainer");
  const inputEl = document.getElementById("genericConfirmInput");

  if (showInput) {
    inputContainer.classList.remove("hidden");
    inputEl.value = defaultVal || "";
  } else {
    inputContainer.classList.add("hidden");
  }

  const btnOk = document.getElementById("btnGenericConfirmOk");
  btnOk.onclick = () => {
    const val = inputEl.value;
    closeGenericConfirm();
    if (onConfirm) onConfirm(val);
  };

  openModalElement("modalGenericConfirm");
}

export function closeGenericConfirm() {
  closeModalElement("modalGenericConfirm");
}