process.loadEnvFile();

const { VernacularAddressParser } = require("./src/parser");

async function main() {
  const parser = new VernacularAddressParser();

  const testAddresses = [
    {
      label: "Tier-2 Colloquial + Landmark (Varanasi / Banaras)",
      input: "Hno 14 gali no 3, shiv mandir ke peeche, Lanka, Banaras, UP 221005",
    },
    {
      label: "Missing House Number + City Alias (Vadodara / Baroda)",
      input: "water tanki ke samne, kalyan nagar, Baroda",
    },
    {
      label: "Commercial + Multi-Landmark + Historical Alias (Mumbai / Bombay)",
      input: "Shop no 12, opp bus stand, near sbi atm, thane west, bombay 400601",
    },
    {
      label: "South Indian Cross/Main Pattern (Bengaluru / Bangalore)",
      input: "Flat 204, SLV Residency, 4th cross, near rama temple, Indiranagar, Bangalore 560038",
    },
    {
      label: "Pure Native Script (Jaipur Devanagari)",
      input: "मकान नं 25, हनुमान मंदिर के पास, शास्त्री नगर, जयपुर 302016",
    },
  ];

  console.log("\n================================================================================");
  console.log("   INDIAN VERNACULAR ADDRESS STANDARDIZATION ENGINE — TEST SUITE   ");
  console.log("================================================================================\n");

  for (let i = 0; i < testAddresses.length; i++) {
    const { label, input } = testAddresses[i];
    console.log(`[Test ${i + 1}/${testAddresses.length}] ${label}`);
    console.log(`INPUT: "${input}"\n`);

    try {
      const result = await parser.parseAddress(input);

      console.log(`  Language/Script Detected : ${result.detected_script?.language_code} (${result.detected_script?.script}) [Romanized: ${result.detected_script?.is_vernacular_romanized}]`);
      console.log(`  Door / Flat Number       : ${result.structured.house_or_flat || "(None)"}`);
      console.log(`  Street / Road            : ${result.structured.street_or_road || "(None)"}`);
      console.log(`  Landmark Relation        : [${result.structured.landmark_relation}] -> ${result.structured.landmark || "(None)"}`);
      console.log(`  Locality                 : ${result.structured.locality || "(None)"}`);
      console.log(`  Canonical City           : ${result.structured.canonical_city} ${result.structured.detected_alias ? `(alias: "${result.structured.detected_alias}")` : ""}`);
      console.log(`  State / PIN              : ${result.structured.state || "(None)"} | PIN: ${result.structured.pincode || "(None)"}`);
      console.log(`  Standardized (EN)        : ${result.standardized_address_en}`);
      console.log(`  Standardized (Indic)     : ${result.standardized_address_indic}`);
      console.log(`  Delivery Flags           : ${result.flags.length ? result.flags.join(", ") : "None (Clean)"}`);
      console.log(`  Latency                  : ${result.meta.latency_ms} ms`);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
    console.log("\n--------------------------------------------------------------------------------\n");
  }
}

main().catch(console.error);
