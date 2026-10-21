/**
 * The Brass Book — Definitive Encyclopedia of Indian Brasscraft & Living Metal
 * Curated by Decorbeats Atelier (Moradabad to Bengaluru)
 */

export const BRASS_STATS = [
  { value: "5,000+", label: "Years of Indian Metallurgy", note: "Traced to the Indus Valley Dancing Girl (2500 BCE)" },
  { value: "950°C", label: "Smelting Alchemy", note: "Crucible temperature to fuse pure Copper & Zinc" },
  { value: "7 Sacred", label: "Crafting Stages", note: "Generational Dhokra, Lost-Wax & Naqqashi carving" },
  { value: "100%", label: "Solid Living Metal", note: "Heirloom grade, non-ferrous & naturally antimicrobial" }
];

export const ALLOY_PRESETS = [
  {
    copper: 60,
    zinc: 40,
    name: "Muntz Metal (Yellow Brass / पीला पीतल)",
    shortName: "Muntz Metal",
    traditionalName: "पीला पीतल",
    tag: "High Tensile & Structural",
    color: "#e6ca65",
    glow: "rgba(230, 202, 101, 0.45)",
    pitchMultiplier: 1.18,
    strength: "Very High Tensile Strength",
    ductility: "Moderate (Hot-worked)",
    resonance: "Bright, crisp acoustic strike (693 Hz)",
    bestFor: "Heavy architectural bells, thick-rimmed urlis, door handles, and heavy pedestal diyas",
    description: "The classic high-strength yellow alloy. Formulated by George Muntz in 1832, Indian artisans have used this 60:40 proportion for centuries to cast heavy load-bearing items that endure daily temple ablutions."
  },
  {
    copper: 65,
    zinc: 35,
    name: "Commercial Brass (Deepam Grade / मानक पीतल)",
    shortName: "Commercial Brass",
    traditionalName: "मानक पीतल",
    tag: "Durable All-Rounder",
    color: "#ddbc4c",
    glow: "rgba(221, 188, 76, 0.45)",
    pitchMultiplier: 1.08,
    strength: "High Tensile & Good Malleability",
    ductility: "Balanced (Hot & Cold worked)",
    resonance: "Clear, resonant ring (634 Hz)",
    bestFor: "Multi-step kuthu vilakkus, heavy akhand diyas, and temple pooja bells",
    description: "The most widely used traditional casting alloy in North Indian ateliers. Offers excellent fluidity in sand casting while retaining a bright, warm golden presence."
  },
  {
    copper: 70,
    zinc: 30,
    name: "Cartridge Brass (Prince's Metal / स्वर्ण पीतल)",
    shortName: "Cartridge Brass",
    traditionalName: "स्वर्ण पीतल",
    tag: "22K Gold Luster & Master Carving",
    color: "#d4af37",
    glow: "rgba(212, 175, 55, 0.5)",
    pitchMultiplier: 1.0,
    strength: "Optimal Balance of Strength & Ductility",
    ductility: "Exceptional (Cold-worked & deep drawn)",
    resonance: "Warm, lingering 5-second harmonic ping (587 Hz)",
    bestFor: "Fine hand-engraved urlis, peacock deepams, singing bowls, and intricate filigree art",
    description: "The gold standard of luxury brasscraft. With 70% virgin copper, it has a rich, warm, honey-gold luster resembling 22K gold. Highly malleable, allowing master engravers (Naqqash) to carve microscopic floral and deity motifs without micro-fracturing."
  },
  {
    copper: 80,
    zinc: 20,
    name: "Low Brass (Dutch Metal / सुनहरी पीतल)",
    shortName: "Low Brass",
    traditionalName: "सुनहरी पीतल",
    tag: "High Ductility & Warmth",
    color: "#cb9943",
    glow: "rgba(203, 153, 67, 0.45)",
    pitchMultiplier: 0.9,
    strength: "High Ductility, Rich Undertones",
    ductility: "Supreme Deep-Drawing Quality",
    resonance: "Mellow, lingering chime (528 Hz Love Frequency)",
    bestFor: "Hammered urli bowls, repoussé deity medallions, and fine spun brassware",
    description: "Known for its radiant golden-amber hue and superior flexibility under hand-hammering. Often chosen for intricate repoussé metal panels and high-resonance sacred instruments."
  },
  {
    copper: 85,
    zinc: 15,
    name: "Red Brass / Tombac (ताम्र पीतल)",
    shortName: "Red Brass (Tombac)",
    traditionalName: "ताम्र पीतल",
    tag: "Agni Conductor & Sacred Murti",
    color: "#c88a4b",
    glow: "rgba(200, 138, 75, 0.45)",
    pitchMultiplier: 0.82,
    strength: "High Ductility, Soft Glow",
    ductility: "Supreme Softness & Formability",
    resonance: "Deep, meditative low-frequency hum (481 Hz)",
    bestFor: "Sacred sanctum idols (Murtis), Panchamrit vessels, and heirloom pooja thalis",
    description: "Rich in copper with a warm reddish undertone. Revered in traditional Agama Shastra scriptures because copper is the conductor of Agni (fire element). Develops a noble antique temple patina over decades."
  }
];

