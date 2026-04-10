# -*- coding: utf-8 -*-
"""Build V4.0 Psychopathology & Synthesis deck from PET template."""
from pptx import Presentation
from pptx.util import Pt

TEMPLATE = r"C:\Users\mike\Documents\PET\Psychopathology and Synthesis 2026\Powerpoint Synthesis\PET PowerPoint template.pptx"
OUT = r"C:\Users\mike\Documents\PET\Psychopathology and Synthesis 2026\Powerpoint Synthesis\V4.0-Psychopathology-Synthesis.pptx"


def delete_all_slides(prs):
    while len(prs.slides) > 0:
        rId = prs.slides._sldIdLst[0].rId
        prs.part.drop_rel(rId)
        prs.slides._sldIdLst.remove(prs.slides._sldIdLst[0])


def add_notes(slide, text):
    notes = slide.notes_slide
    tf = notes.notes_text_frame
    tf.clear()
    p = tf.paragraphs[0]
    p.text = text.strip()


def bullets_from_lines(body_shape, lines):
    tf = body_shape.text_frame
    tf.clear()
    for i, line in enumerate(lines):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = line
        p.level = 0
        p.font.size = Pt(20)


def set_body_font_size(shape, pt):
    if not shape.has_text_frame:
        return
    for p in shape.text_frame.paragraphs:
        for r in p.runs:
            r.font.size = Pt(pt)


def slide_title_content(prs, title, lines, notes, title_pt=32, body_pt=20):
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    slide.shapes.title.text = title
    ph = slide.placeholders[1]
    bullets_from_lines(ph, lines)
    slide.shapes.title.text_frame.paragraphs[0].font.size = Pt(title_pt)
    set_body_font_size(ph, body_pt)
    add_notes(slide, notes)
    return slide


def slide_section(prs, title, subtitle_lines, notes):
    slide = prs.slides.add_slide(prs.slide_layouts[2])
    slide.shapes.title.text = title
    if subtitle_lines:
        ph = slide.placeholders[1]
        bullets_from_lines(ph, subtitle_lines)
        set_body_font_size(ph, 22)
    add_notes(slide, notes)
    return slide


def slide_title_only(prs, title, notes):
    slide = prs.slides.add_slide(prs.slide_layouts[5])
    slide.shapes.title.text = title
    slide.shapes.title.text_frame.paragraphs[0].font.size = Pt(36)
    add_notes(slide, notes)
    return slide


def slide_title_slide(prs, title, subtitle, notes):
    slide = prs.slides.add_slide(prs.slide_layouts[0])
    slide.shapes.title.text = title
    slide.placeholders[1].text = subtitle
    add_notes(slide, notes)
    return slide


