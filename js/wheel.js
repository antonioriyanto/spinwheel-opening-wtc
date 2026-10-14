import { appState, saveLocalState, getAvailablePrizes } from "./state.js";
import { playTickSound, playWinFanfare } from "./audio.js";
import { startConfettiCelebration, stopConfettiCelebration } from "./confetti.js";
import { sendToGoogleSheets } from "./api.js";
import {
  escapeHtml,
  normalizeWa,
  guessIconType,
  getPrizeSvgThumb,
  showToast,
  openModalElement,
  closeModalElement,
  handleCustomerInputChange,
  refreshAllViews
} from "./ui.js";

export function renderLedBulbs() {
  const container = document.getElementById("wheelLedContainer");
  if (!container) return;
  container.innerHTML = "";
  const bulbCount = 24;
  for (let i = 0; i < bulbCount; i++) {
    const angleDeg = (i * 360) / bulbCount;
    const bulb = document.createElement("div");
    bulb.className = "led-bulb absolute w-2 h-2 rounded-full transition-colors duration-200";
    const rad = (angleDeg * Math.PI) / 180;
    const leftPct = 50 + 47.4 * Math.cos(rad);
    const topPct = 50 + 47.4 * Math.sin(rad);
    bulb.style.left = `${leftPct}%`;
    bulb.style.top = `${topPct}%`;
    bulb.style.transform = "translate(-50%, -50%)";
    bulb.dataset.index = i;
    container.appendChild(bulb);
  }
  updateLedAnimation(0);
}

export function updateLedAnimation(tick) {
  const bulbs = document.querySelectorAll(".led-bulb");
  bulbs.forEach((b, idx) => {
    const isLit = (idx + tick) % 2 === 0;
    b.style.backgroundColor = isLit ? "#FAF7F2" : "#5A3E04";
  });
}

export function drawSpinWheel() {
  const canvas = document.getElementById("spinWheelCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = width / 2 - 4;

  ctx.clearRect(0, 0, width, height);

  const activePrizes = getAvailablePrizes();
  const totalUnits = activePrizes.reduce((acc, item) => acc + Number(item.stok), 0);

  const countText = document.getElementById("activePrizeCountText");
  const unitsText = document.getElementById("activeTotalUnitsText");
  if (countText) countText.textContent = activePrizes.length;
  if (unitsText) unitsText.textContent = totalUnits;

  if (activePrizes.length === 0) {
    ctx.fillStyle = "#141210";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#F9E28C";
    ctx.font = "800 26px Archivo, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STOK HADIAH HABIS", cx, cy - 10);
    ctx.fillStyle = "#FAF7F2";
    ctx.font = "600 18px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Silakan tambah stok di menu Admin", cx, cy + 22);
    return;
  }

  const sliceAngle = (Math.PI * 2) / activePrizes.length;

  activePrizes.forEach((prize, index) => {
    const startAngle = appState.wheelAngle + index * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();

    const baseColor = prize.warna_sektor || (index % 3 === 0 ? "#9E1316" : index % 3 === 1 ? "#E4B842" : "#141210");
    ctx.fillStyle = baseColor;
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#FAF7F2";
    ctx.stroke();

    ctx.translate(cx, cy);
    ctx.rotate(startAngle + sliceAngle / 2);

    const upperColor = baseColor.toUpperCase();
    const isLightSlice =
      upperColor === "#E4B842" ||
      upperColor === "#FBC02D" ||
      upperColor === "#FFD700" ||
      upperColor === "#FAF7F2" ||
      upperColor === "#FFFFFF";
    const textColor = isLightSlice ? "#141210" : "#FAF7F2";

    const labelText = String(prize.nama_hadiah || "").trim();
    const maxRadialWidth = 170;
    let fontSize = 30;
    ctx.font = `800 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;

    while (ctx.measureText(labelText).width > maxRadialWidth && fontSize > 15) {
      fontSize -= 1;
      ctx.font = `800 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
    }

    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, 186, 0);

    ctx.restore();
  });

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(20, 18, 16, 0.35)";
  ctx.stroke();
  ctx.restore();
}

export function pickWeightedPrize(activePrizes) {
  const totalStock = activePrizes.reduce((sum, item) => sum + Number(item.stok), 0);
  let randomPoint = Math.random() * totalStock;
  for (let i = 0; i < activePrizes.length; i++) {
    randomPoint -= Number(activePrizes[i].stok);
    if (randomPoint <= 0) {
      return { prize: activePrizes[i], index: i };
    }
  }
  return { prize: activePrizes[activePrizes.length - 1], index: activePrizes.length - 1 };
}

export function triggerSpinFlow() {
  if (appState.isSpinning) return;

  const nama = document.getElementById("inputNama").value.trim();
  const wa = normalizeWa(document.getElementById("inputWa").value);
  const activePrizes = getAvailablePrizes();

  if (nama.length < 2 || wa.length < 9 || activePrizes.length === 0) {
    showToast("Lengkapi nama dan nomor WhatsApp pelanggan terlebih dahulu.", "error");
    return;
  }

  const existingCustomer = appState.customers.find(c => normalizeWa(c.no_wa) === wa);
  if (existingCustomer && !appState.duplicateWaConfirmed) {
    const msgEl = document.getElementById("duplicateWaMessage");
    msgEl.innerHTML = `Nomor WhatsApp <strong class="font-mono-num">${escapeHtml(wa)}</strong> atas nama <strong>${escapeHtml(existingCustomer.nama_customer)}</strong> sudah tercatat pada <span class="font-mono-num">${escapeHtml(existingCustomer.waktu_spin)}</span> dengan hadiah <strong>${escapeHtml(existingCustomer.hadiah_didapat)}</strong>.<br><br>Apakah pelanggan memiliki struk belanja baru dan diizinkan memutar kembali?`;
    openModalElement("modalDuplicateWa");
    return;
  }

  startWheelSpinAnimation(nama, wa, activePrizes);
}

