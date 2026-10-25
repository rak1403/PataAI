/**
 * Indian Postal PIN Code (Postal Index Number) Validator & Gazetteer.
 * 
 * Logic based on India Post's 9 postal zones and 2-digit circle prefixes.
 */

// Mapping of 2-digit PIN prefixes to States/UTs
const PIN_PREFIX_STATE_MAP = {
  "11": "Delhi",
  "12": "Haryana",
  "13": "Haryana",
  "14": "Punjab",
  "15": "Punjab",
  "16": "Chandigarh",
  "17": "Himachal Pradesh",
  "18": "Jammu and Kashmir",
  "19": "Jammu and Kashmir",
  "20": "Uttar Pradesh",
  "21": "Uttar Pradesh",
  "22": "Uttar Pradesh",
  "23": "Uttar Pradesh",
  "24": "Uttarakhand",
  "25": "Uttar Pradesh",
  "26": "Uttar Pradesh",
  "27": "Uttar Pradesh",
  "28": "Uttar Pradesh",
  "30": "Rajasthan",
  "31": "Rajasthan",
  "32": "Rajasthan",
  "33": "Rajasthan",
  "34": "Rajasthan",
  "36": "Gujarat",
  "37": "Gujarat",
  "38": "Gujarat",
  "39": "Gujarat",
  "40": "Maharashtra",
  "41": "Maharashtra",
  "42": "Maharashtra",
  "43": "Maharashtra",
  "44": "Maharashtra",
  "45": "Madhya Pradesh",
  "46": "Madhya Pradesh",
  "47": "Madhya Pradesh",
  "48": "Madhya Pradesh",
  "49": "Chhattisgarh",
  "50": "Telangana",
  "51": "Andhra Pradesh",
  "52": "Andhra Pradesh",
  "53": "Andhra Pradesh",
  "56": "Karnataka",
  "57": "Karnataka",
  "58": "Karnataka",
  "59": "Karnataka",
  "60": "Tamil Nadu",
  "61": "Tamil Nadu",
  "62": "Tamil Nadu",
  "63": "Tamil Nadu",
  "64": "Tamil Nadu",
  "67": "Kerala",
  "68": "Kerala",
  "69": "Kerala",
  "70": "West Bengal",
  "71": "West Bengal",
  "72": "West Bengal",
  "73": "West Bengal",
  "74": "West Bengal",
  "75": "Odisha",
  "76": "Odisha",
  "77": "Odisha",
  "78": "Assam",
  "79": "North East",
  "80": "Bihar",
  "81": "Bihar",
  "82": "Bihar",
  "83": "Jharkhand",
  "84": "Bihar",
  "85": "Bihar",
};

// Known 3-digit city prefixes for rapid gazetteer cross-checking
const CITY_PIN_PREFIX_MAP = {
  "varanasi": ["221"],
  "prayagraj": ["211"],
  "lucknow": ["226"],
  "kanpur": ["208"],
  "agra": ["282"],
  "noida": ["201"],
  "ghaziabad": ["201"],
  "delhi": ["110"],
  "new delhi": ["110"],
  "mumbai": ["400"],
  "thane": ["400", "421"],
  "navi mumbai": ["400", "410"],
  "pune": ["411", "412"],
  "nagpur": ["440", "441"],
  "nashik": ["422"],
  "vadodara": ["390", "391"],
  "ahmedabad": ["380", "382"],
  "surat": ["394", "395"],
  "rajkot": ["360"],
  "jaipur": ["302", "303"],
  "jodhpur": ["342"],
  "udaipur": ["313"],
  "bengaluru": ["560", "562"],
  "mysuru": ["570"],
  "mangaluru": ["575"],
  "hyderabad": ["500", "501"],
  "secunderabad": ["500"],
  "visakhapatnam": ["530", "531"],
  "vijayawada": ["520"],
  "chennai": ["600"],
  "coimbatore": ["641"],
  "madurai": ["625"],
  "kochi": ["682", "683"],
  "thiruvananthapuram": ["695"],
  "kolkata": ["700"],
  "howrah": ["711"],
  "bhubaneswar": ["751"],
  "cuttack": ["753"],
  "patna": ["800"],
  "ranchi": ["834"],
  "jamshedpur": ["831"],
  "guwahati": ["781"],
  "chandigarh": ["160"],
  "indore": ["452"],
  "bhopal": ["462"],
};

/**
 * Validates a 6-digit PIN code against the parsed city and state.
 * 
 * @param {string|null} pincode - 6-digit Indian PIN code
 * @param {string|null} city - Canonical or parsed city name
 * @param {string|null} state - Parsed state name
 * @returns {object} Validation result
 */
function validatePincode(pincode, city = null, state = null) {
  if (!pincode) {
    return {
      is_valid: false,
      reason: "PIN_CODE_MISSING",
      state_from_pin: null,
      state_matches: null,
      city_matches: null,
      flags: ["MISSING_PINCODE"],
    };
  }

  const cleanPin = String(pincode).trim();
  const pinRegex = /^[1-9][0-9]{5}$/;

  if (!pinRegex.test(cleanPin)) {
    return {
      is_valid: false,
      reason: "INVALID_PIN_FORMAT",
      state_from_pin: null,
      state_matches: false,
      city_matches: false,
      flags: ["INVALID_PIN_CODE_FORMAT"],
    };
  }

  const prefix2 = cleanPin.slice(0, 2);
  const prefix3 = cleanPin.slice(0, 3);
  const stateFromPin = PIN_PREFIX_STATE_MAP[prefix2] || null;

  const flags = [];
  let stateMatches = null;
  let cityMatches = null;

  // Cross-check state if provided
  if (state && stateFromPin) {
    const normalizedInputState = state.toLowerCase().replace(/[^a-z]/g, "");
    const normalizedPinState = stateFromPin.toLowerCase().replace(/[^a-z]/g, "");
    stateMatches = normalizedInputState.includes(normalizedPinState) || normalizedPinState.includes(normalizedInputState);

    if (!stateMatches) {
      flags.push(`PIN_STATE_MISMATCH: PIN ${cleanPin} belongs to ${stateFromPin}, but address states ${state}`);
    }
  }

  // Cross-check city if known in gazetteer
  if (city) {
    const normCity = city.toLowerCase().replace(/[^a-z]/g, "");
    const expectedPrefixes = CITY_PIN_PREFIX_MAP[normCity];

    if (expectedPrefixes) {
      cityMatches = expectedPrefixes.some(p => cleanPin.startsWith(p));
      if (!cityMatches) {
        flags.push(`PIN_CITY_MISMATCH: PIN ${cleanPin} prefix ${prefix3} does not match typical prefixes for ${city} (${expectedPrefixes.join(", ")})`);
      }
    }
  }

  return {
    is_valid: true,
    pincode: cleanPin,
    postal_zone: cleanPin[0],
    state_from_pin: stateFromPin,
    state_matches: stateMatches,
    city_matches: cityMatches,
    flags,
  };
}

module.exports = {
  validatePincode,
  PIN_PREFIX_STATE_MAP,
  CITY_PIN_PREFIX_MAP,
};
