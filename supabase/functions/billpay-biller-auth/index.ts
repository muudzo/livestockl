// billpay-biller-auth
// -------------------
// BillPay biller AUTH endpoint. Paynow calls this to verify an auction
// reference and look up who's paying for what.
//
// Request:
//   GET  /functions/v1/billpay-biller-auth?member=AUCT-XYZ-001
//   POST /functions/v1/billpay-biller-auth  body: { "member": "AUCT-XYZ-001" }
//   Authorization: Basic <BILLPAY_BILLER_USERNAME:BILLPAY_BILLER_PASSWORD>
//
// Response shapes:
//   200 Authorized: { status, member, name, description, amountDue, currency, phone }
//   200 AlreadyPaid: { status, member, name, description, amountDue: 0, currency }
//   404 NonExistent: { status, member, error }
//   400 Failed: { status, error }
//   401 Unauthorized: { status, error }
//
// `name` is the bill-payer's name (auction winner — matches BillPay convention
// where `name` is the account holder). `description` is the lot title so the
// payer can confirm the right item.

import {
  getServiceClient,
  jsonResponse,
  logInbound,
  requireBillerAuth,
} from "../_shared/billpay.ts";

Deno.serve(async (req) => {
  const supabase = getServiceClient();

  const guard = await requireBillerAuth(req, supabase);
  if (!guard.ok) return guard.response;
  const remoteIp = guard.ip;

  // Member from query string (GET) or JSON body (POST)
  let member = "";
  const url = new URL(req.url);
  if (req.method === "GET") {
    member = url.searchParams.get("member") || "";
  } else if (req.method === "POST") {
    try {
      const text = await req.text();
      const body = text ? JSON.parse(text) : {};
      member = String(body.member || url.searchParams.get("member") || "");
    } catch {
      const resp = { status: "Failed", error: "Malformed JSON body" };
      await logInbound(supabase, {
        action: "member",
        request: { url: req.url },
        response: resp,
        statusCode: 400,
        remoteIp,
      });
      return jsonResponse(resp, 400);
    }
  } else {
    return jsonResponse({ status: "Failed", error: "Method not allowed" }, 405);
  }

  if (!member) {
    const resp = { status: "Failed", error: "Missing member" };
    await logInbound(supabase, {
      action: "member",
      request: { member },
      response: resp,
      statusCode: 400,
      remoteIp,
    });
    return jsonResponse(resp, 400);
  }

  // Read payment + buyer profile + listing title in one round-trip.
  // PostgREST resolves the FKs automatically — payments.user_id → profiles.id,
  // payments.livestock_id → livestock_items.id. `!inner` makes both joins
  // required (a payment row without a buyer or a lot is a data bug, not a
  // missing-record case the caller cares about).
  const { data: payment } = await supabase
    .from("payments")
    .select(`
      amount,
      status,
      livestock_id,
      user_id,
      livestock_items!inner(title),
      profiles!inner(first_name, last_name, phone)
    `)
    .eq("reference", member)
    .maybeSingle();

  if (!payment) {
    const resp = { status: "NonExistent", member, error: "Reference not found" };
    await logInbound(supabase, {
      action: "member",
      member,
      request: { member },
      response: resp,
      statusCode: 404,
      remoteIp,
    });
    return jsonResponse(resp, 404);
  }

  const buyer = payment.profiles as unknown as {
    first_name: string;
    last_name: string;
    phone: string;
  };
  const lot = payment.livestock_items as unknown as { title: string };

  const buyerName = `${buyer.first_name || ""} ${buyer.last_name || ""}`.trim() || "ZimLivestock buyer";
  const description = lot.title;

  if (payment.status === "paid") {
    const resp = {
      status: "AlreadyPaid",
      member,
      name: buyerName,
      description,
      amountDue: 0,
      currency: "USD",
    };
    await logInbound(supabase, {
      action: "member",
      member,
      request: { member },
      response: resp,
      statusCode: 200,
      remoteIp,
    });
    return jsonResponse(resp, 200);
  }

  const resp = {
    status: "Authorized",
    member,
    name: buyerName,
    description,
    amountDue: Number(payment.amount),
    currency: "USD",
    phone: buyer.phone || null,
  };
  await logInbound(supabase, {
    action: "member",
    member,
    request: { member },
    response: resp,
    statusCode: 200,
    remoteIp,
  });
  return jsonResponse(resp, 200);
});
