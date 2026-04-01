export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const API_KEY = process.env.ZAPRITE_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'ZAPRITE_API_KEY not set' });

  const BASE = 'https://api.zaprite.com';
  const headers = { 'Authorization': `Bearer ${API_KEY}` };

  try {
    let allOrders = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const params = new URLSearchParams({
        page: String(page),
        sortBy: 'createdAt',
        sortOrder: 'desc',
        includePending: 'true',
        search: 'HotSyle TakeOver 3'
      });
      const url = `${BASE}/v1/orders?${params}`;
      const ordersRes = await fetch(url, { headers });
      if (!ordersRes.ok) {
        const text = await ordersRes.text();
        return res.status(ordersRes.status).json({ error: 'Zaprite list-orders failed', detail: text });
      }
      const data = await ordersRes.json();
      if (data.items) allOrders = allOrders.concat(data.items);
      totalPages = data.meta?.pagesCount || 1;
      page++;
    }

    // Strict filter: only orders from HotSyle TakeOver 3
    const PAYMENT_LINK_ID = 'pl_WlSsmXQdAd';
    const filtered = allOrders.filter(order => {
      // Match by payment link ID
      if (order.paymentLink?.id === PAYMENT_LINK_ID || order.paymentLinkId === PAYMENT_LINK_ID) return true;
      // Match by title containing "HotSyle TakeOver 3"
      const title = (order.title || order.invoice?.lineItems?.[0]?.description || '').toLowerCase();
      return title.includes('hotsyle takeover 3');
    });

    return res.status(200).json({ orders: filtered });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
