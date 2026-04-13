"""
Real Wayne Shorter chord progression templates.
Extracted from Hal Leonard Artist Transcriptions.
Bb tenor saxophone transposition corrected to concert pitch.
"""

SHORTER_TEMPLATES = {
    "infant_eyes": {
        "title": "Infant Eyes",
        "bars": 27,
        "form": "ABA",
        "phrase_lengths": [9, 9, 9],
        "tempo": 55,
        "feel": "ballad",
        "sections": {
            "A": [
                "Am7", "Gm7", "Fmaj7", "B7#9",
                "Abmaj7", "G7sus", "Fm7", "C7sus",
                "C7#5"
            ],
            "B": [
                "Fmaj7", "Gbmaj7", "Fmaj9#11", "Gbmaj7",
                "Dbmaj7", "C7sus", "Bbm7", "F7sus",
                "E7b9"
            ]
        },
        "full_progression": [
            "Am7", "Gm7", "Fmaj7", "B7#9",
            "Abmaj7", "G7sus", "Fm7", "C7sus", "C7#5",
            "Fmaj7", "Gbmaj7", "Fmaj9#11", "Gbmaj7",
            "Dbmaj7", "C7sus", "Bbm7", "F7sus", "E7b9",
            "Am7", "Gm7", "Fmaj7", "B7",
            "Abmaj7", "G7sus", "Fm7", "C7sus", "C7sus"
        ]
    },

    "esp": {
        "title": "E.S.P.",
        "bars": 32,
        "form": "AABA",
        "phrase_lengths": [8, 8, 8, 8],
        "tempo": 265,
        "feel": "medium_up",
        "sections": {
            "A": [
                "F#7#9", "Gmaj7", "F#7#9", "Fmaj7#11",
                "E7#9", "F9#11", "F#7#9", "Gmaj7"
            ],
            "B": [
                "Fm7", "Abm7", "Fm7", "Dm7b5",
                "G7", "Cm7", "Bb7", "Ab7"
            ]
        },
        "full_progression": [
            "F#7#9", "Gmaj7", "F#7#9", "Fmaj7#11",
            "E7#9", "F9#11", "F#7#9", "Gmaj7",
            "F#7#9", "Gmaj7", "F#7#9", "Fmaj7#11",
            "E7#9", "F9#11", "F#7#9", "Gmaj7",
            "Fm7", "Abm7", "Fm7", "Dm7b5",
            "G7", "Cm7", "Bb7", "Ab7",
            "F#7#9", "Gmaj7", "F#7#9", "Fmaj7#11",
            "E7#9", "F9#11", "Em7", "A7"
        ]
    },

    "speak_no_evil": {
        "title": "Speak No Evil",
        "bars": 32,
        "form": "AABA",
        "phrase_lengths": [8, 8, 8, 8],
        "tempo": 140,
        "feel": "medium",
        "sections": {
            "A": [
                "Dm7", "Ebmaj7", "Dm7", "Ebmaj7",
                "F#m7", "B7", "Em7", "A7"
            ],
            "B": [
                "Dm7", "Bb7", "Am7", "Ab7b5",
                "Gm7", "C7b5", "F7#9", "Eb9#11"
            ]
        },
        "full_progression": [
            "Dm7", "Ebmaj7", "Dm7", "Ebmaj7",
            "F#m7", "B7", "Em7", "A7",
            "B7b5", "Cm7", "B7b5", "Cm7",
            "Dm7", "Bb7", "Am7", "Ab7b5",
            "Gm7", "C7b5", "F7#9", "Eb9#11",
            "Dm7", "Ebmaj7", "Dm7", "Ebmaj7",
            "F#m7", "B7", "Em7", "A7",
            "B7b5", "Cm7", "B7b5", "Cm7"
        ]
    },

    "footprints": {
        "title": "Footprints",
        "bars": 24,
        "form": "blues",
        "phrase_lengths": [4, 4, 2, 2, 2, 2, 2, 2, 2, 2],
        "tempo": 150,
        "feel": "waltz",
        "meter": "3/4",
        "sections": {
            "A": [
                "Dm7", "Dm7", "Dm7", "Dm7",
                "Gm7", "Gm7", "Dm7", "Dm7",
                "E13", "A9", "F#m7b5", "B7",
                "Dm7", "Dm7", "Dm7", "Dm7",
                "Gm7", "Gm7", "Dm7", "Dm7",
                "E13", "A9", "F#m7b5", "B7"
            ]
        },
        "full_progression": [
            "Dm7", "Dm7", "Dm7", "Dm7",
            "Gm7", "Gm7", "Dm7", "Dm7",
            "E13", "A9", "F#m7b5", "B7",
            "Dm7", "Dm7", "Dm7", "Dm7",
            "Gm7", "Gm7", "Dm7", "Dm7",
            "E13", "A9", "F#m7b5", "B7"
        ]
    }
}


def get_template(title_hint: str) -> dict:
    """Get closest template for a given title."""
    hint = title_hint.lower().replace(' ', '_')
    hint = hint.replace("'", '').replace('.', '')

    # Direct match
    if hint in SHORTER_TEMPLATES:
        return SHORTER_TEMPLATES[hint]

    # Partial match
    for key, template in SHORTER_TEMPLATES.items():
        if key in hint or hint in key:
            return template
        if any(word in hint for word in key.split('_')):
            return template

    return None


def get_progression_for_bars(template: dict,
                              num_bars: int) -> list:
    """Get chord progression extended or truncated
    to num_bars."""
    prog = template['full_progression']
    if len(prog) >= num_bars:
        return prog[:num_bars]
    # Extend by cycling
    result = []
    while len(result) < num_bars:
        result.extend(prog)
    return result[:num_bars]