export const METAL_COMPARISONS = [
  {
    name: "Pure Solid Brass (Decorbeats Grade)",
    alloy: "Copper (65-70%) + Zinc (30-35%)",
    color: "Radiant Golden Honey / 22K Gold Luster",
    density: "8.40 – 8.73 g/cm³ (Substantial, heavy in hand)",
    resonance: "Harmonically rich chime (432Hz sustain, 4-7 seconds)",
    rustResistance: "100% Rust-proof (Forms protective patina, never flakes)",
    spiritualGrade: "Sattvic (Prescribed in Vedas for daily Pooja & Vastu)",
    lifespan: "Generational (100+ years heirloom durability)",
    verdict: "The undisputed king of Indian festive decor and pooja living."
  },
  {
    name: "Traditional Bronze (Kansa / Bell Metal)",
    alloy: "Copper (78-80%) + Tin (20-22%)",
    color: "Subtle Olive-Gold / Earthy Champagne",
    density: "8.70 – 8.90 g/cm³ (Extremely dense, brittle)",
    resonance: "Exceptional bell chime (Longest acoustic resonance)",
    rustResistance: "100% Rust-proof (Forms noble brown/green patina)",
    spiritualGrade: "Ayurvedic Super-metal (Prescribed for eating/drinking)",
    lifespan: "Centuries (Brittle if dropped hard on granite)",
    verdict: "Supreme for dining thalis, sound healing, and sanctum gongs."
  },
  {
    name: "Pure Copper (Tamba / तांबा)",
    alloy: "Copper (99.2%+) Elemental Metal",
    color: "Vibrant Salmon Pink / Reddish Brown",
    density: "8.96 g/cm³ (Very heavy, relatively soft)",
    resonance: "Low, dull ring (Soft metal absorbs acoustic energy)",
    rustResistance: "Rust-proof (Rapidly oxidizes to verdigris green)",
    spiritualGrade: "Purifying (Oligodynamic bio-ionizer for water)",
    lifespan: "Decades (Requires frequent polishing to keep shiny)",
    verdict: "Unmatched for drinking water storage (Tamra Jal) and Havana pooja."
  },
  {
    name: "Pot Metal / Iron with Brass Wash (Fake)",
    alloy: "Scrap Zinc/Aluminum/Iron with 2-micron yellow plating",
    color: "Artificial flashy neon yellow / plastic sheen",
    density: "2.70 – 5.50 g/cm³ (Disappointingly light & hollow)",
    resonance: "Dull, flat thud ('clack', 0.2 second decay)",
    rustResistance: "Pits, bubbles, and rusts black within 6–12 months",
    spiritualGrade: "Inauspicious (Iron attracts Tamasic energy in Pooja)",
    lifespan: "6 to 18 months before surface peels away",
    verdict: "Avoid. Cheap market knockoffs that degrade and ruin mandir decor."
  }
];

