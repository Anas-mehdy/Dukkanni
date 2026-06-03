/**
 * Simulate exactly what /api/admin/subscriptions does for funnel data
 */

const SUPABASE_URL = "https://bxfabjbsehvgrnksfcae.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZmFiamJzZWh2Z3Jua3NmY2FlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgyODcyMywiZXhwIjoyMDk1NDA0NzIzfQ.iga0QqRh5dQvTlazR0Ul4vj4-OTnvI4d4DV3vSzXrVY";
const HEADERS = {
  "apikey": SERVICE_ROLE_KEY,
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

async function checkFunnelStats() {
  console.log("=== Full funnel stats check ===\n");
  
  const events = ["register_viewed", "step1_started", "step1_completed", "step2_started", "register_success"];
  
  // Also check all records in DB
  const allRes = await fetch(`${SUPABASE_URL}/rest/v1/platform_funnel_events?order=created_at`, {
    headers: { ...HEADERS, "Prefer": "return=representation" }
  });
  const allData = await allRes.json();
  console.log(`Total rows in DB: ${allData.length}`);
  console.log("Events in DB:");
  
  const countByEvent = {};
  const sessionsByEvent = {};
  for (const row of allData) {
    countByEvent[row.event_name] = (countByEvent[row.event_name] || 0) + 1;
    if (!sessionsByEvent[row.event_name]) sessionsByEvent[row.event_name] = new Set();
    sessionsByEvent[row.event_name].add(row.session_id);
    console.log(`  - ${row.event_name} | session: ${row.session_id} | at: ${row.created_at}`);
  }
  
  console.log("\n=== Count by event (all rows) ===");
  for (const [event, count] of Object.entries(countByEvent)) {
    console.log(`  ${event}: ${count} rows, ${sessionsByEvent[event].size} unique sessions`);
  }
  
  console.log("\n=== RPC get_unique_funnel_count results ===");
  for (const event of events) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_unique_funnel_count`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ target_event: event })
    });
    const result = await res.text();
    console.log(`  ${event}: ${result}`);
  }
}

checkFunnelStats().catch(console.error);
