import { appState, getAvailablePrizes } from "./state.js";
import { drawSpinWheel } from "./wheel.js";
import { renderAdminViews } from "./admin.js";

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function normalizeWa(raw) {
  return String(raw || "").replace(/[^0-9]/g, "");
}

export function guessIconType(name = "") {
  const n = name.toLowerCase();
  if (n.includes("tumbler") || n.includes("botol") || n.includes("garmin") || n.includes("reebok")) return "tumbler";
  if (n.includes("lap") || n.includes("cloth") || n.includes("kain")) return "cloth";
  if (n.includes("jam") || n.includes("watch")) return "watch";
  if (n.includes("payung") || n.includes("umbrella")) return "umbrella";
  if (n.includes("pouch") || n.includes("tas") || n.includes("serut")) return "pouch";
  if (n.includes("key") || n.includes("gantungan")) return "keychain";
  if (n.includes("pen") || n.includes("pulpen")) return "pen";
  return "gift";
}

export function getPrizeSvgThumb(iconType) {
  const icons = {
    tumbler: `<i class="fa-solid fa-bottle-water text-2xl text-[#9e1316]" aria-hidden="true"></i>`,
    watch: `<i class="fa-regular fa-clock text-2xl text-[#141210]" aria-hidden="true"></i>`,
    umbrella: `<i class="fa-solid fa-umbrella text-2xl text-[#141210]" aria-hidden="true"></i>`,
    pouch: `<i class="fa-solid fa-bag-shopping text-2xl text-[#8c620a]" aria-hidden="true"></i>`,
    keychain: `<i class="fa-solid fa-key text-2xl text-[#141210]" aria-hidden="true"></i>`,
    pen: `<i class="fa-solid fa-pen-nib text-2xl text-[#141210]" aria-hidden="true"></i>`,
    cloth: `<i class="fa-solid fa-layer-group text-2xl text-[#8c620a]" aria-hidden="true"></i>`,
    gift: `<i class="fa-solid fa-box-open text-2xl text-[#9e1316]" aria-hidden="true"></i>`
  };
  return icons[iconType] || icons.gift;
}

export function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  const bgClass =
    type === "success"
      ? "bg-emerald-900 border-emerald-400"
      : type === "error"
      ? "bg-[#7a0c0e] border-[#f9e28c]"
      : "bg-[#141210] border-[#dfb136]";
  toast.className = `${bgClass} border text-white text-xs font-bold px-3.5 py-2.5 rounded-[10px] shadow-xl flex items-center gap-2 transition-opacity duration-300`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check text-emerald-300' : type === 'error' ? 'fa-triangle-exclamation text-[#f9e28c]' : 'fa-circle-info text-[#f9e28c]'}" aria-hidden="true"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function openModalElement(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("hidden");
  el.classList.add("flex");
}

export function closeModalElement(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("hidden");
  el.classList.remove("flex");
}

export function setupEscapeKeyListener() {
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      const closeableModals = [
        "modalDuplicateWa",
        "modalAdminLogin",
        "modalPrizeCrud",
        "modalCustomerCrud",
        "modalDeleteCustomer",
        "modalGenericConfirm"
      ];
      closeableModals.forEach(id => {
        const modal = document.getElementById(id);
        if (modal && !modal.classList.contains("hidden")) {
          closeModalElement(id);
        }
      });
    }
  });
}

export function toggleSound() {
  appState.soundEnabled = !appState.soundEnabled;
  const icon = document.getElementById("iconSound");
  icon.className = appState.soundEnabled
    ? "fa-solid fa-volume-high text-sm text-[#f9e28c]"
    : "fa-solid fa-volume-xmark text-sm text-white/50";
  showToast(appState.soundEnabled ? "Suara detak roda diaktifkan" : "Suara detak roda dibisukan", "info");
}

