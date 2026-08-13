const { sendToTally } = require("../tallyClient");

// Helper: extract Tally import errors from the response
function parseTallyImportResponse(data) {
    const resp = data?.RESPONSE || data?.ENVELOPE?.RESPONSE;
    if (!resp) return { success: true, raw: data };
    const exceptions = parseInt(resp.EXCEPTIONS || "0", 10);
    const errors = parseInt(resp.ERRORS || "0", 10);
    const lineError = resp.LINEERROR || null;
    if (exceptions > 0 || errors > 0 || lineError) {
        return {
            success: false,
            error: lineError || `Tally returned ${exceptions} exception(s), ${errors} error(s)`,
            tally: resp
        };
    }
    return { success: true, created: parseInt(resp.CREATED || "0", 10), altered: parseInt(resp.ALTERED || "0", 10), tally: resp };
}

// Helper: fetch active company name from Tally
async function getActiveCompany() {
    const xml = `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <ACCOUNTTYPE>Companies</ACCOUNTTYPE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

    const data = await sendToTally(xml);
    const body = data?.ENVELOPE?.BODY || {};
    let companyName = body?.IMPORTDATA?.REQUESTDESC?.STATICVARIABLES?.SVCURRENTCOMPANY;
    
    if (!companyName || typeof companyName !== "string") {
        const requestData = body?.IMPORTDATA?.REQUESTDATA || {};
        let messages = requestData.TALLYMESSAGE || [];
        if (!Array.isArray(messages)) messages = [messages];
        
        for (const msg of messages) {
            if (msg.COMPANY) {
                const list = msg.COMPANY["REMOTECMPINFO.LIST"];
                const compList = Array.isArray(list) ? list : [list];
                for (const item of compList) {
                    const name = item?.REMOTECMPNAME || item?.NAME;
                    if (name && typeof name === "string") {
                        companyName = name;
                        break;
                    }
                }
            }
            if (companyName && typeof companyName === "string") break;
        }
    }

    if (typeof companyName === "object" || !companyName) {
        companyName = "Unknown Company";
    } else {
        companyName = String(companyName).trim();
    }

    return companyName;
}

module.exports = { parseTallyImportResponse, getActiveCompany };

