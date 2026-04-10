export interface RatingCriterion {
  key: string
  label: string
  required: boolean
  description?: string
}

export interface CategoryCriteria {
  criteria: RatingCriterion[]
}

// Per-category rating criteria - 5 focused criteria each
export const CATEGORY_CRITERIA: Record<string, CategoryCriteria> = {
  "bar": {
    criteria: [
      { key: "drinksQuality",        label: "Drinks Quality & Selection", required: true, description: "Variety and quality of beers, cocktails and spirits on offer." },
      { key: "ambianceMusic",        label: "Ambiance & Music",           required: true, description: "Lights, music, decor and overall vibe – is it a place where you actually want to hang out." },
      { key: "comfortLayout",        label: "Comfort & Layout",           required: true, description: "Seating comfort, space, air-con and how well the bar is laid out." },
      { key: "staffService",         label: "Staff & Service",            required: true, description: "How friendly, attentive and fast the staff are." },
      { key: "valueForMoney",        label: "Value for Money",            required: true, description: "Drink prices versus quality, location and the overall experience you get." },
    ],
  },

  "girly-bar": {
    criteria: [
      { key: "girlQualityFreshness", label: "Girl Quality & Freshness",  required: true, description: "How attractive, fresh and varied the girls are on a typical night." },
      { key: "interactionFun",       label: "Interaction & Fun",         required: true, description: "Do the girls naturally talk, flirt and create a fun, relaxed atmosphere." },
      { key: "ambianceMusic",        label: "Ambiance & Music",          required: true, description: "Lights, music and overall vibe – is it a place where you actually want to stay." },
      { key: "comfortLayout",        label: "Comfort & Layout",          required: true, description: "How comfortable the seating is, how much space you have and how well the bar is laid out." },
      { key: "valueNoHustle",        label: "Value & No-Hustle",         required: true, description: "Drink and lady drink prices versus the place, and how pushy (or not) the staff and girls are." },
    ],
  },

  "gogo-bar": {
    criteria: [
      { key: "dancersBeautyFreshness",  label: "Dancers Beauty & Freshness",  required: true, description: "Overall looks, freshness and variety of the girls dancing on stage." },
      { key: "lineupDensityRotation",   label: "Line-Up Density & Rotation",  required: true, description: "How many girls are on stage and how often the line-up changes during the night." },
      { key: "ambianceAtmosphere",      label: "Ambiance & Atmosphere",       required: true, description: "Stage lighting, sound, crowd energy and how much it feels like a real show." },
      { key: "comfortStageView",        label: "Comfort & Stage View",        required: true, description: "Seat comfort, air-con and how clearly you can see the stage without obstructions." },
      { key: "valueHustleLevel",        label: "Value & Hustle Level",        required: true, description: "Drink and barfine prices versus the line-up, and how aggressive the hustle for lady drinks feels." },
    ],
  },

  "club": {
    criteria: [
      { key: "crowdGirlsQuality", label: "Girls & Crowd Quality",   required: true, description: "Overall attractiveness and style of the girls and the balance between girls and guys." },
      { key: "musicDjQuality",    label: "Music & DJ Quality",      required: true, description: "Sound system, track selection and how good the DJ keeps the energy up." },
      { key: "partyEnergy",       label: "Party Energy",            required: true, description: "How alive the dance floor and crowd feel – people actually dancing and partying or not." },
      { key: "comfortFlow",       label: "Comfort & Flow",          required: true, description: "Space to move, air-con, and how easy it is to move between bar, dance floor and tables." },
      { key: "drinkTableValue",   label: "Drink & Table Value",     required: true, description: "Prices of drinks and bottles versus the real standing of the club and what you get for your money." },
    ],
  },

  "gentlemans-club": {
    criteria: [
      { key: "girlBeautySexAppeal", label: "Girl Beauty & Sex Appeal",  required: true, description: "How attractive, well-dressed and seductive the girls are compared to a normal bar." },
      { key: "connectionGfeVibe",   label: "Connection & GFE Vibe",     required: true, description: "Quality of conversation, comfort and how much it feels like a real girlfriend experience." },
      { key: "luxuryPrivacy",       label: "Luxury & Privacy",          required: true, description: "Decor, lighting and how exclusive, quiet and private the club feels." },
      { key: "privateAreaComfort",  label: "Private Area Comfort",      required: true, description: "Comfort of sofas and private rooms, air-con and sound isolation when you move away from the main area." },
      { key: "valueForMoney",       label: "Value for Money",           required: true, description: "Prices of lady drinks, barfines and private rooms versus the looks of the girls and the overall experience." },
    ],
  },

  "ktv": {
    criteria: [
      { key: "hostessBeautyFreshness", label: "Hostess Beauty & Freshness", required: true, description: "How attractive and fresh the hostesses usually are." },
      { key: "hostessEngagement",      label: "Hostess Engagement",         required: true, description: "Do they drink, sing, play and keep you entertained instead of just sitting on their phone." },
      { key: "roomSoundQuality",       label: "Room & Sound Quality",       required: true, description: "Room size, air-con, seating comfort and quality of karaoke sound system and song list." },
      { key: "intimacyLevel",          label: "Intimacy Level",             required: true, description: "How physically close and intimate the experience usually gets in this place." },
      { key: "packageValueClarity",    label: "Package & Value Clarity",    required: true, description: "How clear and fair the pricing is for hours, bottles and extras – no hidden surprises." },
    ],
  },

  "bj-bar": {
    criteria: [
      { key: "girlBeautyFreshness",  label: "Girl Beauty & Freshness",   required: true, description: "Looks and freshness of the girls both at the bar and in the booths." },
      { key: "welcomeEase",          label: "Welcome & Ease",            required: true, description: "How comfortable and at ease you feel when you arrive, especially if it's your first time." },
      { key: "bjQualityEnthusiasm",  label: "BJ Quality & Enthusiasm",   required: true, description: "Technique, effort and duration of the blowjob – the main event here." },
      { key: "boothHygienePrivacy",  label: "Booth Hygiene & Privacy",   required: true, description: "Cleanliness, smell, air-con and how private the booth really feels." },
      { key: "priceTimeHonesty",     label: "Price / Time Honesty",      required: true, description: "How clear and fair the pricing and real time spent are, plus how reasonable the expected tip is." },
    ],
  },

  "massage": {
    criteria: [
      { key: "masseuseLooksFreshness", label: "Masseuse Looks & Freshness", required: true, description: "How attractive and fresh the masseuses usually are when you walk in." },
      { key: "warmthChemistry",        label: "Warmth & Chemistry",         required: true, description: "Welcome, attitude and how comfortable and relaxed you feel with her." },
      { key: "massageTechnique",       label: "Massage Technique",          required: true, description: "Quality of the actual massage – pressure, coverage and how your body feels afterwards." },
      { key: "roomFacilities",         label: "Room & Facilities",          required: true, description: "Cleanliness, smell, shower, towels, air-con and how private the room is." },
      { key: "extrasTransparency",     label: "Extras & Transparency",      required: true, description: "What kind of extras are realistically possible and how clear and fair the pricing is around them." },
    ],
  },

  "short-time-hotel": {
    criteria: [
      { key: "cleanlinessSmell",   label: "Cleanliness & Smell",      required: true, description: "How clean the room, sheets and bathroom are, and if there are any bad smells." },
      { key: "roomComfortSetup",   label: "Room Comfort & Setup",     required: true, description: "Bed quality, pillows, air-con, hot water and any useful furniture like mirrors or chairs." },
      { key: "discretionAccess",   label: "Discretion & Access",      required: true, description: "Parking, entrance and check-in – how fast and discreet the whole process feels." },
      { key: "soundPrivacy",       label: "Sound & Privacy",          required: true, description: "Sound isolation from neighbours and staff, and how safe you feel from interruptions." },
      { key: "valuePerSession",    label: "Value per Session",        required: true, description: "Price for 1–3 hours versus real quality of the room and flexibility on timing." },
    ],
  },

  "coffee-shop": {
    criteria: [
      { key: "weedQualityChoice",   label: "Weed Quality & Choice",     required: true, description: "Freshness, cure and variety of strains, and how honest the effects are compared to what is advertised." },
      { key: "budtenderKnowledge",  label: "Budtender Knowledge",       required: true, description: "How well the staff can recommend strains based on the effect you want and budget." },
      { key: "chillAmbiance",       label: "Chill Ambiance",            required: true, description: "Music, decor and vibe – is it a place where you enjoy hanging out." },
      { key: "sessionComfort",      label: "Session Comfort",           required: true, description: "Possibility to consume on site, seating comfort, air-con and availability of bongs/pipes/ashtrays." },
      { key: "priceDeals",          label: "Price & Deals",             required: true, description: "Price per gram versus quality, any deals or happy hours and how fair the weighing and pricing feel." },
    ],
  },

  // ── Ladyboy variants ──

  "ladyboy-bar": {
    criteria: [
      { key: "ladyboyBeautyFreshness",  label: "Ladyboy Beauty & Freshness",    required: true, description: "Overall looks, freshness and variety of the ladyboys in the bar." },
      { key: "funPlayfulnessRespect",   label: "Fun, Playfulness & Respect",    required: true, description: "How playful and fun they are while still respecting your limits and comfort." },
      { key: "ambianceSafetyFeeling",   label: "Ambiance & Safety Feeling",     required: true, description: "Music, lighting, crowd and how safe and relaxed you feel in the bar." },
      { key: "comfortLayout",           label: "Comfort & Layout",              required: true, description: "Seat comfort, space and how easy it is to sit and watch or chat." },
      { key: "valuePressureLevel",      label: "Value & Pressure Level",        required: true, description: "Drink and lady drink prices versus the experience, and how pushy the hustle feels." },
    ],
  },

  // ── Gay variants ──

  "gay-bar": {
    criteria: [
      { key: "guysLooksMix",       label: "Guys Looks & Mix",        required: true, description: "Overall attractiveness of the guys and mix of tourists, expats and locals." },
      { key: "vibeInclusiveness",   label: "Vibe & Inclusiveness",    required: true, description: "How welcoming, open and non-judgmental the bar feels for different types of people." },
      { key: "musicMood",          label: "Music & Mood",            required: true, description: "Music style, volume and whether it works well for talking, flirting or dancing." },
      { key: "comfortSpace",       label: "Comfort & Space",         required: true, description: "Terraces, seating, room to move and how comfortable it is to stay for a long time." },
      { key: "priceSafety",        label: "Price & Safety",          required: true, description: "Drink prices versus the place, and how safe you feel regarding scams or drunk drama." },
    ],
  },
}

