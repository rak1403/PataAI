const { SarvamAIClient } = require("sarvamai");

/**
 * System prompt instructing Sarvam's Indic reasoning model on Indian address structure,
 * vernacular prepositions, landmark relationships, and city alias normalization.
 */
const ADDRESS_PARSER_SYSTEM_PROMPT = `You are a high-precision Indian Vernacular Address Standardization Engine.
Analyze the user's Indian address (which may be in Roman Hindi/Hinglish, mixed regional language, English, or native Indic script) and output ONLY a valid JSON object matching this schema:

{
  "house_or_flat": "string or null (e.g. H.No 14, Flat 302, Gala 4, Shop 12)",
  "building_or_society": "string or null (e.g. Gokul Dham Apartments, Surya Enclave)",
  "street_or_road": "string or null (e.g. Gali No 3, Station Road, MG Marg)",
  "landmark": "string or null (e.g. Shiv Mandir, Water Tank, Metro Pillar 140, SBI ATM)",
  "landmark_relation": "BEHIND" | "NEAR" | "OPPOSITE" | "ADJACENT" | "ABOVE" | "INSIDE" | "NONE",
  "locality": "string or null (e.g. Lanka, Kalyan Nagar, Kothrud, Indiranagar)",
  "sub_locality": "string or null (e.g. Sector 4, Phase 2, Mohalla)",
  "canonical_city": "string or null (Standardized official name, e.g. Varanasi, Prayagraj, Mumbai, Pune, Vadodara, Bengaluru, Gurugram, Kolkata, Chennai)",
  "detected_alias": "string or null (If colloquial or historical name was used, e.g. Banaras, Allahabad, Bombay, Poona, Baroda, Bangalore, Gurgaon)",
  "district": "string or null",
  "state": "string or null (Full state name, e.g. Uttar Pradesh, Maharashtra, Gujarat, Karnataka)",
  "pincode": "string or null (6 digits)",
  "standardized_address_en": "string (Clean, well-ordered postal courier deliverable string in English)",
  "standardized_address_indic": "string (The address rendered properly in Devanagari or appropriate Indic script)",
  "flags": ["string (e.g. MISSING_HOUSE_NUMBER, MISSING_PINCODE, MISSING_STREET, LANDMARK_VAGUE, AMBIGUOUS_LOCALITY)"]
}

Strict Rules:
1. Spatial Preposition Normalization:
   - "ke peeche", "piche", "back side", "behind" -> landmark_relation: "BEHIND"
   - "ke paas", "bagal mein", "near", "side mein", "satte hue" -> landmark_relation: "NEAR"
   - "ke samne", "samne", "opposite", "facing" -> landmark_relation: "OPPOSITE"
   - "ke upar", "1st floor", "above" -> landmark_relation: "ABOVE"
   - "andar", "gali ke andar", "inside" -> landmark_relation: "INSIDE"
2. City Alias Resolution:
   - Banaras / Benares / Kashi -> canonical_city: "Varanasi", detected_alias: "Banaras"
   - Allahabad -> canonical_city: "Prayagraj", detected_alias: "Allahabad"
   - Bombay -> canonical_city: "Mumbai", detected_alias: "Bombay"
   - Poona -> canonical_city: "Pune", detected_alias: "Poona"
   - Baroda -> canonical_city: "Vadodara", detected_alias: "Baroda"
   - Bangalore -> canonical_city: "Bengaluru", detected_alias: "Bangalore"
   - Gurgaon -> canonical_city: "Gurugram", detected_alias: "Gurgaon"
   - Calcutta -> canonical_city: "Kolkata", detected_alias: "Calcutta"
   - Madras -> canonical_city: "Chennai", detected_alias: "Madras"
   - Cochin -> canonical_city: "Kochi", detected_alias: "Cochin"
   - Trivandrum -> canonical_city: "Thiruvananthapuram", detected_alias: "Trivandrum"
   - Vizag / Waltair -> canonical_city: "Visakhapatnam", detected_alias: "Vizag"
3. Delivery Risk Flags:
   - If house/flat/shop number is missing: add "MISSING_HOUSE_NUMBER" to flags
   - If pincode is missing: add "MISSING_PINCODE" to flags
   - If landmark is missing or generic (e.g. just "tree" or "pole"): add "LANDMARK_VAGUE" to flags
4. Format:
   - Output ONLY the JSON block within \`\`\`json\`\`\`. No commentary.`;

