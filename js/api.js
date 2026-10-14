import { appState, saveLocalState } from "./state.js";
import { guessIconType, showToast, refreshAllViews } from "./ui.js";

export function setSyncStatus(state, label, errorMessage = "") {
  const dot = document.getElementById("syncDot");
  const text = document.getElementById("syncText");
  const errorBanner = document.getElementById("globalErrorBanner");
  const errorText = document.getElementById("globalErrorText");

  appState.isSyncing = state === "loading";
  appState.hasSyncError = state === "error";

  if (text) text.textContent = label;
  if (dot) {
    if (state === "loading") {
      dot.className = "w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping";
    } else if (state === "live") {
      dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400";
    } else if (state === "error") {
      dot.className = "w-2.5 h-2.5 rounded-full bg-red-400";
    } else {
      dot.className = "w-2.5 h-2.5 rounded-full bg-[#f9e28c]";
    }
  }

  if (errorBanner) {
    if (state === "error") {
      errorBanner.classList.remove("hidden");
      errorBanner.classList.add("flex");
      if (errorText && errorMessage) errorText.textContent = errorMessage;
    } else {
      errorBanner.classList.add("hidden");
      errorBanner.classList.remove("flex");
    }
  }
}

export async function syncFromGoogleSheets(showNotification = false) {
  if (!appState.gasWebAppUrl) {
    setSyncStatus("local", "Penyimpanan Lokal");
    if (showNotification) {
      showToast("Data disegarkan dari memori lokal perangkat.", "info");
    }
    refreshAllViews();
    return;
  }

  try {
    setSyncStatus("loading", "Menyinkronkan...");
    refreshAllViews();
    const response = await fetch(appState.gasWebAppUrl + "?t=" + Date.now(), {
      method: "GET",
      redirect: "follow"
    });
    const data = await response.json();
    if (data && data.status === "ok") {
      if (Array.isArray(data.prizes) && data.prizes.length > 0) {
        appState.prizes = data.prizes.map(p => ({
          id_hadiah: String(p.id_hadiah || ""),
          nama_hadiah: String(p.nama_hadiah || ""),
          stok: Number(p.stok || 0),
          warna_sektor: String(p.warna_sektor || "#9E1316"),
          icon_type: String(p.icon_type || guessIconType(p.nama_hadiah)),
          url_gambar: String(p.url_gambar || "")
        }));
      }
      if (Array.isArray(data.customers)) {
        appState.customers = data.customers.map(c => ({
          id_transaksi: String(c.id_transaksi || ""),
          waktu_spin: String(c.waktu_spin || ""),
          nama_customer: String(c.nama_customer || ""),
          no_wa: String(c.no_wa || "").replace(/^'/, ""),
          hadiah_didapat: String(c.hadiah_didapat || "")
        })).reverse();
      }
      saveLocalState();
      setSyncStatus("live", "Sheets Terhubung");
      if (showNotification) showToast("Data berhasil disinkronkan dari Google Sheets.", "success");
      refreshAllViews();
    } else {
      throw new Error("Format respons Google Sheets tidak dikenali.");
    }
  } catch (err) {
    setSyncStatus("error", "Gangguan Sync", "Gagal membaca Google Sheets. Pastikan akses Web App diatur ke 'Siapa saja (Anyone)'.");
    refreshAllViews();
    if (showNotification) {
      showToast("Gagal terhubung ke Google Sheets.", "error");
    }
  }
}

export async function sendToGoogleSheets(payload) {
  saveLocalState();
  if (!appState.gasWebAppUrl) {
    setSyncStatus("local", "Penyimpanan Lokal");
    return false;
  }
  try {
    setSyncStatus("loading", "Menyimpan...");
    const response = await fetch(appState.gasWebAppUrl, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result && result.status === "ok") {
      setSyncStatus("live", "Tersimpan di Sheets");
      return true;
    }
    throw new Error(result?.message || "Kesalahan saat menulis ke Google Sheets");
  } catch (err) {
    setSyncStatus("error", "Sync Tertunda", "Transaksi tercatat di perangkat ini, namun pengiriman ke Google Sheets tertunda.");
    showToast("Tercatat di perangkat, namun gagal mengirim ke Google Sheets.", "error");
    return false;
  }
}

export async function syncFullStateToGoogleSheets(successMessage) {
  saveLocalState();
  refreshAllViews();
  if (appState.gasWebAppUrl) {
    const ok = await sendToGoogleSheets({
      action: "SYNC_ALL",
      prizes: appState.prizes,
      customers: [...appState.customers].reverse()
    });
    if (ok && successMessage) showToast(successMessage, "success");
  } else if (successMessage) {
    showToast(successMessage, "success");
  }
}

export function saveGasUrlAndSync() {
  const url = document.getElementById("inputGasUrl").value.trim();
  appState.gasWebAppUrl = url;
  saveLocalState();
  if (!url) {
    setSyncStatus("local", "Penyimpanan Lokal");
    showToast("Berjalan dalam mode Penyimpanan Lokal.", "info");
    return;
  }
  syncFromGoogleSheets(true);
}

export async function pushInitialDataToSheets() {
  const url = document.getElementById("inputGasUrl").value.trim();
  if (!url) {
    showToast("Masukkan URL Web App Google Apps Script terlebih dahulu.", "error");
    return;
  }
  appState.gasWebAppUrl = url;
  saveLocalState();
  await syncFullStateToGoogleSheets("Stok hadiah dan catatan pelanggan berhasil dikirim ke Google Sheets.");
}

export function handleSyncBadgeClick() {
  syncFromGoogleSheets(true);
}