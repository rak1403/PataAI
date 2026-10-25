const { VernacularAddressParser } = require("./parser");
const { validatePincode } = require("./pincode");
const { calculateDeliverabilityScore } = require("./scorer");
const { geocodeStructuredAddress } = require("./geocoder");

class IndicAddressEngine {
  constructor(apiKey = process.env.SARVAM_API_KEY) {
    this.parser = new VernacularAddressParser(apiKey);
  }

  /**
   * Complete pipeline: parse vernacular address, cross-check PIN code gazetteer,
   * evaluate delivery confidence, calculate RTO risk, and geocode.
   * 
   * @param {string} rawAddress - Raw unstandardized Indian address
   * @returns {Promise<object>} Full standardization & risk assessment payload
   */
  async process(rawAddress) {
    // 1. Vernacular Parsing with Sarvam AI
    const parseResult = await this.parser.parseAddress(rawAddress);

    // 2. PIN Code Consistency & Gazetteer Verification
    const pinValidation = validatePincode(
      parseResult.structured.pincode,
      parseResult.structured.canonical_city,
      parseResult.structured.state
    );

    // 3. Deliverability & RTO Risk Scoring
    const scoringResult = calculateDeliverabilityScore(
      parseResult.structured,
      pinValidation,
      parseResult.flags
    );

    // 4. Hierarchical Geocoding
    const geocoding = await geocodeStructuredAddress(parseResult.structured);

    return {
      raw_address: parseResult.raw_address,
      detected_script: parseResult.detected_script,
      structured: parseResult.structured,
      standardized_address_en: parseResult.standardized_address_en,
      standardized_address_indic: parseResult.standardized_address_indic,
      pincode_validation: pinValidation,
      assessment: {
        score: scoringResult.deliverability_score,
        grade: scoringResult.grade,
        risk_level: scoringResult.risk_level,
        rto_risk: scoringResult.rto_risk_prediction,
        flags: scoringResult.flags,
        recommendations: scoringResult.recommendations,
        breakdown: scoringResult.score_breakdown,
      },
      geocoding,
      meta: parseResult.meta,
    };
  }
}

module.exports = {
  IndicAddressEngine,
};
