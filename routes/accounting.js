const express = require("express");
const router = express.Router();
const { sendToTally } = require("../tallyClient");
const { parseTallyImportResponse } = require("../helpers/tallyHelper");

// ─── GET /groups ────────────────────────────────────────────
router.get("/groups", async (req, res) => {
  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

  try {
    const data = await sendToTally(xml);

    const body = data?.ENVELOPE?.BODY || {};
    let messages = body?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE || [];
    if (!Array.isArray(messages)) messages = [messages];

    const groups = [];
    for (const msg of messages) {
      if (!msg.GROUP) continue;
      const grp = msg.GROUP;
      const name = grp?.$?.NAME || grp?.["LANGUAGENAME.LIST"]?.["NAME.LIST"]?.NAME;
      if (name) {
        groups.push({ name, parent: grp.PARENT || null });
      }
    }

    res.json({ count: groups.length, groups });
  } catch (err) {
    console.error("GROUP API ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /groups ───────────────────────────────────────────
router.post("/groups", async (req, res) => {
  const { name, parent } = req.body;
  if (!name || !parent) {
    return res.status(400).json({ error: "Name and parent are required" });
  }

  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <GROUP NAME="${name}" ACTION="Create">
            <NAME.LIST>
              <NAME>${name}</NAME>
            </NAME.LIST>
            <PARENT>${parent}</PARENT>
          </GROUP>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  try {
    const data = await sendToTally(xml);
    const result = parseTallyImportResponse(data);
    if (!result.success) return res.status(400).json({ error: result.error, tally: result.tally });
    res.json({ message: "Group creation requested", created: result.created, tally: result.tally });
  } catch (err) {
    console.error("POST GROUP ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /ledgers ───────────────────────────────────────────
router.get("/ledgers", async (req, res) => {
  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

  try {
    const data = await sendToTally(xml);
    let messages = data?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE || [];
    if (!Array.isArray(messages)) messages = [messages];

    const ledgers = [];
    for (const msg of messages) {
      if (!msg.LEDGER) continue;
      const ledger = msg.LEDGER;
      const name = ledger?.$?.NAME || ledger?.["LANGUAGENAME.LIST"]?.["NAME.LIST"]?.NAME;
      if (name) {
        ledgers.push({
          name,
          parent: ledger.PARENT || null,
          openingBalance: ledger.OPENINGBALANCE || null
        });
      }
    }

    res.json({ count: ledgers.length, ledgers });
  } catch (err) {
    console.error("LEDGER API ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /ledgers ──────────────────────────────────────────
router.post("/ledgers", async (req, res) => {
  const { name, parent, openingBalance } = req.body;
  if (!name || !parent) {
    return res.status(400).json({ error: "Name and parent are required" });
  }

  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${name}" ACTION="Create">
            <NAME.LIST>
              <NAME>${name}</NAME>
            </NAME.LIST>
            <PARENT>${parent}</PARENT>
            ${openingBalance ? `<OPENINGBALANCE>${openingBalance}</OPENINGBALANCE>` : ''}
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  try {
    const data = await sendToTally(xml);
    const result = parseTallyImportResponse(data);
    if (!result.success) return res.status(400).json({ error: result.error, tally: result.tally });
    res.json({ message: "Ledger creation requested", created: result.created, tally: result.tally });
  } catch (err) {
    console.error("POST LEDGER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /vouchers ──────────────────────────────────────────
router.get("/vouchers", async (req, res) => {
  const from = req.query.from || "20230401";
  const to = req.query.to || "20240430";
  console.log(from, to);

  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Day Book</REPORTNAME>
        <STATICVARIABLES>
          <SVFROMDATE>${from}</SVFROMDATE>
          <SVTODATE>${to}</SVTODATE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

  try {
    const data = await sendToTally(xml);
    let messages = data?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE || [];
    if (!Array.isArray(messages)) messages = [messages];

    const vouchers = [];
    for (const msg of messages) {
      if (!msg.VOUCHER) continue;
      const v = msg.VOUCHER;

      const voucher = {
        type: v.VOUCHERTYPENAME || null,
        number: v.VOUCHERNUMBER || null,
        date: v.DATE || null,
        narration: v.NARRATION || null,
        entries: []
      };

      const entries = v["ALLLEDGERENTRIES.LIST"];
      const list = Array.isArray(entries) ? entries : [entries];
      for (const e of list) {
        if (!e) continue;
        voucher.entries.push({
          ledger: e.LEDGERNAME || null,
          amount: Number(e.AMOUNT || 0),
          isDebit: e.ISDEEMEDPOSITIVE === "Yes"
        });
      }

      vouchers.push(voucher);
    }

    res.json({ count: vouchers.length, vouchers });
  } catch (err) {
    console.error("VOUCHER API ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /vouchers ─────────────────────────────────────────
router.post("/vouchers", async (req, res) => {
  const { date, type, narration, entries } = req.body;
  if (!date || !type || !entries || !Array.isArray(entries)) {
    return res.status(400).json({ error: "Date, type, and entries array are required" });
  }

  let ledgersXml = "";
  for (const entry of entries) {
    ledgersXml += `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${entry.ledger}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${entry.isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
        <AMOUNT>${entry.isDebit ? '-' : ''}${Math.abs(entry.amount)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`;
  }

  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${type}" ACTION="Create">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>${type}</VOUCHERTYPENAME>
            ${narration ? `<NARRATION>${narration}</NARRATION>` : ''}
            ${ledgersXml}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  try {
    const data = await sendToTally(xml);
    const result = parseTallyImportResponse(data);
    if (!result.success) return res.status(400).json({ error: result.error, tally: result.tally });
    res.json({ message: "Voucher creation requested", created: result.created, tally: result.tally });
  } catch (err) {
    console.error("POST VOUCHER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /groups/:name ──────────────────────────────────────
router.put("/groups/:name", async (req, res) => {
  const oldName = decodeURIComponent(req.params.name);
  const { newName, parent } = req.body;

  if (!newName && !parent) {
    return res.status(400).json({ error: "Provide newName and/or parent to update" });
  }

  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <GROUP NAME="${oldName}" ACTION="Alter">
            ${newName ? `<NAME.LIST><NAME>${newName}</NAME></NAME.LIST>` : ''}
            ${parent ? `<PARENT>${parent}</PARENT>` : ''}
          </GROUP>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  try {
    const data = await sendToTally(xml);
    const result = parseTallyImportResponse(data);
    if (!result.success) return res.status(400).json({ error: result.error, tally: result.tally });
    res.json({ message: "Group updated", altered: result.altered, tally: result.tally });
  } catch (err) {
    console.error("PUT GROUP ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /groups/:name ───────────────────────────────────
router.delete("/groups/:name", async (req, res) => {
  const name = decodeURIComponent(req.params.name);

  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <GROUP NAME="${name}" ACTION="Delete"/>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  try {
    const data = await sendToTally(xml);
    const result = parseTallyImportResponse(data);
    if (!result.success) return res.status(400).json({ error: result.error, tally: result.tally });
    res.json({ message: "Group deleted", tally: result.tally });
  } catch (err) {
    console.error("DELETE GROUP ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /ledgers/:name ─────────────────────────────────────
router.put("/ledgers/:name", async (req, res) => {
  const oldName = decodeURIComponent(req.params.name);
  const { newName, parent, openingBalance } = req.body;

  if (!newName && !parent && openingBalance === undefined) {
    return res.status(400).json({ error: "Provide newName, parent, and/or openingBalance to update" });
  }

  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${oldName}" ACTION="Alter">
            ${newName ? `<NAME.LIST><NAME>${newName}</NAME></NAME.LIST>` : ''}
            ${parent ? `<PARENT>${parent}</PARENT>` : ''}
            ${openingBalance !== undefined ? `<OPENINGBALANCE>${openingBalance}</OPENINGBALANCE>` : ''}
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  try {
    const data = await sendToTally(xml);
    const result = parseTallyImportResponse(data);
    if (!result.success) return res.status(400).json({ error: result.error, tally: result.tally });
    res.json({ message: "Ledger updated", altered: result.altered, tally: result.tally });
  } catch (err) {
    console.error("PUT LEDGER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /ledgers/:name ──────────────────────────────────
router.delete("/ledgers/:name", async (req, res) => {
  const name = decodeURIComponent(req.params.name);

  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${name}" ACTION="Delete"/>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  try {
    const data = await sendToTally(xml);
    const result = parseTallyImportResponse(data);
    if (!result.success) return res.status(400).json({ error: result.error, tally: result.tally });
    res.json({ message: "Ledger deleted", tally: result.tally });
  } catch (err) {
    console.error("DELETE LEDGER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /vouchers/:voucherNumber ───────────────────────────
router.put("/vouchers/:voucherNumber", async (req, res) => {
  const voucherNumber = decodeURIComponent(req.params.voucherNumber);
  const { date, type, narration, entries } = req.body;

  if (!type) {
    return res.status(400).json({ error: "type (voucher type) is required to identify the voucher" });
  }

  let ledgersXml = "";
  if (entries && Array.isArray(entries)) {
    for (const entry of entries) {
      ledgersXml += `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${entry.ledger}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${entry.isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
        <AMOUNT>${entry.isDebit ? '-' : ''}${Math.abs(entry.amount)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`;
    }
  }

  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${type}" ACTION="Alter" VCHKEY="${voucherNumber}">
            <VOUCHERNUMBER>${voucherNumber}</VOUCHERNUMBER>
            <VOUCHERTYPENAME>${type}</VOUCHERTYPENAME>
            ${date ? `<DATE>${date}</DATE>` : ''}
            ${narration !== undefined ? `<NARRATION>${narration}</NARRATION>` : ''}
            ${ledgersXml}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  try {
    const data = await sendToTally(xml);
    const result = parseTallyImportResponse(data);
    if (!result.success) return res.status(400).json({ error: result.error, tally: result.tally });
    res.json({ message: "Voucher updated", altered: result.altered, tally: result.tally });
  } catch (err) {
    console.error("PUT VOUCHER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /vouchers/:voucherNumber ────────────────────────
router.delete("/vouchers/:voucherNumber", async (req, res) => {
  const voucherNumber = decodeURIComponent(req.params.voucherNumber);
  const type = req.query.type;

  if (!type) {
    return res.status(400).json({ error: "Query param 'type' (voucher type) is required, e.g. ?type=Sales" });
  }

  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${type}" ACTION="Delete" VCHKEY="${voucherNumber}">
            <VOUCHERNUMBER>${voucherNumber}</VOUCHERNUMBER>
            <VOUCHERTYPENAME>${type}</VOUCHERTYPENAME>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  try {
    const data = await sendToTally(xml);
    const result = parseTallyImportResponse(data);
    if (!result.success) return res.status(400).json({ error: result.error, tally: result.tally });
    res.json({ message: "Voucher deleted", tally: result.tally });
  } catch (err) {
    console.error("DELETE VOUCHER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