def main():
    prs = Presentation(TEMPLATE)
    delete_all_slides(prs)

    # --- 1 Title
    slide_title_slide(
        prs,
        "Psychopathology & synthesis",
        "Postgraduate weekend teaching\nPsychosynthesis & Education Trust\n11–12 April 2026",
        """Welcome. Speak slowly. Name boundaries (time, breaks, stepping out).
This deck supports a live weekend—not a lecture to absorb passively.
Speaker: adjust pacing to the room; these notes are prompts, not a script.""",
    )

    # --- 2 Weekend structure
    slide_title_content(
        prs,
        "Weekend rhythm & time",
        [
            "Saturday & Sunday: 10:00–17:00 (UK)",
            "Each day: ~15 min meditation · optional ~15 min check-in · teaching · 20 min break · lunch (often 13:00–14:00) · 20 min break",
            "Facilitator task: map approximate minutes per block so teaching, breaks, lunch, and openings still fit the day.",
            "Heavy material is spaced; breaks are part of ethical pacing—not optional extras.",
        ],
        """Approximate teaching time per day once meditation, check-in, breaks and lunch are removed is on the order of a few hours of focused teaching—not seven full hours at the board.
Slide labels follow the prior deck: ‘Day one — afternoon’ appears after the mid-morning break and before the lunch slide; map these blocks to your actual Saturday/Sunday clock times.
Map content blocks: (1) framing, psychopathology, risk, Leah, psychosynthesis; (2) break; (3) neurodiversity, Ousmane, practical; (4) lunch; (5) day two opening; (6) trauma, dissociation, Emily, bridges, neuroplasticity, response; (7) break; (8) risk cases, ambiguity, integration, closing.
Adjust to your group: experienced adults may need more discussion time, not less.""",
    )

    # --- 3 Adult learners
    slide_title_content(
        prs,
        "How we learn this weekend",
        [
            "You bring substantial life and professional experience—this is advanced formation, not undergraduate coverage.",
            "We prioritise clinical judgement, realistic uncertainty, and what you might actually do on Monday.",
            "Reflection and pair conversation are teaching methods, not fillers.",
            "Language stays respectful: no talking down; difficulty is held, not performed.",
        ],
        """Acknowledge second-career trainees and varied prior roles.
Invite people to connect material to prior work or caring contexts without forcing disclosure.
If discussion runs rich, shorten a later bullet block rather than rushing cases.""",
    )

    # --- 4 Day one opening
    slide_title_content(
        prs,
        "Day one — opening",
        [
            "Meditation (~15 minutes) — PET tradition",
            "Optional check-in (~15 minutes): “How do you feel about this material?”",
            "Then: move into day one — morning teaching block",
        ],
        """Keep opening calm and bounded. Check-in is optional; some groups prefer brief go-round, others pair share then one or two voices to the room.
If the material stirs shame or personal history, normalise pacing and opt-out.""",
    )

    # --- 5 Section Day 1 AM
    slide_section(
        prs,
        "Day one — morning",
        ["Framing · psychopathology · risk · case (Leah) · psychosynthesis threads"],
        "Transition from opening. State timing intention for this block before you begin (e.g. aim to break before neurodiversity).",
    )

    slide_title_content(
        prs,
        "Framing the work",
        [
            "Psychopathology offers shared clinical language.",
            "It supports formulation—not identity collapse.",
            "Meaning and risk must be held together.",
            "Therapists tolerate uncertainty without freezing or rushing.",
        ],
        """Frame as professional stance, not optimism. Adults respond well to “both/and.”
Invite: where have you seen meaning and risk split in supervision or agency culture?""",
    )

    slide_title_content(
        prs,
        "Working with psychopathology",
        [
            "Diagnostic labels describe patterns—not people.",
            "Formulation integrates symptoms, history, and context.",
            "Clients arrive shaped by prior labels and systems.",
            "Think clinically without collapsing into diagnosis as destiny.",
        ],
        """Discussion prompt (short): “What is one label that helped a client—and one that harmed?”
Keep it professional; no requirement to disclose personal diagnosis.""",
    )

    slide_title_content(
        prs,
        "Risk — core principles",
        [
            "Risk is dynamic and can escalate quickly.",
            "Intensity does not equal level of danger.",
            "Quiet clients may carry significant risk.",
            "Direct, respectful questions reduce—not increase—risk when done with care.",
        ],
        """Slow down here. This is competence, not drama.
If your training has a specific risk protocol, name it without inventing policies.""",
    )

    slide_title_only(
        prs,
        "Case study · Shame — “Leah”",
        "Read or summarise the case briefly. Leave space for affect—do not rush to ‘answers.’",
    )

    slide_title_content(
        prs,
        "Task · Leah",
        [
            "Clarify thoughts, intent, and access to means.",
            "Develop formulation: shame, avoidance, context.",
            "Prioritise first two sessions and pacing.",
            "Match structure to client capacity.",
            "Reflective prompt: What would you not do here, and why?",
        ],
        """After discussion: bridge to psychosynthesis without preaching.
Ask the room: where is meaning in this picture—and where is genuine risk?""",
    )

    # Bridge after first risk case
    slide_title_content(
        prs,
        "Psychosynthesis bridge · Meaning alongside risk",
        [
            "Suffering can be meaningful without minimising danger.",
            "Non-identification supports seeing patterns without fusion or contempt.",
            "Risk decisions stay ethical and ordinary—not heroic.",
        ],
        """Short slide. Source tone: Firman & Gila on identification dynamics; Nelson on splits and integration as careful clinical work—not romantic breakdown.
Avoid spiritual bypass: meaning never replaces safeguarding.""",
    )

    slide_title_content(
        prs,
        "Psychosynthesis perspective",
        [
            "Distress can reflect fragmentation of parts (subpersonalities).",
            "An observing centre supports disidentification where appropriate.",
            "Containment is required before exploration.",
            "Integration develops gradually—over time and relationship.",
        ],
        """Thread Assagioli/Firman & Gila themes already familiar to trainees.
Pair prompt: “What would containment look like in week one with Leah?”""",
    )

    slide_title_only(
        prs,
        "Morning break · ~20 minutes",
        "Invite movement, water, quiet. No new content during break.",
    )

    # --- Day 1 PM
    slide_section(
        prs,
        "Day one — afternoon",
        ["Neurodiversity · clinical challenges · case (Ousmane) · practical work"],
        "After lunch return (if you use it): 2-minute re-grounding; name one focus for this block.",
    )

    slide_title_content(
        prs,
        "Neurodiversity — clinical view",
        [
            "Difference in processing rather than deficit-only framing.",
            "Executive function affects organisation and action.",
            "Sensory overload drives overwhelm and shutdown.",
            "Masking hides difficulty and increases exhaustion.",
        ],
        """Use neutral, non-trivialising language. Neurodivergence is not a metaphor.
Invite: environment and expectations as part of formulation.""",
    )

    slide_title_content(
        prs,
        "Clinical challenges",
        [
            "Difference is often misread as lack of motivation.",
            "Shame develops through repeated failure narratives.",
            "Function varies depending on environment.",
            "Work requires flexibility without false certainty.",
        ],
        """Discussion: “Where does your setting punish difference?” Keep institutional critique bounded and usable.""",
    )

    # Bridge ND
    slide_title_content(
        prs,
        "Psychosynthesis bridge · Adaptation, not pretend normality",
        [
            "Adjustment of environment and pace can be deeply ethical—not ‘lowering standards.’",
            "Integration includes honest limits; not everyone must look ‘neurotypical’ to be well.",
            "Avoid idealising neurodivergence or collapsing it into tragedy.",
        ],
        """Connect to psychosynthesis: context and relationship as well as inner process (Firman & Gila).
This is clinical framing—not slogans.""",
    )

    slide_title_only(
        prs,
        "Case study · Neurodiversity — “Ousmane”",
        "Same pacing as Leah: case first, anxiety acknowledged, then tasks.",
    )

    slide_title_content(
        prs,
        "Task · Ousmane",
        [
            "Formulate neurodiversity, stress, and environment together.",
            "Identify safeguarding risks for children where relevant.",
            "Prioritise practical next steps.",
            "Focus on what might change this week.",
            "Pair discussion: one environmental change · one relational stance",
        ],
        """Practical focus respects adult learners who think in systems (work, family, housing).
Supervision hook: what would you document?""",
    )

    slide_title_content(
        prs,
        "Working practically",
        [
            "Use structure, routine, and predictability where helpful.",
            "Reduce overwhelm before increasing insight.",
            "Adjust environment where possible.",
            "Support agency and functional change—without rushing ‘depth.’",
        ],
        """Explicitly permission ordinary interventions: reminders, scheduling, referrals, liaison.
Psychosynthesis depth work follows stability—not instead of it.""",
    )

    slide_title_only(
        prs,
        "Lunch · ~1 hour (often 13:00–14:00)",
        "Protect the hour. If your Saturday continues after lunch, resume at an appropriate slide; this deck follows V3.97 order (day-one ‘PM’ block before lunch, then day two).",
    )

    # --- Day 2 opening
    slide_title_content(
        prs,
        "Day two — opening",
        [
            "Meditation (~15 minutes)",
            "Check-in (~15 minutes): “What did yesterday bring up for you?”",
            "Overnight processing is normal—no obligation to share detail.",
            "Then: day two — morning block (trauma, dissociation, Emily)",
        ],
        """Day-two check-in may bring fatigue or activation. Normalise both.
If someone is destabilised, follow PET pastoral/safeguarding practice—do not improvise therapy in the round.""",
    )

    slide_section(
        prs,
        "Day two — morning",
        ["Trauma · dissociation · case (Emily) · neuroplasticity · clinical response"],
        "Name approximate end time for this block before starting.",
    )

    slide_title_content(
        prs,
        "Trauma — core understanding",
        [
            "Trauma is held in the nervous system—not only in ‘the story.’",
            "It alters regulation, perception, and relating.",
            "Triggers can produce rapid state changes.",
            "Clients may shift between arousal and shutdown.",
        ],
        """Steady tone. No sensational examples.
Firman & Gila (1997) primal wound themes can inform compassion without explaining every client the same way.""",
    )

    slide_title_content(
        prs,
        "Dissociation",
        [
            "Often a protective response to overwhelming experience.",
            "May involve loss of continuity or presence.",
            "Can be subtle and easily missed in clinic.",
            "Strongly linked to increased risk—assess carefully.",
        ],
        """Bridge to containment: do not romanticise fragmentation (Nelson; clinical psychosis/spirituality literature only where appropriate to your course).
Invite judgement: what would you misread as ‘spacing out’?""",
    )

    # Bridge voices/split
    slide_title_content(
        prs,
        "Psychosynthesis bridge · Containment before exploration",
        [
            "‘Opening everything up’ is not always kind.",
            "Stabilisation and relationship come first.",
            "Spiritual or transpersonal material is not a shortcut past terror.",
        ],
        """Explicitly counter spiritual bypass. Grof spiritual emergency and Clarke volumes are background reading for extreme states—not recipes for technique.
Stay within your competence and supervision arrangements.""",
    )

    slide_title_only(
        prs,
        "Case study · Dissociation — “Emily”",
        "Pause. Dissociation is not a spectacle. Maintain dignity in the teaching frame.",
    )

    slide_title_content(
        prs,
        "Task · Emily",
        [
            "Assess risk alongside dissociation.",
            "Decide whether to escalate support.",
            "Prioritise stabilisation and safety.",
            "Question reliability of self-report—without contempt.",
            "Reflective prompt: what would make you lose sleep tonight?",
        ],
        """Encourage realistic documentation and consultation culture.
Adult trainees often carry fear of ‘getting it wrong’—name that as ethical care.""",
    )

    # After trauma section bridge
    slide_title_content(
        prs,
        "Psychosynthesis bridge · Self, woundedness, and pace",
        [
            "Depth is compatible with safety: smaller steps, repeated contact.",
            "Meaning may emerge without forcing narrative coherence immediately.",
            "Therapist pace regulates the field—use yours deliberately.",
        ],
        """Firman & Gila: Self-related themes without promising outcomes.
Trauma work: respect neuroplasticity slide next—change as relational repetition.""",
    )

    slide_title_content(
        prs,
        "Neuroplasticity",
        [
            "Repetition strengthens emotional patterns—for better and worse.",
            "Trauma can reinforce rigid survival responses.",
            "Insight alone rarely changes embodied behaviour.",
            "Change often requires repeated relational experience over time.",
        ],
        """Keeps hope grounded. Avoid bootstrapping.
Link to day-one practical work: small repeatable actions.""",
    )

    slide_title_content(
        prs,
        "Clinical response",
        [
            "Stabilise before deeper exploration.",
            "Use pacing to prevent dysregulation.",
            "Reduce overwhelm to support engagement.",
            "Monitor risk as patterns shift—especially after stabilisation begins.",
        ],
        """Supervision prompt: “What shifted in risk when the client felt safer?”""",
    )

    slide_title_only(
        prs,
        "Afternoon break · ~20 minutes",
        "Day two PM will foreground risk decisions and ambiguity. Brief reset.",
    )

    # --- Day 2 PM
    slide_section(
        prs,
        "Day two — afternoon",
        ["Risk (David) · ambiguity (Michael) · integration · closing"],
        "Acknowledge cumulative load. Invite slower speech and optional stretch.",
    )

    slide_title_only(
        prs,
        "Case study · Risk — “David”",
        "Risk teaching: clarity over drama. Follow your agency’s protocols.",
    )

    slide_title_content(
        prs,
        "Task · David",
        [
            "Decide: continue or escalate.",
            "Act immediately on current risk where indicated.",
            "Document clearly and justify decisions.",
            "Consider impact of trauma on disclosure.",
            "Pair: what is one line you would write in notes?",
        ],
        """Do not invent statutory steps. Say: follow local safeguarding and emergency procedures.""",
    )

    slide_title_content(
        prs,
        "Risk decisions",
        [
            "Balance autonomy with duty of care.",
            "Escalate when risk becomes active.",
            "Use supervision for complex decisions.",
            "Clear documentation protects clients and practitioners.",
        ],
        """Normalise supervision as professionalism—not admission of weakness.""",
    )

    slide_title_only(
        prs,
        "Case study · Ambiguity — “Michael”",
        "Ambiguity is ordinary in mature practice. Hold the discomfort pedagogically.",
    )

    slide_title_content(
        prs,
        "Task · Michael",
        [
            "Decide whether uncertainty requires action now.",
            "Define what would trigger escalation.",
            "Consider risks of acting versus waiting.",
            "Notice therapist anxiety in decision-making—without shame.",
            "Large group: one judgement call only—avoid debate spirals",
        ],
        """Meta: anxiety in the clinician is data, not proof of danger.
Stay bounded; this is not group therapy for the trainers.""",
    )

    # Before final integration
    slide_title_content(
        prs,
        "Psychosynthesis bridge · Formulation and clinical work",
        [
            "Psychosynthesis offers a frame: parts, Self, meaning, context—not a bypass around ethics or diagnosis.",
            "Integration without idealisation: clients remain real people in real systems.",
            "Relationship and environment matter as much as inner process.",
        ],
        """Tie threads: Nelson on careful integration of ‘split’ experiences; Firman & Gila for spirit in psychology without losing clinical seriousness.
Optional: mention critical medicalisation literature only if taught elsewhere—Boyle chapter details not confirmed here.""",
    )

    slide_title_content(
        prs,
        "Integration",
        [
            "Hold meaning and risk simultaneously.",
            "Recognise limits of the therapeutic role.",
            "Decision-making is core to ethical practice.",
            "Use reflection and supervision consistently.",
        ],
        """Closing movement for the teaching content—not therapy.
Invite: one commitment to supervision or consultation culture.""",
    )

    slide_title_content(
        prs,
        "Closing reflection",
        [
            "Brief grounding or silence—facilitator’s choice.",
            "Optional round: one word from the weekend (decline always allowed).",
            "Thank the group for attention to difficult material.",
        ],
        """Keep this short. No forced positivity.
If time ran over, cut this before cutting safety content.""",
    )

    # References - only verified full refs + honest incomplete
    ref_body = [
        "Nelson, J.E. (1994) Healing the split: Integrating spirit into our understanding of the mentally ill. Albany, NY: State University of New York Press.",
        "Firman, J. and Gila, A. (2002) Psychosynthesis: A psychology of the spirit. Albany, NY: State University of New York Press.",
        "Firman, J. and Gila, A. (1997) The primal wound: A transpersonal view of trauma, addiction, and growth. Albany, NY: State University of New York Press.",
        "Grof, S. and Grof, C. (eds) (1989) Spiritual emergency: When personal transformation becomes a crisis. [Publication details to confirm.]",
        "Clarke, I. (ed.) (2001) Psychosis and spirituality: Exploring the new frontier. [Publication details to confirm.]",
        "Clarke, I. (ed.) (2010) Psychosis and spirituality: Consolidating the new paradigm. [Publication details to confirm.]",
    ]
    slide_title_content(
        prs,
        "Selected references",
        ref_body,
        """Harvard style where full details were provided. Grof and Clarke entries lack verified publisher/places in the materials used to build this deck—confirm against your library catalogue before citing in essays.
Optional critical reading (not listed above): Boyle, M. in Coles, Keenan & Diamond (eds) Madness contested (PCCS Books, Monmouth)—confirm year and pagination before use.
Speaker: do not read references aloud unless asked.""",
        title_pt=30,
        body_pt=14,
    )

    prs.save(OUT)
    print("Saved", OUT, "slides:", len(prs.slides))


if __name__ == "__main__":
    main()