export const SEVEN_CRAFT_STEPS = [
  {
    step: 1,
    title: "Reti & Bhatti (Master Core & Clay Matrix)",
    hindiTitle: "रेती और मिट्टी की ढलाई",
    artisanRole: "Moulder (Mool Kaarigar)",
    duration: "24–48 Hours",
    temperature: "Ambient Sun Baking",
    icon: "🏺",
    image: "/assets/images/craft/step1-reti-bhatti.jpg",
    videoUrl: "/assets/videos/craft/step1-reti-bhatti.mp4",
    flowPrompt: {
      title: "Google Flow 4K Atelier — Step 1: Reti & Bhatti Clay Core Sculpting",
      duration: "10 Seconds Continuous Loop",
      aspectRatio: "16:9 Cinema 4K",
      cameraMotion: "Slow orbital macro tracking around artisan's hands, 85mm f/2.0 anamorphic cinema lens",
      lighting: "Warm 2700K afternoon sunlight streaming through wooden slats, casting soft specular dust highlights",
      prompt: "Cinematic 16:9 documentary footage inside a Moradabad metalcraft workshop. An experienced Indian craftsman's weathered hands sculpt a damp red clay and Ramganga river-sand mould for an ornamental brass urli. Sunlight pierces dust motes in the air. Natural clay texture, wooden modeling styluses, drying moulds in the background, ultra-realistic slow-motion tactile craftsmanship, 4K resolution, authentic atelier ambiance.",
      negativePrompt: "digital rendering, plastic texture, modern electric tools, cartoonish colors, jerky camera"
    },
    summary: "Every solid brass masterpiece begins in the earth. Artisans blend fine river sand from the Ramganga riverbed with natural molasses and bentonite clay to form the master core.",
    details: "The master mold must breathe: fine pores allow superheated gases to escape during pouring, preventing air pockets. For hollow forms like large floor urlis and bells, a dual-core mold is sculpted and sun-baked for two days until bone-dry."
  },
  {
    step: 2,
    title: "Madhuchishtavidhana (Sacred Lost-Wax Detailing)",
    hindiTitle: "मधूच्छिष्टविधान (मोम की नक्काशी)",
    artisanRole: "Sculptor (Sthapathi)",
    duration: "3–6 Days per Idol",
    temperature: "Gentle Charcoal Warmth (60°C)",
    icon: "🕯️",
    image: "/assets/images/craft/step2-madhuchishtavidhana-wax.jpg",
    videoUrl: "/assets/videos/craft/step2-madhuchishtavidhana.mp4",
    flowPrompt: {
      title: "Google Flow 4K Atelier — Step 2: Madhuchishtavidhana Vedic Lost-Wax Detailing",
      duration: "10 Seconds Continuous Loop",
      aspectRatio: "16:9 Cinema 4K",
      cameraMotion: "Extreme macro push-in focusing on heated stylus carving beeswax feathers and jewelry",
      lighting: "Amber glow from adjacent glowing charcoal brazier with deep atmospheric shadows",
      prompt: "Cinematic 16:9 macro footage in a heritage Indian sculpting room. An elderly master Sthapathi sculptor with wire-rimmed spectacles uses a warm bronze stylus to meticulously carve the crown of a beeswax Lord Ganesha model. Molten resin bead forms on the tip, intricate freehand jewelry relief, soft amber brazier light, 4K cinema documentary, no modern clutter.",
      negativePrompt: "plastic model, 3D printing artifacts, modern lighting, deformed anatomy, shaky handheld camera"
    },
    summary: "An unbroken 4,000-year-old Vedic metallurgical tradition. The artisan hand-sculpts the exact likeness of the deity or peacock motif in pure natural beeswax and damar resin.",
    details: "Every feather of the peacock, every fold of Lakshmi's saree, and the auspicious conch in Ganesha's palm are sculpted freehand in wax. No two wax sculptures are identical, ensuring that every cast piece is a true one-of-a-kind original."
  },
  {
    step: 3,
    title: "Galaai (Crucible Smelting at 950°C)",
    hindiTitle: "गलाई (भट्ठी में 950°C पर पिघलाव)",
    artisanRole: "Foundry Master (Bhatti Vaala)",
    duration: "4–5 Hours",
    temperature: "950°C – 1020°C",
    icon: "🔥",
    image: "/assets/images/craft/step3-galaai-smelting.jpg",
    videoUrl: "/assets/videos/craft/step3-galaai-smelting.mp4",
    flowPrompt: {
      title: "Google Flow 4K Atelier — Step 3: Galaai Crucible Smelting at 950°C",
      duration: "10 Seconds Continuous Loop",
      aspectRatio: "16:9 Cinema 4K",
      cameraMotion: "Slow crane down into glowing foundry furnace pit, heat-wave distortion shimmering across lens",
      lighting: "Blinding incandescent golden-orange molten liquid glow with emerald green copper sparks",
      prompt: "Cinematic 16:9 high-contrast footage of a heavy graphite crucible inside an underground coal-fired foundry furnace in Moradabad. 950°C molten brass bubbles and swirls like liquid sunlight. Vivid emerald-green copper flame sparks flare upward into dark smoky foundry rafters. Intense heat distortion, visceral molten metallic reflections, 4K documentary.",
      negativePrompt: "water splash, cold metal, dull lighting, CGI cartoon flame, flat digital sensor noise"
    },
    summary: "Virgin copper ingots and refined zinc are charged into graphite crucibles inside coal-fired underground blast furnaces.",
    details: "At 950°C, the solid metal turns into glowing liquid gold. The master founder assesses purity by eye: the molten alloy must achieve a blinding lemon-orange luminescence with emerald sparks before it is skimming-ready."
  },
  {
    step: 4,
    title: "Dhaalai (The Molten Pour & De-Molding)",
    hindiTitle: "ढलाई (द्रव धातु का प्रवाह)",
    artisanRole: "Pourer (Dhalai Master)",
    duration: "45 Seconds per Mold",
    temperature: "Cooling over 8 Hours",
    icon: "⚡",
    image: "/assets/images/craft/step4-dhaalai-pour.jpg",
    videoUrl: "/assets/videos/craft/step4-dhaalai-pour.mp4",
    flowPrompt: {
      title: "Google Flow 4K Atelier — Step 4: Dhaalai Continuous Molten Pour",
      duration: "10 Seconds Continuous Loop",
      aspectRatio: "16:9 Cinema 4K",
      cameraMotion: "Smooth lateral tracking shot following the molten stream from crucible lip to mould sprue",
      lighting: "Dramatic rim-lighting on foundrymen's faces from the brilliant yellow-orange liquid metal stream",
      prompt: "Cinematic 16:9 documentary footage of two Indian foundrymen in leather aprons using heavy steel tongs to tilt a red-hot graphite crucible, pouring an unbroken luminous stream of molten liquid brass into an earth-baked mould. White smoke and golden sparks erupt as the wax vaporizes, dramatic chiaroscuro foundry ambiance, 4K resolution.",
      negativePrompt: "spills, chaotic camera wobble, oversaturated flat video, plastic tools, modern neon signage"
    },
    summary: "In a single unbroken continuous stream, the molten brass is poured down the sprue channel into the baked mold cavity.",
    details: "The wax melts and vaporizes instantly—giving 'Lost Wax' its name—as the liquid metal claims every microscopic contour. The cast is left to anneal slowly in ambient temperature for 8 hours to align the metal's internal crystalline lattice for maximum acoustic resonance."
  },
  {
    step: 5,
    title: "Chhilai & Retai (Chiseling & Hand Turning)",
    hindiTitle: "छिलाई और रेताई (कच्ची सफाई)",
    artisanRole: "Filer & Turner (Kharadi)",
    duration: "2–4 Hours",
    temperature: "Cold Handworking",
    icon: "🪓",
    image: "/assets/images/craft/step5-chhilai-retai.jpg",
    videoUrl: "/assets/videos/craft/step5-chhilai-retai.mp4",
    flowPrompt: {
      title: "Google Flow 4K Atelier — Step 5: Chhilai & Retai Rough-Cast Turning",
      duration: "10 Seconds Continuous Loop",
      aspectRatio: "16:9 Cinema 4K",
      cameraMotion: "Close-up tracking the chisel edge chipping crust, showering glittering golden brass curls",
      lighting: "Crisp directional studio daylight highlighting texture difference between dark burnt crust and bright gold brass",
      prompt: "Cinematic 16:9 slow-motion footage of a craftsman on a lathe chipping away the blackened burnt-sand crust of a freshly cast brass bowl with a hardened steel chisel. Gleaming golden brass shavings and fine metal ribbons curl and fly off in slow motion, revealing the bright virgin 22K gold brass underneath, 4K documentary.",
      negativePrompt: "sparklers, laser cutting, plastic lathe, blurred details, jittery frame rate"
    },
    summary: "The mold is broken open to release the raw, rough-cast bronze-colored sculpture, still covered in charred earth.",
    details: "Using diamond files, cold chisels, and foot-powered lathes, artisans chip away casting runners and gates. The rough outer skin is skimmed away to reveal the virgin golden metal underneath."
  },
  {
    step: 6,
    title: "Naqqashi (Master Chisel Hand-Engraving)",
    hindiTitle: "नक़्क़ाशी (हाथ की बारीक नक्काशी)",
    artisanRole: "Master Engraver (Naqqash)",
    duration: "6–18 Hours",
    temperature: "Pure Concentration",
    icon: "✒️",
    image: "/assets/images/craft/step6-naqqashi-engraving.jpg",
    videoUrl: "/assets/videos/craft/step6-naqqashi-engraving.mp4",
    flowPrompt: {
      title: "Google Flow 4K Atelier — Step 6: Naqqashi Master Hand Engraving",
      duration: "10 Seconds Continuous Loop",
      aspectRatio: "16:9 Cinema 4K",
      cameraMotion: "Macro 100mm lens tracking the fine tip of steel qalam and brass hathodi striking at 180 BPM",
      lighting: "Direct warm tungsten work-lamp focused on the chiseled groove, creating razor-sharp metallic highlights",
      prompt: "Cinematic 16:9 macro footage of a master Moradabad Naqqash engraver's hands. Left hand guides an ultra-fine steel chisel (qalam) while right hand rapidly taps with a miniature brass hammer (hathodi), freehand carving intricate Mughal floral arabesques and peacock feathers into solid brass. Microscopic golden curls glint in the light, 4K cinema.",
      negativePrompt: "machine engraving, laser CNC sound, blurred hands, artificial digital artifacts"
    },
    summary: "The defining soul of Moradabad metalcraft. Master craftsmen sitting cross-legged hold a hardened steel chisel (Qalam) and a miniature brass mallet (Hathodi).",
    details: "Without tracing, stencils, or laser guides, the engraver strikes hundreds of precise micro-indentations per minute. They etch paisley blooms, Sanskrit shlokas, temple borders, and peacock plumage directly from generational muscle memory."
  },
  {
    step: 7,
    title: "Rangaai & Buffing (Mirror Luster & Seal)",
    hindiTitle: "रंगाई और चमकाई (आईना फिनिश)",
    artisanRole: "Polishing Maestro (Chhataiwala)",
    duration: "1–2 Hours",
    temperature: "Frictional High RPM",
    icon: "✨",
    image: "/assets/images/craft/step7-rangaai-buffing.jpg",
    videoUrl: "/assets/videos/craft/step7-rangaai-buffing.mp4",
    flowPrompt: {
      title: "Google Flow 4K Atelier — Step 7: Rangaai & Buffing Wheel Mirror Finish",
      duration: "10 Seconds Continuous Loop",
      aspectRatio: "16:9 Cinema 4K",
      cameraMotion: "Slow panoramic reveal of the mirror reflection on the brass body catching anamorphic lens flares",
      lighting: "Soft ambient atelier light with dramatic blinding specular reflection on the polished brass surface",
      prompt: "Cinematic 16:9 slow-motion footage of a craftsman pressing an ornate brass peacock deepam against a spinning high-speed cotton buffing wheel. Green polishing compound melts into a brilliant mirror-like 22K golden surface reflection, soft cotton fibers catching the wind, glorious golden specular luster, 4K editorial documentary.",
      negativePrompt: "plastic shine, chrome finish, oversaturated yellow paint, foggy lens, digital glitches"
    },
    summary: "The finished piece is taken to soft-stitched unbleached cotton buffing wheels spinning at 2,800 RPM, lubricated with green chromium oxide and white diamond rouge.",
    details: "The frictional heat polishes the brass surface to a glass-smooth mirror shine. Finally, a microscopically thin coat of food-grade organic resin is applied to protect against rapid oxidation while allowing the metal to breathe."
  }
];

