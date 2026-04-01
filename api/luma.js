const EVENT_SLUG = '6cvlxirh';
const EVENT_NAME_MATCH = 'hotstyle takeover iii';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const API_KEY = process.env.LUMA_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'LUMA_API_KEY not set' });

  const BASE = 'https://public-api.luma.com';
  const headers = { 'x-luma-api-key': API_KEY };

  try {
    // Paginate through events to find Hotstyle Takeover III
    let event = null;
    let cursor = null;
    let hasMore = true;

    while (hasMore && !event) {
      let url = `${BASE}/v1/calendar/list-events?pagination_limit=50`;
      if (cursor) url += `&pagination_cursor=${cursor}`;

      const eventsRes = await fetch(url, { headers });
      if (!eventsRes.ok) {
        const text = await eventsRes.text();
        return res.status(eventsRes.status).json({ error: 'Luma list-events failed', detail: text });
      }

      const data = await eventsRes.json();
      const entries = data.entries || [];

      // Match by URL slug (most reliable) or exact name
      event = entries.find(e =>
        e.event?.url?.includes(EVENT_SLUG) ||
        e.event?.name?.toLowerCase().includes(EVENT_NAME_MATCH)
      );

      hasMore = data.has_more || false;
      cursor = data.next_cursor || null;
    }

    if (!event) {
      return res.status(404).json({ error: 'Hotstyle Takeover III not found on Luma' });
    }

    const eventId = event.event.api_id;

    // Get ticket types (GA vs VIP pricing)
    const ticketTypesRes = await fetch(
      `${BASE}/v1/event/ticket-types/list?event_id=${eventId}`,
      { headers }
    );
    let ticketTypes = [];
    if (ticketTypesRes.ok) {
      const ttData = await ticketTypesRes.json();
      ticketTypes = ttData.ticket_types || [];
    }

    // Paginate through all guests for this event
    let allGuests = [];
    let gCursor = null;
    let gHasMore = true;

    while (gHasMore) {
      let url = `${BASE}/v1/event/get-guests?event_id=${eventId}&pagination_limit=100`;
      if (gCursor) url += `&pagination_cursor=${gCursor}`;

      const guestsRes = await fetch(url, { headers });
      if (!guestsRes.ok) {
        const text = await guestsRes.text();
        return res.status(guestsRes.status).json({ error: 'Luma get-guests failed', detail: text });
      }

      const guestsData = await guestsRes.json();
      if (guestsData.entries) allGuests = allGuests.concat(guestsData.entries);
      gHasMore = guestsData.has_more || false;
      gCursor = guestsData.next_cursor || null;
    }

    return res.status(200).json({
      event: {
        id: eventId,
        name: event.event.name,
        start_at: event.event.start_at,
        end_at: event.event.end_at,
        url: event.event.url,
        cover_url: event.event.cover_url,
        geo_address_json: event.event.geo_address_json
      },
      ticket_types: ticketTypes,
      guests: allGuests
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
