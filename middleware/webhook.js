const crypto = require("crypto");

function signPayload(secret, payloadString) {
  return crypto
    .createHmac("sha256", secret)
    .update(payloadString)
    .digest("hex");
}

exports.sendWebhook = async ({ url, secret, event, payload, timeoutMs = 5000 }) => {
  if (!url) return;

  const webhookBody = {
    event,
    payload,
    createdAt: new Date().toISOString(),
  };

  const bodyString = JSON.stringify(webhookBody);

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "hloxpat-backend-webhook/1.0",
  };

  if (secret) {
    headers["X-Webhook-Signature"] = signPayload(secret, bodyString);
    headers["X-Webhook-Signature-Alg"] = "hmac-sha256";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(url, {
      method: "POST",
      headers,
      body: bodyString,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};