export const VASTU_SACRED_GUIDE = [
  {
    title: "The Entrance Urli: Inviting Divine Abundance",
    placement: "North-East (Ishanya) or Main Threshold (Dwar)",
    element: "Jal (Water) + Dhaatu (Metal) + Agni (Floating Diyas)",
    mantra: "ॐ श्रीं महालक्ष्म्यै नमः",
    significance: "An urli is not merely decorative; in Vastu Shastra, stagnant dry entryways drain cosmic vitality. A pure brass bowl filled with fresh water and fragrant marigolds / rose petals slows down rushing negative chi. Brass ionizes the water slightly, releasing a cool, purifying micro-breeze at your threshold that invites Goddess Lakshmi into the home.",
    proTip: "Change water every 24–48 hours. Add a few drops of natural camphor (Kappur) oil to amplify the positive vibrational aura."
  },
  {
    title: "The Sacred Akhand Diya: Conduction of Agni",
    placement: "South-East (Agneya) or Inside Mandir facing East",
    element: "Agni (Fire Element) & Sattva Guna",
    mantra: "दीपो ज्योति परं ब्रह्म दीपो ज्योतिर्जनार्दनः",
    significance: "Brass is electro-magnetically conductive yet chemically stable under extreme heat. Unlike clay diyas that weep oil or glass lanterns that trap soot, a heavy-gauge brass deepam maintains thermal equilibrium, ensuring a pure, smoke-free flame. Burning cow ghee or sesame oil in solid brass releases positive electromagnetic ions that sterilize airborne microbes.",
    proTip: "Use round cotton wicks for long uninterrupted burning (Akhand Jyoti) during Navratri and Diwali."
  },
  {
    title: "The Temple Bell (Ghanti): Sound Purification",
    placement: "Left hand of deity or hung near the Mandir ceiling",
    element: "Akasha (Ether / Space) & Shabda Brahma",
    mantra: "आगमार्थं तु देवानां गमनार्थं तु रक्षसाम्",
    significance: "When struck, a genuine cast brass bell does not emit an ordinary sound; it produces the primordial sound 'OM'. The sound wave creates unity in the left and right hemispheres of the human brain, quieting erratic thought frequencies. Its acoustic sustain (at 432 Hz) clears negative vibrational residue from living spaces.",
    proTip: "Look for high-tin heavy bell brass. The sound should linger in the air for at least 4 to 6 seconds after a single tap."
  }
];

