/**
 * Deliverability & RTO (Return to Origin) Risk Scorer for Indian E-commerce & Logistics.
 * Evaluates address completeness, spatial anchor quality, and PIN consistency.
 */

function calculateDeliverabilityScore(structured, pinValidation, modelFlags = []) {
  let score = 100;
  const breakdown = [];
  const consolidatedFlags = [...(modelFlags || [])];
  const recommendations = [];

  // 1. Door / Flat / House number check
  if (structured.house_or_flat) {
    breakdown.push({ item: "House/Door Number Present", delta: +5 });
    score += 5;
  } else {
    breakdown.push({ item: "Missing House/Door Number", delta: -25 });
    score -= 25;
    if (!consolidatedFlags.includes("MISSING_HOUSE_NUMBER")) {
      consolidatedFlags.push("MISSING_HOUSE_NUMBER");
    }
    recommendations.push("Request door/flat/shop number from customer via WhatsApp/SMS to avoid last-mile delivery failure.");
  }

  // 2. PIN Code Check
  if (!pinValidation.is_valid) {
    if (pinValidation.reason === "PIN_CODE_MISSING") {
      breakdown.push({ item: "Missing PIN Code", delta: -30 });
      score -= 30;
      recommendations.push("Prompt customer for 6-digit postal PIN code to route packet through hub.");
    } else {
      breakdown.push({ item: "Invalid PIN Code Format", delta: -35 });
      score -= 35;
      recommendations.push("Correct invalid PIN code format before creating courier airway bill.");
    }
  } else {
    breakdown.push({ item: "Valid 6-digit PIN Code", delta: +5 });
    score += 5;

    // Check PIN-State consistency
    if (pinValidation.state_matches === false) {
      breakdown.push({ item: "PIN State Mismatch", delta: -40 });
      score -= 40;
      consolidatedFlags.push("CRITICAL_PIN_STATE_MISMATCH");
      recommendations.push(`CRITICAL: Address state does not match PIN zone (${pinValidation.state_from_pin}). Verify before shipping to prevent state-level misrouting.`);
    }

    // Check PIN-City consistency
    if (pinValidation.city_matches === false) {
      breakdown.push({ item: "PIN City Mismatch Warning", delta: -15 });
      score -= 15;
      consolidatedFlags.push("PIN_CITY_MISMATCH");
      recommendations.push(`Warning: PIN prefix does not match typical range for ${structured.canonical_city}. Double check with customer.`);
    }
  }

  // 3. Landmark & Spatial Relation Check
  if (structured.landmark) {
    if (structured.landmark_relation && structured.landmark_relation !== "NONE") {
      breakdown.push({ item: `Strong Spatial Landmark (${structured.landmark_relation})`, delta: +10 });
      score += 10;
    } else {
      breakdown.push({ item: "Landmark Present", delta: +5 });
      score += 5;
    }
  } else {
    // If no house number AND no landmark, this is extremely risky in India
    if (!structured.house_or_flat) {
      breakdown.push({ item: "No Landmark and No Door Number", delta: -20 });
      score -= 20;
      consolidatedFlags.push("NO_ANCHOR_REFERENCE");
      recommendations.push("Address has neither house number nor landmark; delivery partner will likely mark customer unreachable.");
    } else {
      breakdown.push({ item: "Missing Landmark", delta: -5 });
      score -= 5;
    }
  }

  // 4. Locality / Sub-locality Check
  if (structured.locality) {
    breakdown.push({ item: "Locality Identified", delta: +5 });
    score += 5;
  } else {
    breakdown.push({ item: "Missing Locality", delta: -15 });
    score -= 15;
    consolidatedFlags.push("MISSING_LOCALITY");
    recommendations.push("Locality is missing; packet may get stuck at branch office level.");
  }

  // 5. City & State Check
  if (structured.canonical_city) {
    breakdown.push({ item: "Canonical City Identified", delta: +5 });
    score += 5;
  } else {
    breakdown.push({ item: "Unresolved City", delta: -25 });
    score -= 25;
    consolidatedFlags.push("UNRESOLVED_CITY");
  }

  // Clamp score between 0 and 100
  let finalScore = Math.max(0, Math.min(100, score));

  // Critical Guardrail: If PIN belongs to a completely different state (e.g. Karnataka PIN with UP address),
  // packet will be misrouted at hub level. Force high risk regardless of other fields.
  const hasCriticalStateMismatch = pinValidation.state_matches === false;
  if (hasCriticalStateMismatch) {
    finalScore = Math.min(finalScore, 45);
  }

  // Determine Grade & Risk Level
  let grade = "F";
  let riskLevel = "HIGH";
  let rtoRisk = "HIGH_RTO_RISK";

  if (finalScore >= 85) {
    grade = "A";
    riskLevel = "LOW";
    rtoRisk = "LOW_RTO_RISK";
    recommendations.unshift("Address verified with high confidence. Approved for automated dispatch.");
  } else if (finalScore >= 70) {
    grade = "B";
    riskLevel = "LOW";
    rtoRisk = "LOW_RTO_RISK";
    recommendations.unshift("Good address quality. Minor missing anchors can be resolved by delivery agent.");
  } else if (finalScore >= 50) {
    grade = "C";
    riskLevel = "MEDIUM";
    rtoRisk = "MODERATE_RTO_RISK";
    recommendations.unshift("Moderate RTO risk. Suggest sending WhatsApp confirmation or automated IVR call.");
  } else {
    grade = "D";
    riskLevel = "HIGH";
    rtoRisk = "HIGH_RTO_RISK";
    recommendations.unshift(
      hasCriticalStateMismatch 
        ? "CRITICAL: State mismatch detected. Address state does not match PIN postal zone. Intercept order to prevent misrouting."
        : "High RTO risk. Do not dispatch without customer confirmation of missing fields."
    );
  }

  return {
    deliverability_score: finalScore,
    grade,
    risk_level: riskLevel,
    rto_risk_prediction: rtoRisk,
    score_breakdown: breakdown,
    flags: Array.from(new Set(consolidatedFlags)),
    recommendations,
  };
}

module.exports = {
  calculateDeliverabilityScore,
};
