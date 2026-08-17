/**
 * /api/live
 * ---------------------------------------------------------------------
 * Serverless proxy for 24data's REST endpoints. 24data's docs say browsers
 * can't call their routes directly (no permissive CORS/Allow-Origin), so
 * this runs server-side on Vercel instead — but as a per-request function,
 * not an always-on process. Nothing here needs to "stay running": Vercel
 * spins this up fresh for each request and throws it away after, which is
 * exactly why it's free and never sleeps/costs nothing at idle.
 *
 * Polled by the frontend every few seconds. Well within 24data's rate
 * limits (75/min for acft-data, 45/min for controllers) for a single
 * viewer polling every 5s (~12/min each).
 *
 * NOTE: 24data's FlightPlan data is WebSocket-only (not exposed via REST),
 * so this proxy — and the polling frontend it feeds — can't show flight
 * plan logs. That's the tradeoff for not needing a persistent relay server.
 */
module.exports = async (req, res) => {
  try {
    const [acftRes, ctrlRes] = await Promise.all([
      fetch("https://24data.ptfs.app/acft-data"),
      fetch("https://24data.ptfs.app/controllers"),
    ]);

    if (!acftRes.ok || !ctrlRes.ok) {
      res.status(502).json({ error: "24data returned an error", acftStatus: acftRes.status, ctrlStatus: ctrlRes.status });
      return;
    }

    const aircraft = await acftRes.json();
    const controllers = await ctrlRes.json();

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ aircraft, controllers, fetchedAt: new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ error: "Failed to reach 24data", detail: e.message });
  }
};