export const AUTHENTICITY_TESTS = [
  {
    id: "magnet",
    name: "The Zero-Magnet Test",
    difficulty: "Easiest (Takes 3 seconds)",
    tool: "Any common fridge magnet",
    realBehavior: "The magnet will NOT stick at all. Solid brass is strictly non-ferrous and non-magnetic.",
    fakeBehavior: "The magnet snaps firmly onto the metal. This proves it is cheap cast iron or steel with a cosmetic 2-micron yellow spray.",
    whyItMatters: "Iron oxidizes and rusts into powdery reddish-brown decay when exposed to water, oil, or kumkum in your mandir. Solid brass will never rust."
  },
  {
    id: "sound",
    name: "The Acoustic Resonance Test",
    difficulty: "Simple (Listen closely)",
    tool: "A metallic coin or key",
    realBehavior: "Tapping solid cast brass produces a clear, melodious, bell-like ping that reverberates for 3 to 7 seconds.",
    fakeBehavior: "Produces a hollow, dead, flat 'clack' or 'thud' that stops immediately in less than half a second.",
    whyItMatters: "Acoustic sustain proves dense, homogenous metallic casting without porous internal air cavities or brittle scrap filler."
  },
  {
    id: "weight",
    name: "The Specific Gravity (Weight) Test",
    difficulty: "Immediate hand feel",
    tool: "Kitchen weighing scale or hand balance",
    realBehavior: "Hefty, solid, grounded. A genuine 8-inch brass urli weighs between 700g and 1.5kg; a 6-inch solid diya weighs 350g to 800g.",
    fakeBehavior: "Feels feather-light, hollow, or tinny (under 200g for the same dimensions).",
    whyItMatters: "Weight is the hallmark of heirloom value. True solid metal provides physical stability so heavy lamps do not tip over accidentally."
  },
  {
    id: "scratch",
    name: "The Underside Scratch & Color Test",
    difficulty: "Subtle inspection",
    tool: "A mild coin scrape on the unpolished bottom base",
    realBehavior: "The scratch reveals the exact same warm golden-honey metal all the way through.",
    fakeBehavior: "Scratching flakes off a yellow film, revealing dull gray zinc (pot metal) or silver aluminum underneath.",
    whyItMatters: "Decorbeats crafts 100% solid through-and-through brass. No electro-plated illusions."
  }
];

