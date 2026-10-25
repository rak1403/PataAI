process.loadEnvFile();

const { IndicAddressEngine } = require("./src/engine");

async function main() {
  const engine = new IndicAddressEngine();

  const testCases = [
    {
      title: "Case 1: Standard Tier-2 Address with Colloquial Landmark & Alias",
      address: "Hno 14 gali no 3, shiv mandir ke peeche, Lanka, Banaras, UP 221005",
    },
    {
      title: "Case 2: Incomplete Address (Missing House No + Missing PIN)",
      address: "water tanki ke samne, kalyan nagar, Baroda",
    },
    {
      title: "Case 3: Malicious / Contradictory PIN (Varanasi UP with Karnataka PIN 560038)",
      address: "Plot 5, shiv temple road, Lanka, Varanasi, UP 560038",
    },
  ];

  console.log("\n================================================================================");
  console.log("   INDIC ADDRESS STANDARDIZATION & RTO SCORING ENGINE — BENCHMARK   ");
  console.log("================================================================================\n");

  for (let i = 0; i < testCases.length; i++) {
    const { title, address } = testCases[i];
    console.log(`[${i + 1}/${testCases.length}] ${title}`);
    console.log(`RAW INPUT: "${address}"\n`);

    try {
      const res = await engine.process(address);

      console.log(`  Deliverability Score : ${res.assessment.score}/100 (Grade: ${res.assessment.grade}, Risk: ${res.assessment.risk_level})`);
      console.log(`  RTO Risk Prediction  : ${res.assessment.rto_risk}`);
      console.log(`  Canonical City       : ${res.structured.canonical_city} ${res.structured.detected_alias ? `[Alias: ${res.structured.detected_alias}]` : ""}`);
      console.log(`  Landmark Anchor      : [${res.structured.landmark_relation}] -> ${res.structured.landmark || "None"}`);
      console.log(`  Standardized (EN)    : ${res.standardized_address_en}`);
      console.log(`  Standardized (Indic) : ${res.standardized_address_indic}`);
      console.log(`  PIN Validation       : Valid=${res.pincode_validation.is_valid} | State Match=${res.pincode_validation.state_matches}`);
      console.log(`  Flags Triggered      : ${res.assessment.flags.length ? res.assessment.flags.join(", ") : "None"}`);
      console.log(`  Top Recommendation   : ${res.assessment.recommendations[0]}`);
      console.log(`  Latency              : ${res.meta.latency_ms} ms`);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }

    console.log("\n--------------------------------------------------------------------------------\n");
  }
}

main().catch(console.error);
