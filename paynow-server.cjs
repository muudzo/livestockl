const express = require("express");
const cors = require("cors");
const { Paynow } = require("paynow");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const INTEGRATION_ID = "23657";
const INTEGRATION_KEY = "13f76059-61a1-46b5-80fe-1914485a9f95";
const RESULT_URL = "https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/payment-webhook";
const RETURN_URL = "http://localhost:5174/test-paynow?status=returned";

const paynow = new Paynow(INTEGRATION_ID, INTEGRATION_KEY);
paynow.resultUrl = RESULT_URL;
paynow.returnUrl = RETURN_URL;

// Web payment (card) — redirects to Paynow hosted page
app.post("/api/process-payment", async (req, res) => {
  try {
    const { amount, description } = req.body;
    const reference = `ZL-TEST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const payment = paynow.createPayment(reference, "test@benchmark.com");
    payment.add(description || "Test Payment", Number(amount));

    console.log(`[${reference}] Initiating web payment for US$${amount}...`);
    const response = await paynow.send(payment);

    console.log(`[${reference}] Response:`, response);

    if (!response) {
      return res.status(500).json({
        error: "Paynow returned no response (SDK swallowed error — check server logs)",
        reference,
      });
    }

    if (response.success) {
      return res.json({
        success: true,
        reference,
        redirectUrl: response.redirectUrl,
        pollUrl: response.pollUrl,
        hasRedirect: response.hasRedirect,
      });
    } else {
      return res.status(400).json({
        error: response.error || "Payment initiation failed",
        reference,
      });
    }
  } catch (err) {
    console.error("Payment error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Mobile payment (EcoCash / OneMoney)
app.post("/api/process-mobile-payment", async (req, res) => {
  try {
    const { amount, phone, method, description } = req.body;
    const reference = `ZL-TEST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const payment = paynow.createPayment(reference, "test@benchmark.com");
    payment.add(description || "Test Payment", Number(amount));

    const methodName = method === "OneMoney" ? "onemoney" : "ecocash";

    console.log(`[${reference}] Initiating ${methodName} payment for US$${amount} to ${phone}...`);
    const response = await paynow.sendMobile(payment, phone, methodName);

    console.log(`[${reference}] Response:`, response);

    if (!response) {
      return res.status(500).json({
        error: "Paynow returned no response (SDK swallowed error — check server logs)",
        reference,
      });
    }

    if (response.success) {
      return res.json({
        success: true,
        reference,
        pollUrl: response.pollUrl,
        instructions: response.instructions,
      });
    } else {
      return res.status(400).json({
        error: response.error || "Mobile payment initiation failed",
        reference,
      });
    }
  } catch (err) {
    console.error("Mobile payment error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Poll payment status
app.get("/api/check-payment-status/:pollUrl", async (req, res) => {
  try {
    const pollUrl = decodeURIComponent(req.params.pollUrl);
    console.log("Polling:", pollUrl);
    const status = await paynow.pollTransaction(pollUrl);
    console.log("Poll result:", status);
    return res.json(status || { error: "No status returned" });
  } catch (err) {
    console.error("Poll error:", err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\nPaynow proxy server running on http://localhost:${PORT}`);
  console.log(`Integration ID: ${INTEGRATION_ID}`);
  console.log(`Result URL: ${RESULT_URL}`);
  console.log(`Return URL: ${RETURN_URL}\n`);
  console.log("Endpoints:");
  console.log("  POST /api/process-payment         — Web/Card payment");
  console.log("  POST /api/process-mobile-payment   — EcoCash/OneMoney");
  console.log("  GET  /api/check-payment-status/:url — Poll status\n");
});