export const CARE_METHODS = [
  {
    id: "pitambari",
    title: "Method A: The 3-Minute Pitambari Ritual (Mirror Gold)",
    type: "Classic Luster",
    speed: "3 Minutes",
    ingredients: "Pitambari powder + soft sponge + warm water + microfiber cloth",
    steps: [
      "Lightly dampen the brass surface with lukewarm water.",
      "Apply a pinch of Pitambari cleaning powder onto a soft sponge or cotton pad (never steel wool).",
      "Gently rub along the natural contour of the piece. Watch tarnish vanish in seconds.",
      "Rinse thoroughly under running water to remove all powder residue.",
      "IMMEDIATELY wipe completely dry with a clean dry microfiber towel. Water droplets left behind cause water spots."
    ],
    idealFor: "Pooja thalis, diyas, and polished living room urlis before festive gatherings."
  },
  {
    id: "tamarind",
    title: "Method B: The Traditional Tamarind (Imli) Bath",
    type: "100% Organic Vedic",
    speed: "8 Minutes",
    ingredients: "Raw tamarind pulp (Imli) + pinch of rock salt + warm water",
    steps: [
      "Soak a small ball of dry tamarind in warm water for 5 minutes and mash into a thick paste.",
      "Mix in half a teaspoon of fine salt. The natural tartaric acid in tamarind gently dissolves copper oxides.",
      "Rub the pulp over the brass piece with your fingers or a soft cloth.",
      "Let it sit for 2 to 3 minutes (do not leave for hours).",
      "Rinse with clean water and dry vigorously with a warm towel for a deep, antique golden radiance."
    ],
    idealFor: "Antique idols, intricate temple bells with deep crevices, and sacred pooja vessels."
  },
  {
    id: "lemon_salt",
    title: "Method C: The Kitchen Remedy (Lemon & Fine Salt)",
    type: "Quick Pantry Fix",
    speed: "5 Minutes",
    ingredients: "Fresh lemon slice + fine table salt + dash of coconut/mustard oil",
    steps: [
      "Cut a fresh lemon in half and dip the cut edge into fine table salt.",
      "Use the lemon as an ergonomic scouring pad, rubbing over tarnished spots.",
      "The citric acid lifts dark oxidation without synthetic fumes.",
      "Wash clean with lukewarm water and pat dry thoroughly.",
      "Optional: Rub two drops of pure mustard or coconut oil with a dry cotton cloth to seal the golden luster for weeks."
    ],
    idealFor: "Quick weekly touch-ups when commercial brass polish is not at hand."
  },
  {
    id: "patina",
    title: "Method D: Preserving the Noble Antique Patina",
    type: "For Vintage Connoisseurs",
    speed: "Dry Dusting",
    ingredients: "Soft badger-hair brush or dry microfiber + renaissance microcrystalline wax",
    steps: [
      "Do NOT use chemical cleaners or tamarind if you cherish the deep, aged temple patina.",
      "Gently brush away dust from engravings with a soft dry bristle brush.",
      "Apply a pea-sized amount of clear microcrystalline museum wax with a soft cloth.",
      "Buff lightly after 10 minutes. This preserves the dark rich shadows in the carvings while highlighting raised golden details."
    ],
    idealFor: "Centuries-old family heirlooms, tribal Dhokra art, and collector-edition museum sculptures."
  }
];

