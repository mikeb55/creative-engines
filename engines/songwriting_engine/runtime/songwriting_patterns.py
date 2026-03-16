"""
Songwriting Patterns — Curated structures from real songwriting practice.
Provides richer building blocks for the generator.
"""

# Roman numeral -> chord symbols for key C and G
# I, ii, iii, IV, V, vi, vii°
KEY_C = {"I": "C", "ii": "Dm", "iii": "Em", "IV": "F", "V": "G", "vi": "Am", "vii": "Bm"}
KEY_G = {"I": "G", "ii": "Am", "iii": "Bm", "IV": "C", "V": "D", "vi": "Em", "vii": "F#m"}

PROGRESSION_LIBRARY = {
    "verse_progressions": [
        ["I", "V", "vi", "IV"],
        ["vi", "IV", "I", "V"],
        ["I", "vi", "IV", "V"],
        ["ii", "V", "I", "IV"],
        ["I", "IV", "V", "I"],
        ["vi", "IV", "V", "I"],
    ],
    "chorus_progressions": [
        ["IV", "I", "V", "vi"],
        ["I", "V", "IV", "I"],
        ["I", "V", "vi", "IV"],
        ["I", "IV", "V", "I"],
        ["IV", "V", "I", "vi"],
    ],
    "bridge_progressions": [
        ["ii", "V", "vi", "IV"],
        ["IV", "V", "I", "IV"],
        ["vi", "IV", "I", "V"],
        ["ii", "V", "I", "I"],
    ],
    "prechorus_progressions": [
        ["IV", "V", "I", "V"],
        ["ii", "V", "I", "IV"],
        ["vi", "IV", "V", "V"],
    ],
}

HOOK_RHYTHMS = [
    "long_short_short",
    "repeat_repeat_leap",
    "pickup_sustained_peak",
    "syncopated_repeat",
    "short_short_long",
    "repeat_hold_resolve",
]

MELODIC_CONTOURS = {
    "verse": ["rise", "arch", "narrow_gradual", "fall"],
    "chorus": ["arch", "rise_hold_fall", "repeated_peak", "repeat_then_leap"],
    "bridge": ["fall", "fall_then_leap", "repeat_then_leap", "contrast_arch"],
    "prechorus": ["rise", "arch", "rise_hold_fall"],
}

MOTIF_SHAPES = {
    "verse": ["arch", "rise", "narrow"],
    "chorus": ["arch", "rise_hold_fall", "repeated_peak"],
    "bridge": ["fall", "repeat_then_leap"],
}

MELODIC_PEAK_LOCATIONS = {
    "verse": [0.3, 0.4, 0.5],
    "chorus": [0.4, 0.5, 0.6],
    "bridge": [0.2, 0.3, 0.5],
    "prechorus": [0.5, 0.6],
}

IMAGE_FAMILIES = {
    "light_dark": ["light", "dark", "dawn", "shadow", "glow", "night", "sun"],
    "road_journey": ["road", "street", "path", "train", "bridge", "platform", "station"],
    "water_tide": ["river", "rain", "tide", "wave", "glass", "stream"],
    "sky_weather": ["dawn", "rain", "cloud", "storm", "sky", "wind"],
    "fire_heat": ["burn", "fire", "flame", "heat", "ash"],
    "time_memory": ["dawn", "night", "moment", "hour", "memory", "past"],
    "city_night": ["streetlamps", "window", "door", "sidewalk", "platform", "station"],
}

THEME_TO_IMAGE_FAMILY = {
    "love": ["light_dark", "road_journey", "city_night"],
    "loss": ["water_tide", "time_memory", "light_dark"],
    "hope": ["sky_weather", "light_dark", "road_journey"],
    "default": ["light_dark", "road_journey", "water_tide", "city_night"],
}
