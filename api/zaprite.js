const PAYMENT_LINK_ID = 'pl_WlSsmXQdAd';
const EVENT_NAME = 'HotStyle TakeOver 3';

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
        search: EVENT_NAME
      });

      const ordersRes = await fetch(`${BASE}/v1/orders?${params}`, { headers });
      if (!ordersRes.ok) {
        const text = await ordersRes.text();
        return res.status(ordersRes.status).json({ error: 'Zaprite list-orders failed', detail: text });
      }

      const data = await ordersRes.json();
      if (data.items) allOrders = allOrders.concat(data.items);
      totalPages = data.meta?.pagesCount || 1;
      page++;
    }

    // Strict filter: only orders tied to the Hotstyle Takeover 3 payment link or name
    const filtered = allOrders.filter(order => {
      if (order.paymentLink?.id === PAYMENT_LINK_ID || order.paymentLinkId === PAYMENT_LINK_ID) {
        return true;
      }
      const title = (order.title || order.invoice?.lineItems?.[0]?.description || '').toLowerCase();
      return title.includes('hotstyle takeover 3');
    });

    return res.status(200).json({ orders: filtered });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