export function closeDuplicateWaModal(allowProceed) {
  closeModalElement("modalDuplicateWa");
  if (allowProceed) {
    appState.duplicateWaConfirmed = true;
    triggerSpinFlow();
  }
}

export function startWheelSpinAnimation(nama, wa, activePrizes) {
  appState.isSpinning = true;
  document.getElementById("btnCenterSpin").disabled = true;
  document.getElementById("btnBottomSpin").disabled = true;
  document.getElementById("inputNama").disabled = true;
  document.getElementById("inputWa").disabled = true;

  const { prize: winningPrize, index: winningIndex } = pickWeightedPrize(activePrizes);
  appState.pendingWinner = {
    nama_customer: nama,
    no_wa: wa,
    prize: winningPrize
  };

  const sliceAngle = (Math.PI * 2) / activePrizes.length;
  const pointerAngle = (Math.PI * 3) / 2;
  const randomOffsetInSlice = (0.25 + Math.random() * 0.5) * sliceAngle;
  const targetModAngle = (pointerAngle - (winningIndex * sliceAngle + randomOffsetInSlice) + Math.PI * 4) % (Math.PI * 2);

  const currentModAngle = ((appState.wheelAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  let deltaAngle = targetModAngle - currentModAngle;
  if (deltaAngle < 0) deltaAngle += Math.PI * 2;

  const fullSpins = (6 + Math.floor(Math.random() * 3)) * Math.PI * 2;
  const startAngle = appState.wheelAngle;
  const totalRotation = fullSpins + deltaAngle;

  const duration = 5000;
  const startTime = performance.now();
  let lastTickSlice = -1;
  let ledStep = 0;

  function animateFrame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 4);

    appState.wheelAngle = startAngle + totalRotation * easeOut;
    drawSpinWheel();

    const normalizedAngle = ((pointerAngle - appState.wheelAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const currentSliceIndex = Math.floor(normalizedAngle / sliceAngle);
    if (currentSliceIndex !== lastTickSlice) {
      lastTickSlice = currentSliceIndex;
      playTickSound(520 + (1 - progress) * 280);
      ledStep++;
      updateLedAnimation(ledStep);
    }

    if (progress < 1) {
      requestAnimationFrame(animateFrame);
    } else {
      onSpinCompleted();
    }
  }

  requestAnimationFrame(animateFrame);
}

export function onSpinCompleted() {
  playWinFanfare();
  startConfettiCelebration();

  const { nama_customer, no_wa, prize } = appState.pendingWinner;
  document.getElementById("winnerCustomerName").textContent = nama_customer;
  document.getElementById("winnerCustomerWa").textContent = "WhatsApp: " + no_wa;
  document.getElementById("winnerPrizeName").textContent = prize.nama_hadiah;

  const iconBox = document.getElementById("winnerPrizeIconBox");
  if (prize.url_gambar && prize.url_gambar.trim() !== "") {
    iconBox.innerHTML = `<img src="${escapeHtml(prize.url_gambar)}" alt="${escapeHtml(prize.nama_hadiah)}" class="w-12 h-12 object-contain rounded-[6px]" onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\\'fa-solid fa-box-open text-2xl text-[#9e1316]\\'></i>';" />`;
  } else {
    iconBox.innerHTML = getPrizeSvgThumb(prize.icon_type || guessIconType(prize.nama_hadiah));
  }

  openModalElement("modalWinner");
}

export async function confirmPrizeAndRecord() {
  if (!appState.pendingWinner) return;

  const btn = document.getElementById("btnConfirmWinner");
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin" aria-hidden="true"></i><span>Mencatat Transaksi...</span>`;

  const { nama_customer, no_wa, prize } = appState.pendingWinner;
  const nowStr = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const newCustomerRecord = {
    id_transaksi: "TRX-" + Date.now().toString().slice(-6),
    waktu_spin: nowStr,
    nama_customer,
    no_wa,
    hadiah_didapat: prize.nama_hadiah
  };

  const targetPrize = appState.prizes.find(p => String(p.id_hadiah) === String(prize.id_hadiah));
  if (targetPrize && Number(targetPrize.stok) > 0) {
    targetPrize.stok = Number(targetPrize.stok) - 1;
  }
  appState.customers.unshift(newCustomerRecord);
  saveLocalState();

  if (appState.gasWebAppUrl) {
    await sendToGoogleSheets({
      action: "RECORD_SPIN",
      id_hadiah: prize.id_hadiah,
      customer: newCustomerRecord
    });
  }

  stopConfettiCelebration();
  closeModalElement("modalWinner");

  btn.disabled = false;
  btn.innerHTML = `<i class="fa-solid fa-check" aria-hidden="true"></i><span>Serahkan Hadiah &amp; Catat Transaksi</span>`;

  document.getElementById("inputNama").disabled = false;
  document.getElementById("inputWa").disabled = false;
  document.getElementById("inputNama").value = "";
  document.getElementById("inputWa").value = "";
  appState.isSpinning = false;
  appState.pendingWinner = null;
  appState.duplicateWaConfirmed = false;

  handleCustomerInputChange();
  refreshAllViews();
  showToast(`Transaksi ${nama_customer} (${prize.nama_hadiah}) berhasil dicatat.`, "success");
}