const axios = require("axios");
const xml2js = require("xml2js");

async function sendToTally(xml) {
  const response = await axios.post(
    "http://localhost:9000",
    xml,
    {
      headers: {
        "Content-Type": "application/xml"
      },
      timeout: 120000 
    }
  );

  const parser = new xml2js.Parser({
    explicitArray: false,
    ignoreAttrs: false
  });

  return parser.parseStringPromise(response.data);
}

module.exports = { sendToTally };