class VernacularAddressParser {
  constructor(apiKey = process.env.SARVAM_API_KEY) {
    if (!apiKey) {
      throw new Error("SARVAM_API_KEY is required to initialize VernacularAddressParser.");
    }
    this.client = new SarvamAIClient({ apiSubscriptionKey: apiKey });
    this.chatModel = "sarvam-105b-conversations";
  }

  /**
   * Identifies the language and script of the raw input.
   * @param {string} text
   * @returns {Promise<{ language_code: string, script_code: string } | null>}
   */
  async identifyScriptAndLanguage(text) {
    try {
      const res = await this.client.text.identifyLanguage({ input: text });
      return {
        language_code: res.language_code,
        script_code: res.script_code,
      };
    } catch {
      return null;
    }
  }

  /**
   * Parses an unstandardized Indian address into structured components.
   * @param {string} rawAddress - The raw vernacular address string
   * @returns {Promise<object>} Standardized address payload
   */
  async parseAddress(rawAddress) {
    if (!rawAddress || typeof rawAddress !== "string" || !rawAddress.trim()) {
      throw new Error("A valid raw address string is required.");
    }

    const cleanInput = rawAddress.trim();
    const startTime = Date.now();

    // Run language/script identification and chat parsing concurrently for maximum speed
    const [langMeta, chatResponse] = await Promise.all([
      this.identifyScriptAndLanguage(cleanInput),
      this.client.chat.completions({
        model: this.chatModel,
        messages: [
          { role: "system", content: ADDRESS_PARSER_SYSTEM_PROMPT },
          { role: "user", content: `Standardize this address: "${cleanInput}"` },
        ],
      }),
    ]);

    const latencyMs = Date.now() - startTime;
    const content = chatResponse.choices[0]?.message?.content || "";

    // Extract JSON block
    const match = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error(`Failed to extract structured JSON from model response: ${content}`);
    }

    let parsedData;
    try {
      parsedData = JSON.parse(match[1] || match[0]);
    } catch (err) {
      throw new Error(`Invalid JSON produced by model: ${err.message}`);
    }

    // Ensure flags is an array
    if (!Array.isArray(parsedData.flags)) {
      parsedData.flags = [];
    }

    return {
      raw_address: cleanInput,
      detected_script: langMeta ? {
        language_code: langMeta.language_code,
        script: langMeta.script_code === "Latn" ? "Latin (Roman)" : langMeta.script_code,
        is_vernacular_romanized: langMeta.script_code === "Latn" && langMeta.language_code !== "en-IN",
      } : null,
      structured: {
        house_or_flat: parsedData.house_or_flat || null,
        building_or_society: parsedData.building_or_society || null,
        street_or_road: parsedData.street_or_road || null,
        landmark: parsedData.landmark || null,
        landmark_relation: parsedData.landmark_relation || "NONE",
        locality: parsedData.locality || null,
        sub_locality: parsedData.sub_locality || null,
        canonical_city: parsedData.canonical_city || null,
        detected_alias: parsedData.detected_alias || null,
        district: parsedData.district || null,
        state: parsedData.state || null,
        pincode: parsedData.pincode ? String(parsedData.pincode).trim() : null,
      },
      standardized_address_en: parsedData.standardized_address_en,
      standardized_address_indic: parsedData.standardized_address_indic,
      flags: parsedData.flags,
      meta: {
        parser_model: this.chatModel,
        latency_ms: latencyMs,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

module.exports = {
  VernacularAddressParser,
};