// Map sub-category slugs to their parent criteria
const CATEGORY_ALIAS: Record<string, string> = {
  "russian-gogo":            "gogo-bar",
  "ladyboy-gogo":            "gogo-bar",
  "ladyboy-club":            "club",
  "ladyboy-massage":         "massage",
  "ladyboy-gentlemens-club": "gentlemans-club",
  "gay-gogo":                "gogo-bar",
  "gay-club":                "club",
  "gay-massage":             "massage",
}

// Fallback for unknown categories
export const DEFAULT_CRITERIA: CategoryCriteria = {
  criteria: [
    { key: "quality",  label: "Overall Quality",  required: true, description: "General quality of the experience" },
    { key: "ambiance", label: "Ambiance",          required: true, description: "Atmosphere and vibe" },
    { key: "comfort",  label: "Comfort",           required: true, description: "How comfortable the place is" },
    { key: "staff",    label: "Staff & Service",   required: true, description: "Friendliness and service" },
    { key: "value",    label: "Value for Money",   required: true, description: "Was it worth it" },
  ],
}

export function getCriteriaForCategory(categorySlug: string): RatingCriterion[] {
  const resolved = CATEGORY_ALIAS[categorySlug] ?? categorySlug
  return (CATEGORY_CRITERIA[resolved] ?? DEFAULT_CRITERIA).criteria
}
