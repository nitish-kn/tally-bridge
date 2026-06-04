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

module.exports = { parseTallyImportResponse };
