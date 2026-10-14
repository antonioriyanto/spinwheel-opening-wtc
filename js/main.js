import { appState, GOOGLE_APPS_SCRIPT_TEMPLATE, loadLocalState } from "./state.js";
import {
  setSyncStatus,
  syncFromGoogleSheets,
  saveGasUrlAndSync,
  pushInitialDataToSheets,
  handleSyncBadgeClick
} from "./api.js";
import {
  renderLedBulbs,
  triggerSpinFlow,
  closeDuplicateWaModal,
  confirmPrizeAndRecord
} from "./wheel.js";
import {
  setupEscapeKeyListener,
  toggleSound,
  handleRoleButtonClick,
  updateRoleUI,
  handleCustomerInputChange,
  switchMainTab,
  switchAdminSubTab,
  renderStaffView,
  refreshAllViews
} from "./ui.js";
import {
  closeAdminLoginModal,
  verifyAdminPin,
  logoutAdmin,
  renderAdminCustomerList,
  quickAdjustStock,
  openPrizeModal,
  closePrizeModal,
  savePrizeForm,
  deletePrizeItem,
  openCustomerModal,
  closeCustomerModal,
  saveCustomerForm,
  openDeleteCustomerModal,
  closeDeleteCustomerModal,
  confirmDeleteCustomer,
  exportCustomerCSV,
  copyAppsScriptCode,
  openChangePinModal,
  closeGenericConfirm
} from "./admin.js";

// Daftarkan fungsi ke objek window agar pemanggilan onclick/oninput di HTML berfungsi langsung
Object.assign(window, {
  toggleSound,
  handleSyncBadgeClick,
  handleRoleButtonClick,
  syncFromGoogleSheets,
  handleCustomerInputChange,
  triggerSpinFlow,
  renderStaffView,
  logoutAdmin,
  switchAdminSubTab,
  openPrizeModal,
  exportCustomerCSV,
  openCustomerModal,
  renderAdminCustomerList,
  saveGasUrlAndSync,
  pushInitialDataToSheets,
  openChangePinModal,
  copyAppsScriptCode,
  switchMainTab,
  confirmPrizeAndRecord,
  closeDuplicateWaModal,
  closeAdminLoginModal,
  verifyAdminPin,
  closePrizeModal,
  savePrizeForm,
  deletePrizeItem,
  quickAdjustStock,
  closeCustomerModal,
  saveCustomerForm,
  openDeleteCustomerModal,
  closeDeleteCustomerModal,
  confirmDeleteCustomer,
  closeGenericConfirm
});

window.addEventListener("DOMContentLoaded", () => {
  loadLocalState();
  setupEscapeKeyListener();

  const gasTextarea = document.getElementById("gasCodeTextarea");
  if (gasTextarea) {
    gasTextarea.value = GOOGLE_APPS_SCRIPT_TEMPLATE;
  }

  renderLedBulbs();
  updateRoleUI();
  refreshAllViews();

  if (appState.gasWebAppUrl) {
    syncFromGoogleSheets(false);
  } else {
    setSyncStatus("local", "Penyimpanan Lokal");
  }
});