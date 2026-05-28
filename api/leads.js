const { handleLeadRequest } = require("../server/leads-handler");

function patchResponse(res) {
  if (typeof res.status !== "function") {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
  }

  if (typeof res.json !== "function") {
    res.json = (data) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
      return res;
    };
  }
}

module.exports = async (req, res) => {
  patchResponse(res);

  if (typeof req.body === "string") {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      req.body = {};
    }
  }

  return handleLeadRequest(req, res);
};
