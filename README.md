# PataAI | IndicAddress 🇮🇳

**Vernacular Indian Address Standardization, Landmark Extraction & Geocoding Intelligence Engine**

Built with **Sarvam AI** (`sarvam-105b-conversations` and `client.text.identifyLanguage`).

---

## The Problem

Over **60% of tier-2/3 Indian e-commerce and logistics addresses** are unstandardized, written in Roman-script Hindi (Hinglish) or regional dialects with spatial landmarks (*"Shiv mandir ke peeche, Lanka, Banaras"*). 

Standard commercial geocoders (Google Maps, MapmyIndia) and Western parsers (`libpostal`) fail on these addresses because they lack formal house-number/street hierarchies. This causes:
- High **Return to Origin (RTO)** rates (~15–30% in tier-2/3 e-commerce).
- Failed delivery attempts and delivery driver confusion.
- Inaccurate geocoding clustering around city centroids instead of actual local anchors.

---

## Solution: PataAI

PataAI takes raw, messy, vernacular addresses and produces:
1. **Structured Geographic Tokens**: House/Flat, Street/Gali, Landmark, Locality, Canonical City, District, State, and PIN Code.
2. **Spatial Landmark Reasoning**: Normalizes colloquial prepositions (*"ke peeche"* $\to$ `[BEHIND]`, *"ke samne"* $\to$ `[OPPOSITE]`, *"ke paas"* $\to$ `[NEAR]`, *"ke upar"* $\to$ `[ABOVE]`).
3. **Canonical City & Alias Disambiguation**: Resolves historical and colloquial aliases (*Banaras* $\to$ `Varanasi`, *Bombay* $\to$ `Mumbai`, *Baroda* $\to$ `Vadodara`, *Bangalore* $\to$ `Bengaluru`, *Poona* $\to$ `Pune`).
4. **India Post 6-Digit PIN Gazetteer**: Validates PIN structure and flags critical state mismatches (e.g. Varanasi, UP with Karnataka PIN `560038`).
5. **Deliverability & RTO Risk Scorer**: Computes an objective 0–100 Confidence Score, Letter Grade (A to D), and RTO Risk Level with actionable ops recommendations.
6. **Hierarchical Geocoding**: Progressively falls back from `LANDMARK_LEVEL` $\to$ `LOCALITY_LEVEL` $\to$ `PINCODE_CENTROID` $\to$ `CITY_CENTROID`.
7. **Bilingual Output**: Generates both an English courier label and native Indic script (Devanagari).

---

## Architecture

```
Raw Address String (e.g. 'Hno 14 gali no 3, shiv mandir ke peeche, Lanka, Banaras, UP 221005')
  │
  ├──> [Sarvam AI Language & Script Detector] ──> hi-IN (Latin Romanized)
  │
  ├──> [Sarvam-105B Reasoning Engine] ──> Structured Tokens + Spatial Prepositions
  │
  ├──> [India Post PIN Gazetteer] ──> State / Circle Cross-Check
  │
  ├──> [Deliverability Scorer] ──> Confidence Score (0-100), Grade A-D, RTO Risk
  │
  └──> [Hierarchical Geocoder] ──> Coordinates & Resolution Level
```

---

## Quick Start

