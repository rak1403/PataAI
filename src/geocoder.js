/**
 * Geocoding Resolver using hierarchical search & fallback.
 * Queries OpenStreetMap Nominatim with structured Indian address tokens.
 */

async function geocodeStructuredAddress(structured) {
  const {
    landmark,
    locality,
    canonical_city,
    state,
    pincode,
  } = structured;

  // Build hierarchical queries from most specific to least specific
  const queries = [];

  // Query 1: Landmark + Locality + City (Highest precision)
  if (landmark && locality && canonical_city) {
    queries.push({
      q: `${landmark}, ${locality}, ${canonical_city}, India`,
      resolution: "LANDMARK_LEVEL",
    });
  }

  // Query 2: Locality + City + PIN
  if (locality && canonical_city) {
    queries.push({
      q: `${locality}, ${canonical_city}${pincode ? ` ${pincode}` : ""}, India`,
      resolution: "LOCALITY_LEVEL",
    });
  }

  // Query 3: PIN Code centroid
  if (pincode) {
    queries.push({
      q: `${pincode}, India`,
      resolution: "PINCODE_CENTROID",
    });
  }

  // Query 4: Canonical City centroid (Fallback)
  if (canonical_city) {
    queries.push({
      q: `${canonical_city}, ${state || "India"}`,
      resolution: "CITY_CENTROID",
    });
  }

  for (const queryObj of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryObj.q)}&countrycodes=in&limit=1`;
      
      const res = await fetch(url, {
        headers: {
          "User-Agent": "PataAI-IndicAddress-Buildathon/1.0",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const match = data[0];
          return {
            latitude: parseFloat(match.lat),
            longitude: parseFloat(match.lon),
            display_name: match.display_name,
            resolution_level: queryObj.resolution,
            bounding_box: match.boundingbox || null,
            matched_query: queryObj.q,
          };
        }
      }
    } catch {
      // Continue to next fallback query
    }
  }

  return {
    latitude: 20.5937,
    longitude: 78.9629,
    display_name: "India (Unresolved centroid)",
    resolution_level: "UNRESOLVED",
    bounding_box: null,
    matched_query: null,
  };
}

module.exports = {
  geocodeStructuredAddress,
};