export function handleRoleButtonClick() {
  if (appState.role === "admin") {
    switchMainTab("secondary");
  } else {
    document.getElementById("inputAdminPin").value = "";
    document.getElementById("adminPinError").classList.add("hidden");
    openModalElement("modalAdminLogin");
    setTimeout(() => document.getElementById("inputAdminPin").focus(), 80);
  }
}

export function updateRoleUI() {
  const roleLabel = document.getElementById("roleLabel");
  const roleIcon = document.getElementById("roleIcon");
  const roleIconBox = document.getElementById("roleIconBox");
  const navSecondaryTitle = document.getElementById("navSecondaryTitle");
  const navSecondarySub = document.getElementById("navSecondarySub");

  if (appState.role === "admin") {
    roleLabel.textContent = "Admin Toko";
    roleIcon.className = "fa-solid fa-user-shield";
    roleIconBox.className = "w-7 h-7 rounded-[6px] bg-amber-500/20 text-[#8c620a] flex items-center justify-center text-xs";
    navSecondaryTitle.textContent = "Kelola Toko";
    navSecondarySub.textContent = "Stok, Pelanggan & Sheets";
  } else {
    roleLabel.textContent = "Karyawan Toko";
    roleIcon.className = "fa-solid fa-id-badge";
    roleIconBox.className = "w-7 h-7 rounded-[6px] bg-[#9e1316]/15 text-[#9e1316] flex items-center justify-center text-xs";
    navSecondaryTitle.textContent = "Stok & Riwayat";
    navSecondarySub.textContent = "Catatan Hanya-Lihat";
  }
}

export function handleCustomerInputChange() {
  if (appState.isSpinning) return;
  appState.duplicateWaConfirmed = false;

  const nama = document.getElementById("inputNama").value.trim();
  const wa = normalizeWa(document.getElementById("inputWa").value);
  const activePrizes = getAvailablePrizes();

  const isValid = nama.length >= 2 && wa.length >= 9 && activePrizes.length > 0;

  const btnCenter = document.getElementById("btnCenterSpin");
  const btnBottom = document.getElementById("btnBottomSpin");
  const centerSub = document.getElementById("centerHubSubtext");
  const bottomIcon = document.getElementById("bottomSpinIcon");
  const bottomText = document.getElementById("bottomSpinText");
  const lockBadge = document.getElementById("customerLockBadge");
  const helper = document.getElementById("inputHelperText");

  btnCenter.disabled = !isValid;
  btnBottom.disabled = !isValid;

  if (activePrizes.length === 0) {
    helper.className = "mt-2.5 text-xs text-[#9e1316] bg-red-50 border border-red-300 rounded-[8px] px-3 py-2 flex items-center gap-2 font-semibold";
    helper.innerHTML = `<i class="fa-solid fa-circle-exclamation text-[#9e1316]" aria-hidden="true"></i><span>Seluruh stok hadiah saat ini habis (0 unit). Silakan isi stok pada menu Admin.</span>`;
    bottomText.textContent = "Stok Hadiah Habis";
    lockBadge.classList.add("hidden");
    return;
  }

  if (isValid) {
    centerSub.textContent = "Siap";
    bottomIcon.className = "fa-solid fa-play text-sm";
    bottomText.textContent = "Kunci Data & Putar Roda";
    lockBadge.classList.remove("hidden");

    const prevRecord = appState.customers.find(c => normalizeWa(c.no_wa) === wa);
    if (prevRecord) {
      helper.className = "mt-2.5 text-xs text-amber-950 bg-amber-100 border border-amber-400 rounded-[8px] px-3 py-2 flex items-center gap-2 font-medium";
      helper.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-800" aria-hidden="true"></i><span>Nomor WA ini sudah tercatat menerima <strong>${escapeHtml(prevRecord.hadiah_didapat)}</strong>. Konfirmasi akan diminta saat tombol ditekan.</span>`;
    } else {
      helper.className = "mt-2.5 text-xs text-emerald-950 bg-emerald-100 border border-emerald-400 rounded-[8px] px-3 py-2 flex items-center gap-2 font-medium";
      helper.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-800" aria-hidden="true"></i><span>Data pelanggan valid. Silakan persilakan pelanggan menekan tombol <strong>PUTAR</strong>.</span>`;
    }
  } else {
    centerSub.textContent = "Terkunci";
    bottomIcon.className = "fa-solid fa-lock text-sm";
    bottomText.textContent = "Isi Data Pelanggan Dahulu";
    lockBadge.classList.add("hidden");
    helper.className = "mt-2.5 text-xs text-[#524b44] bg-[#f0ebe1] border border-[#dcd3c6] rounded-[8px] px-3 py-2 flex items-center gap-2";
    helper.innerHTML = `<i class="fa-solid fa-lock text-[#9e1316]" aria-hidden="true"></i><span>Masukkan nama (minimal 2 huruf) dan nomor WhatsApp (minimal 9 digit) untuk membuka kunci roda.</span>`;
  }
}