export const GLOSSARY_TERMS = [
  {
    term: "Akhand Diya (अखंड दिया)",
    category: "Pooja Heritage",
    definition: "An auspicious, self-contained brass lamp engineered with an internal chimney or glass draft shield, designed to sustain an unbroken sacred flame for 24 hours to 9 days during Navratri, Diwali, and Akhand Paths without blowing out."
  },
  {
    term: "Ashtadhatu (अष्टधातु)",
    category: "Sacred Metallurgy",
    definition: "A sacred alloy of eight metals described in Shilpa Shastra: Gold, Silver, Copper, Zinc, Lead, Tin, Iron, and Mercury (or Brass). Revered for sanctum idols due to its unique vibrational harmony matching cosmic frequencies."
  },
  {
    term: "Chhilai (छिलाई)",
    category: "Crafting Process",
    definition: "The Moradabad term for the rigorous de-flashing and initial chiseling phase where raw cast brass is lathed and filed by hand to remove foundry seam lines."
  },
  {
    term: "Dhokra (ढोकरा)",
    category: "Artisanal Tradition",
    definition: "One of the earliest known lost-wax casting methods in human history, dating back over 4,000 years to the Mohenjo-daro civilization, characterized by rustic coiled-thread wax detailing and organic primitive charm."
  },
  {
    term: "Ghanti (घंटी)",
    category: "Pooja Heritage",
    definition: "A sanctified ritual brass bell topped with a representation of Garuda, Nandi, or Hanuman. When rung, it generates an acoustic frequency that dispels negative energy and activates the Anahata (heart) chakra."
  },
  {
    term: "Jasad (जसद / यशद)",
    category: "Metallurgy",
    definition: "The ancient Sanskrit and Hindi term for Zinc. Discovered and distilled in Zawar, Rajasthan as early as the 12th century BCE, India was the world's first civilization to extract pure zinc for brassmaking."
  },
  {
    term: "Kalai (कलई)",
    category: "Crafting Tradition",
    definition: "The traditional art of lining the interior of brass and copper cookware with pure molten tin. It prevents acidic food reactions and creates a 100% food-safe cooking surface."
  },
  {
    term: "Kansa (कांसा)",
    category: "Alloy",
    definition: "Bell metal bronze composed of 78% Copper and 22% Tin. In Ayurveda, eating from a Kansa plate balances the three doshas (Vata, Pitta, Kapha) and promotes alkaline gut health."
  },
  {
    term: "Kuthu Vilakku (कुथु विळक्कु)",
    category: "Pooja Heritage",
    definition: "The iconic South Indian brass pedestal lamp featuring five wicks (Panchamukhi) surmounted by an auspicious Annapakshi (celestial swan). Symbolizes knowledge, purity, and the dispel of darkness."
  },
  {
    term: "Madhuchishtavidhana (मधूच्छिष्टविधान)",
    category: "Vedic Science",
    definition: "The classical Sanskrit treatise on the lost-wax metallurgical casting process found in the ancient texts of Manasara and Shilpa Shastra."
  },
  {
    term: "Naqqashi (नक़्क़ाशी)",
    category: "Ornamentation",
    definition: "The celebrated art of freehand hand-hammered chisel engraving practiced by generations of Muslim and Hindu artisan families in Moradabad, Uttar Pradesh."
  },
  {
    term: "Oligodynamic Effect (ऑलिगोडायनामिक प्रभाव)",
    category: "Ayurveda & Science",
    definition: "The biophysical phenomenon wherein minute trace ions of copper and brass metal dissolve into water, neutralizing 99.9% of bacteria, viruses, and fungi within 8 hours."
  },
  {
    term: "Patina (पेटिना / कालिका)",
    category: "Finishing & Aging",
    definition: "The natural protective surface layer of copper carbonates and oxides that forms organically over decades on solid brass, transforming bright gold into dignified antique bronze."
  },
  {
    term: "Peetal Nagri (पीतल नगरी)",
    category: "Geographic Heritage",
    definition: "'The Brass City' — The historic title of Moradabad in Uttar Pradesh, India, world-renowned since the Mughal era as the premier global center for handcrafted brass exports."
  },
  {
    term: "Pitambari (पीताम्बरी)",
    category: "Care & Cleaning",
    definition: "A gentle, non-abrasive Ayurvedic cleansing formulation composed of natural foaming clays, mild citric acid, and polishing agents formulated specifically to shine brass without eroding fine engravings."
  },
  {
    term: "Tamra (ताम्र)",
    category: "Metallurgy",
    definition: "The Sanskrit term for pure Copper. Associated with the planet Sun (Surya) and considered the highest energetic conductor in Vedic rituals."
  },
  {
    term: "Urli (उरुली)",
    category: "Living Decor",
    definition: "A wide, shallow traditional circular brass vessel originally used in Kerala for Ayurvedic medicine and cooking, now celebrated globally as a sacred entrance accent filled with floating flowers and candles."
  },
  {
    term: "Vastu Shastra (वास्तु शास्त्र)",
    category: "Sacred Architecture",
    definition: "The ancient Indian science of spatial alignment and energy balance. Dictates the specific geometric placement of metals and water elements to invite prosperity and peace."
  }
];
