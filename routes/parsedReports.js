const express = require("express");
const router = express.Router();
const { sendToTally } = require("../tallyClient");

// Helper to fetch and parse a Tally report with clean JSON output
async function fetchReport(reportName, from, to) {
    const xml = `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>${reportName}</REPORTNAME>
        ${from && to ? `<STATICVARIABLES><SVFROMDATE>${from}</SVFROMDATE><SVTODATE>${to}</SVTODATE></STATICVARIABLES>` : ''}
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
    return await sendToTally(xml);
}

// Helper to extract ledger rows from Tally DSPACCNAME/DSPDISPNAME format
function parseLedgerRows(messages) {
    const rows = [];
    if (!messages) return rows;
    const list = Array.isArray(messages) ? messages : [messages];
    for (const msg of list) {
        if (!msg) continue;
        const name = msg.DSPACCNAME?.DSPDISPNAME || msg.DSPACCNAME || null;
        const closingBal = msg.DSPCLBAL?.DSPDISPNAME || msg.DSPCLBAL || null;
        if (name) rows.push({ name: String(name).trim(), closingBalance: closingBal });
    }
    return rows;
}

// ─── GET /reports/trial-balance ─────────────────────────────
router.get("/reports/trial-balance", async (req, res) => {
    try {
        const data = await fetchReport("Trial Balance", req.query.from, req.query.to);
        const body = data?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA || data?.ENVELOPE?.BODY || {};
        res.json({ report: "Trial Balance", data: body });
    } catch (err) {
        console.error("TRIAL BALANCE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /reports/balance-sheet ─────────────────────────────
router.get("/reports/balance-sheet", async (req, res) => {
    try {
        const data = await fetchReport("Balance Sheet", req.query.from, req.query.to);
        const body = data?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA || data?.ENVELOPE?.BODY || {};
        res.json({ report: "Balance Sheet", data: body });
    } catch (err) {
        console.error("BALANCE SHEET ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /reports/profit-loss ───────────────────────────────
router.get("/reports/profit-loss", async (req, res) => {
    try {
        const data = await fetchReport("Profit and Loss A/c", req.query.from, req.query.to);
        const body = data?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA || data?.ENVELOPE?.BODY || {};
        res.json({ report: "Profit and Loss", data: body });
    } catch (err) {
        console.error("P&L ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /reports/cash-flow ─────────────────────────────────
router.get("/reports/cash-flow", async (req, res) => {
    try {
        const data = await fetchReport("Cash Flow", req.query.from, req.query.to);
        const body = data?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA || data?.ENVELOPE?.BODY || {};
        res.json({ report: "Cash Flow", data: body });
    } catch (err) {
        console.error("CASH FLOW ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /reports/stock-summary ─────────────────────────────
router.get("/reports/stock-summary", async (req, res) => {
    try {
        const data = await fetchReport("Stock Summary", req.query.from, req.query.to);
        const body = data?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA || data?.ENVELOPE?.BODY || {};
        res.json({ report: "Stock Summary", data: body });
    } catch (err) {
        console.error("STOCK SUMMARY ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /reports/day-book ──────────────────────────────────
router.get("/reports/day-book", async (req, res) => {
    const from = req.query.from || "20230401";
    const to = req.query.to || "20250331";
    try {
        const data = await fetchReport("Day Book", from, to);
        let messages = data?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE || [];
        if (!Array.isArray(messages)) messages = [messages];

        const vouchers = [];
        for (const msg of messages) {
            if (!msg.VOUCHER) continue;
            const v = msg.VOUCHER;
            vouchers.push({
                type: v.VOUCHERTYPENAME,
                number: v.VOUCHERNUMBER,
                date: v.DATE,
                narration: v.NARRATION || null
            });
        }
        res.json({ report: "Day Book", count: vouchers.length, vouchers });
    } catch (err) {
        console.error("DAY BOOK ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /reports/outstanding/receivables ───────────────────
router.get("/reports/outstanding/receivables", async (req, res) => {
    try {
        const data = await fetchReport("Bills Receivable", req.query.from, req.query.to);
        const body = data?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA || data?.ENVELOPE?.BODY || {};
        res.json({ report: "Outstanding Receivables", data: body });
    } catch (err) {
        console.error("RECEIVABLES ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /reports/outstanding/payables ──────────────────────
router.get("/reports/outstanding/payables", async (req, res) => {
    try {
        const data = await fetchReport("Bills Payable", req.query.from, req.query.to);
        const body = data?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA || data?.ENVELOPE?.BODY || {};
        res.json({ report: "Outstanding Payables", data: body });
    } catch (err) {
        console.error("PAYABLES ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /reports/ledger/:name ──────────────────────────────
router.get("/reports/ledger/:name", async (req, res) => {
    const ledgerName = decodeURIComponent(req.params.name);
    const from = req.query.from || "20230401";
    const to = req.query.to || "20250331";
    const xml = `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Ledger Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVFROMDATE>${from}</SVFROMDATE>
          <SVTODATE>${to}</SVTODATE>
          <LEDGERNAME>${ledgerName}</LEDGERNAME>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
    try {
        const data = await sendToTally(xml);
        let messages = data?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE || [];
        if (!Array.isArray(messages)) messages = [messages];

        const transactions = [];
        for (const msg of messages) {
            if (!msg.VOUCHER) continue;
            const v = msg.VOUCHER;
            transactions.push({
                type: v.VOUCHERTYPENAME,
                number: v.VOUCHERNUMBER,
                date: v.DATE,
                amount: v.AMOUNT || null,
                narration: v.NARRATION || null
            });
        }
        res.json({ ledger: ledgerName, count: transactions.length, transactions });
    } catch (err) {
        console.error("LEDGER REPORT ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
