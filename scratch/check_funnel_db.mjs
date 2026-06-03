/**
 * Check if platform_funnel_events table and get_unique_funnel_count RPC exist in Supabase
 * Run from project dir: node scratch/check_funnel_db.mjs
 */

const SUPABASE_URL = "https://bxfabjbsehvgrnksfcae.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZmFiamJzZWh2Z3Jua3NmY2FlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgyODcyMywiZXhwIjoyMDk1NDA0NzIzfQ.iga0QqRh5dQvTlazR0Ul4vj4-OTnvI4d4DV3vSzXrVY";
const HEADERS = {
  "apikey": SERVICE_ROLE_KEY,
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

async function check() {
  // 1. Check if table exists
  console.log("1. Checking if platform_funnel_events table exists...");
  const tableRes = await fetch(`${SUPABASE_URL}/rest/v1/platform_funnel_events?limit=1`, { headers: HEADERS });
  const tableText = await tableRes.text();
  if (!tableRes.ok) {
    console.error("❌ TABLE NOT FOUND. HTTP", tableRes.status, tableText);
  } else {
    console.log("✅ TABLE EXISTS:", tableText);
  }

  // 2. Check if RPC exists
  console.log("\n2. Checking get_unique_funnel_count RPC...");
  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_unique_funnel_count`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ target_event: "register_viewed" })
  });
  const rpcText = await rpcRes.text();
  if (!rpcRes.ok) {
    console.error("❌ RPC NOT FOUND. HTTP", rpcRes.status, rpcText);
  } else {
    console.log("✅ RPC WORKS. Result:", rpcText);
  }

  // 3. Try inserting a test event directly via REST
  console.log("\n3. Trying to insert a test event...");
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/platform_funnel_events`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      session_id: "00000000-0000-0000-0000-000000000001",
      event_name: "register_viewed"
    })
  });
  const insertText = await insertRes.text();
  if (!insertRes.ok) {
    console.error("❌ INSERT FAILED. HTTP", insertRes.status, insertText);
  } else {
    console.log("✅ INSERT SUCCESS:", insertText);
  }
}

check().catch(console.error);