export function switchMainTab(tab) {
  appState.activeMainTab = tab;
  const viewSpin = document.getElementById("viewSpinWheel");
  const viewStaff = document.getElementById("viewStaffHistory");
  const viewAdmin = document.getElementById("viewAdminDashboard");
  const navSpin = document.getElementById("navTabSpin");
  const navSec = document.getElementById("navTabSecondary");

  const activeNavClass = "min-h-[60px] py-2 px-3 flex flex-col items-center justify-center bg-[#faf7f2] text-[#9e1316] border-t-4 border-[#9e1316] transition";
  const inactiveNavClass = "min-h-[60px] py-2 px-3 flex flex-col items-center justify-center bg-[#ece6dc] text-[#524b44] border-t-4 border-transparent hover:bg-[#faf7f2] transition";

  if (tab === "spin") {
    viewSpin.classList.remove("hidden");
    viewStaff.classList.add("hidden");
    viewAdmin.classList.add("hidden");
    navSpin.className = activeNavClass;
    navSec.className = inactiveNavClass;
    drawSpinWheel();
  } else {
    viewSpin.classList.add("hidden");
    if (appState.role === "admin") {
      viewAdmin.classList.remove("hidden");
      viewAdmin.classList.add("flex");
      viewStaff.classList.add("hidden");
      renderAdminViews();
    } else {
      viewStaff.classList.remove("hidden");
      viewStaff.classList.add("flex");
      viewAdmin.classList.add("hidden");
      renderStaffView();
    }
    navSec.className = activeNavClass;
    navSpin.className = inactiveNavClass;
  }
}

export function switchAdminSubTab(subTab) {
  appState.activeAdminSubTab = subTab;
  const btnStock = document.getElementById("adminSubTabStock");
  const btnCust = document.getElementById("adminSubTabCustomer");
  const btnSheets = document.getElementById("adminSubTabSheets");

  const panelStock = document.getElementById("adminPanelStock");
  const panelCust = document.getElementById("adminPanelCustomer");
  const panelSheets = document.getElementById("adminPanelSheets");

  const activeClass = "min-h-[44px] px-2 rounded-[8px] text-xs font-extrabold bg-[#faf7f2] text-[#9e1316] transition";
  const inactiveClass = "min-h-[44px] px-2 rounded-[8px] text-xs font-bold text-white/85 hover:text-white transition";

  btnStock.className = subTab === "stock" ? activeClass : inactiveClass;
  btnCust.className = subTab === "customer" ? activeClass : inactiveClass;
  btnSheets.className = subTab === "sheets" ? activeClass : inactiveClass;

  panelStock.classList.toggle("hidden", subTab !== "stock");
  panelCust.classList.toggle("hidden", subTab !== "customer");
  panelSheets.classList.toggle("hidden", subTab !== "sheets");

  renderAdminViews();
}

