// Read-only. Prints the live WSA Pipedrive account's pipelines, stages, and
// deal status field so the actual "qualified" / "won" stage can be
// identified from real evidence rather than assumed. No mutation, no
// writes, ever. Never prints the API token.

const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";

if (!process.env.PIPEDRIVE_API_TOKEN) {
  console.error("PIPEDRIVE_API_TOKEN is not set in this environment.");
  process.exit(1);
}

async function pipedriveGet(path) {
  const url = `${PIPEDRIVE_BASE}${path}${path.includes("?") ? "&" : "?"}api_token=${process.env.PIPEDRIVE_API_TOKEN}`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pipedrive API error (${response.status}) on ${path}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

try {
  console.log("=== Pipelines ===");
  const pipelinesResult = await pipedriveGet("/pipelines");
  const pipelines = pipelinesResult?.data ?? [];
  for (const p of pipelines) {
    console.log(`id=${p.id} name="${p.name}" active=${p.active} deal_probability=${p.deal_probability}`);
  }

  console.log("\n=== Stages per pipeline ===");
  const stagesResult = await pipedriveGet("/stages");
  const stages = stagesResult?.data ?? [];
  for (const p of pipelines) {
    console.log(`\nPipeline "${p.name}" (id=${p.id}):`);
    const pipelineStages = stages
      .filter(s => s.pipeline_id === p.id)
      .sort((a, b) => a.order_nr - b.order_nr);
    for (const s of pipelineStages) {
      console.log(`  order=${s.order_nr} id=${s.id} name="${s.name}" deal_probability=${s.deal_probability} rotten=${s.rotten_flag}`);
    }
  }

  console.log("\n=== Deal fields: status-like and custom fields ===");
  const dealFieldsResult = await pipedriveGet("/dealFields");
  const dealFields = dealFieldsResult?.data ?? [];
  for (const f of dealFields) {
    // status/stage_id are Pipedrive's built-in fields; also print any
    // custom field whose name suggests qualification.
    const interesting =
      f.key === "status" ||
      f.key === "stage_id" ||
      f.key === "pipeline_id" ||
      /qualif/i.test(f.name);
    if (!interesting) continue;
    console.log(`key=${f.key} name="${f.name}" field_type=${f.field_type}`);
    if (Array.isArray(f.options)) {
      for (const opt of f.options) {
        console.log(`    option: id=${opt.id} label="${opt.label}"`);
      }
    }
  }

  console.log("\n=== Recent won deals (sample, most recent 10) ===");
  const wonResult = await pipedriveGet("/deals?status=won&sort=update_time%20DESC&limit=10");
  const wonDeals = wonResult?.data ?? [];
  if (!wonDeals.length) {
    console.log("No won deals found (or none accessible to this token).");
  }
  for (const d of wonDeals) {
    console.log(`id=${d.id} title="${d.title}" stage_id=${d.stage_id} pipeline_id=${d.pipeline_id} person_id=${d.person_id?.value ?? d.person_id} won_time=${d.won_time}`);
  }
} catch (error) {
  console.error("Lookup failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
