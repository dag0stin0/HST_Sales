export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const API_KEY = process.env.LUMA_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'LUMA_API_KEY not set' });

  const BASE = 'https://public-api.luma.com';
  const headers = { 'x-luma-api-key': API_KEY };

  try {
    // 1. Find the HOTSTYLE III event — paginate through all events
    let allEvents = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      let url = `${BASE}/v1/calendar/list-events?pagination_limit=50`;
      if (cursor) url += `&pagination_cursor=${cursor}`;
      const eventsRes = await fetch(url, { headers });
      if (!eventsRes.ok) {
        const text = await eventsRes.text();
        return res.status(eventsRes.status).json({ error: 'Luma list-events failed', detail: text });
      }
      const eventsData = await eventsRes.json();
      if (eventsData.entries) allEvents = allEvents.concat(eventsData.entries);
      hasMore = eventsData.has_more || false;
      cursor = eventsData.next_cursor || null;
    }

    // Match by URL slug first, then by name containing "III" or "3"
    let event = allEvents.find(e =>
      e.event?.url?.includes('6cvlxirh')
    );
    if (!event) {
      event = allEvents.find(e =>
        e.event?.name?.toLowerCase().includes('hotstyle iii') ||
        e.event?.name?.toLowerCase().includes('hotstyle 3')
      );
    }
    // Fallback: most recent hotstyle event by start date
    if (!event) {
      const hotstyles = allEvents
        .filter(e => e.event?.name?.toLowerCase().includes('hotstyle'))
        .sort((a, b) => new Date(b.event.start_at) - new Date(a.event.start_at));
      event = hotstyles[0];
    }

    if (!event) return res.status(404).json({
      error: 'HOTSTYLE event not found',
      events: allEvents.map(e => ({ name: e.event?.name, url: e.event?.url, start: e.event?.start_at }))
    });

    const eventId = event.event.api_id;

    // 2. Get ticket types so we know GA vs VIP pricing
    const ticketTypesRes = await fetch(`${BASE}/v1/event/ticket-types/list?event_id=${eventId}`, { headers });
    let ticketTypes = [];
    if (ticketTypesRes.ok) {
      const ttData = await ticketTypesRes.json();
      ticketTypes = ttData.ticket_types || [];
    }

    // 3. Paginate through all guests
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