### 1. Prerequisites
- Node.js v18+ (tested on Node 22)
- A [Sarvam AI](https://docs.sarvam.ai) API Subscription Key

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/rak1403/PataAI.git
cd PataAI

# Install dependencies
npm install

# Create your .env file
echo "SARVAM_API_KEY=your_key_here" > .env
```

### 3. Run the Web Dashboard
```bash
npm run serve
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser for the interactive map and address scorecard dashboard.

### 4. Run CLI Tests
```bash
# Benchmark parser on 5 vernacular Indian address test cases
npm run test:parser

# Benchmark end-to-end engine with PIN validation and RTO risk scoring
npm run test:engine

# Interactive terminal chat with Sarvam-105B
npm start
```

---

## API Usage

### `POST /api/v1/standardize`

```bash
curl -X POST http://localhost:3000/api/v1/standardize \
  -H "Content-Type: application/json" \
  -d '{"address": "Hno 14 gali no 3, shiv mandir ke peeche, Lanka, Banaras, UP 221005"}'
```

**Response:**
```json
{
  "raw_address": "Hno 14 gali no 3, shiv mandir ke peeche, Lanka, Banaras, UP 221005",
  "detected_script": {
    "language_code": "hi-IN",
    "script": "Latin (Roman)",
    "is_vernacular_romanized": true
  },
  "structured": {
    "house_or_flat": "H.No 14",
    "street_or_road": "Gali No 3",
    "landmark": "Shiv Mandir",
    "landmark_relation": "BEHIND",
    "locality": "Lanka",
    "canonical_city": "Varanasi",
    "detected_alias": "Banaras",
    "state": "Uttar Pradesh",
    "pincode": "221005"
  },
  "standardized_address_en": "H.No 14, Gali No 3, Behind Shiv Mandir, Lanka, Varanasi, Uttar Pradesh, 221005",
  "standardized_address_indic": "एच.नं 14, गली नं 3, शिव मंदिर के पीछे, लंका, वाराणसी, उत्तर प्रदेश, 221005",
  "pincode_validation": {
    "is_valid": true,
    "state_matches": true
  },
  "assessment": {
    "score": 100,
    "grade": "A",
    "risk_level": "LOW",
    "rto_risk": "LOW_RTO_RISK",
    "recommendations": [
      "Address verified with high confidence. Approved for automated dispatch."
    ]
  },
  "geocoding": {
    "latitude": 25.2811,
    "longitude": 82.9988,
    "resolution_level": "LOCALITY_LEVEL"
  }
}
```

---

## Benchmark Evaluation Results

| Test Scenario | Raw Input | Extracted Landmark & Relation | Canonical City | PIN Status | Score | Grade & Risk | Action Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier-2 Colloquial + Landmark** | `"Hno 14 gali no 3, shiv mandir ke peeche, Lanka, Banaras, UP 221005"` | `[BEHIND] Shiv Mandir` | `Varanasi` (alias: *Banaras*) | ✓ Valid (UP) | **100/100** | **Grade A (LOW)** | Approved for automated dispatch |
| **Missing Door # + Landmark** | `"water tanki ke samne, kalyan nagar, Baroda"` | `[OPPOSITE] Water Tank` | `Vadodara` (alias: *Baroda*) | ✗ Missing | **65/100** | **Grade C (MEDIUM)** | Send WhatsApp/IVR confirmation for door # |
| **Commercial + Multi-Landmark** | `"Shop no 12, opp bus stand, near sbi atm, thane west, bombay 400601"` | `[OPPOSITE] Bus Stand` | `Mumbai` (alias: *Bombay*) | ✓ Valid (MH) | **95/100** | **Grade A (LOW)** | Approved for automated dispatch |
| **South Indian Cross/Main** | `"Flat 204, SLV Residency, 4th cross, near rama temple, Indiranagar, Bangalore 560038"` | `[NEAR] Rama Temple` | `Bengaluru` (alias: *Bangalore*) | ✓ Valid (KA) | **100/100** | **Grade A (LOW)** | Approved for automated dispatch |
| **Native Script (Jaipur)** | `"मकान नं 25, हनुमान मंदिर के पास, शास्त्री नगर, जयपुर 302016"` | `[NEAR] हनुमान मंदिर` | `Jaipur` | ✓ Valid (RJ) | **100/100** | **Grade A (LOW)** | Approved for automated dispatch |
| **Contradictory / Spoofed PIN** | `"Plot 5, shiv temple road, Lanka, Varanasi, UP 560038"` | `[NONE] Shiv Temple` | `Varanasi` | ✗ State Mismatch | **45/100** | **Grade D (HIGH)** | **CRITICAL: State mismatch. Intercept order to prevent misrouting.** |

---

## Tech Stack
- **AI Core**: Sarvam AI JavaScript SDK (`sarvamai`)
- **Backend**: Native Node.js HTTP server (zero extra runtime dependencies)
- **Frontend**: Leaflet.js, OpenStreetMap, Vanilla CSS Glassmorphism