export function renderStaffView() {
  const stockGrid = document.getElementById("staffStockGrid");
  if (!stockGrid) return;
  const totalStock = appState.prizes.reduce((acc, p) => acc + Math.max(0, Number(p.stok)), 0);
  document.getElementById("staffTotalStockBadge").textContent = `Total: ${totalStock} Unit`;

  if (appState.isSyncing) {
    stockGrid.innerHTML = `<div class="col-span-2 py-6 text-center text-xs font-semibold text-[#524b44]"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Memuat data stok hadiah...</div>`;
  } else if (appState.prizes.length === 0) {
    stockGrid.innerHTML = `<div class="col-span-2 py-6 text-center text-xs font-semibold text-[#524b44]">Belum ada daftar hadiah yang terdaftar.</div>`;
  } else {
    stockGrid.innerHTML = appState.prizes.map(p => {
      const isOut = Number(p.stok) <= 0;
      return `
        <div class="p-3 rounded-[10px] border ${isOut ? 'bg-[#f0ebe1] border-[#dcd3c6]' : 'bg-white border-[#dcd3c6]'} flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-3.5 h-3.5 rounded-[4px] shrink-0 border border-black/20" style="background:${escapeHtml(p.warna_sektor)}"></span>
            <div class="truncate">
              <div class="text-xs font-extrabold text-[#141210] truncate">${escapeHtml(p.nama_hadiah)}</div>
              <div class="text-[11px] font-semibold ${isOut ? 'text-[#9e1316]' : 'text-[#524b44]'}">
                ${isOut ? 'Stok Habis' : 'Aktif di Roda'}
              </div>
            </div>
          </div>
          <span class="font-mono-num px-2.5 py-1 rounded-[6px] text-xs font-bold ${isOut ? 'bg-[#9e1316]/15 text-[#9e1316]' : 'bg-emerald-900/15 text-emerald-950'}">
            ${Number(p.stok)}
          </span>
        </div>
      `;
    }).join("");
  }

  const query = (document.getElementById("staffSearchInput")?.value || "").toLowerCase().trim();
  const filtered = appState.customers.filter(c =>
    c.nama_customer.toLowerCase().includes(query) ||
    c.no_wa.toLowerCase().includes(query) ||
    c.hadiah_didapat.toLowerCase().includes(query)
  );

  document.getElementById("staffTotalCustomerBadge").textContent = `${filtered.length} Transaksi`;
  const listEl = document.getElementById("staffHistoryList");

  if (appState.isSyncing) {
    listEl.innerHTML = `
      <div class="text-center py-8 text-xs font-semibold text-[#524b44]">
        <i class="fa-solid fa-spinner animate-spin text-lg mb-2 block text-[#9e1316]" aria-hidden="true"></i>
        Sedang memuat riwayat pelanggan...
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-8 px-4 bg-white rounded-[10px] border border-[#dcd3c6] text-xs text-[#524b44]">
        <i class="fa-regular fa-clipboard text-xl mb-2 block text-[#9e1316]" aria-hidden="true"></i>
        <div class="font-bold text-[#141210]">Belum Ada Catatan Transaksi</div>
        <p class="mt-1">Pelanggan yang selesai memutar roda hadiah akan langsung tercatat di daftar ini.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map(c => `
    <div class="p-3 rounded-[10px] bg-white border border-[#dcd3c6] flex items-center justify-between gap-2">
      <div class="min-w-0">
        <div class="text-xs font-extrabold text-[#141210] truncate">${escapeHtml(c.nama_customer)}</div>
        <div class="font-mono-num text-[11px] font-semibold text-[#524b44] mt-0.5">
          WA: ${escapeHtml(c.no_wa)} (${escapeHtml(c.waktu_spin)})
        </div>
      </div>
      <span class="shrink-0 px-2.5 py-1 rounded-[6px] bg-[#9e1316]/10 border border-[#9e1316]/25 text-[#9e1316] text-xs font-extrabold">
        ${escapeHtml(c.hadiah_didapat)}
      </span>
    </div>
  `).join("");
}

export function refreshAllViews() {
  drawSpinWheel();
  handleCustomerInputChange();
  renderStaffView();
  if (appState.role === "admin") {
    renderAdminViews();
  }
}