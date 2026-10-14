/**
 * GOOGLE APPS SCRIPT : WATCH CLUB OPENING SALE SPINWHEEL
 * Pasang skrip ini di Ekstensi > Apps Script pada file Google Sheets toko.
 * Otomatis membuat dan menyinkronkan Tab "Stok_Hadiah" dan "Data_Customer".
 */

const SHEET_PRIZES = "Stok_Hadiah";
const SHEET_CUSTOMERS = "Data_Customer";

function ensureSheetsSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let prizeSheet = ss.getSheetByName(SHEET_PRIZES);
  if (!prizeSheet) {
    prizeSheet = ss.insertSheet(SHEET_PRIZES);
    prizeSheet.appendRow(["id_hadiah", "nama_hadiah", "stok", "warna_sektor", "icon_type", "url_gambar"]);
    const defaultPrizes = [
      ["GIFT-01", "Tumbler Reebok", 3, "#9E1316", "tumbler", ""],
      ["GIFT-02", "Gantungan Kunci", 30, "#E4B842", "keychain", ""],
      ["GIFT-03", "Pouch Serut", 20, "#141210", "pouch", ""],
      ["GIFT-04", "Lap Jam Tangan", 30, "#9E1316", "cloth", ""],
      ["GIFT-05", "Pulpen", 50, "#E4B842", "pen", ""]
    ];
    defaultPrizes.forEach(r => prizeSheet.appendRow(r));
  }

  let custSheet = ss.getSheetByName(SHEET_CUSTOMERS);
  if (!custSheet) {
    custSheet = ss.insertSheet(SHEET_CUSTOMERS);
    custSheet.appendRow(["id_transaksi", "waktu_spin", "nama_customer", "no_wa", "hadiah_didapat"]);
  }
  return { prizeSheet, custSheet };
}

function doGet() {
  const { prizeSheet, custSheet } = ensureSheetsSetup();
  const prizes = readSheetRows(prizeSheet);
  const customers = readSheetRows(custSheet);
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", prizes, customers }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { prizeSheet, custSheet } = ensureSheetsSetup();
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === "RECORD_SPIN") {
      const data = prizeSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(payload.id_hadiah)) {
          const currentStok = Math.max(0, Number(data[i][2]) - 1);
          prizeSheet.getRange(i + 1, 3).setValue(currentStok);
          break;
        }
      }
      const c = payload.customer;
      custSheet.appendRow([c.id_transaksi, c.waktu_spin, c.nama_customer, "'" + c.no_wa, c.hadiah_didapat]);
    } 
    else if (action === "SYNC_ALL") {
      overwriteSheet(prizeSheet, ["id_hadiah", "nama_hadiah", "stok", "warna_sektor", "icon_type", "url_gambar"], payload.prizes);
      overwriteSheet(custSheet, ["id_transaksi", "waktu_spin", "nama_customer", "no_wa", "hadiah_didapat"], payload.customers);
    }

    const prizes = readSheetRows(prizeSheet);
    const customers = readSheetRows(custSheet);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", prizes, customers }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function readSheetRows(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx];
    });
    return obj;
  });
}

function overwriteSheet(sheet, headers, items) {
  sheet.clearContents();
  sheet.appendRow(headers);
  if (!items || !items.length) return;
  const rows = items.map(item => headers.map(h => h === "no_wa" ? "'" + (item[h] || "") : (item[h] ?? "")));
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}