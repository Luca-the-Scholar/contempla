export interface Practice {
  id: string;
  title: string;
  teacher: {
    name: string;
    bio: string;
    image: string;
  };
  scholar: {
    name: string;
    context: string;
  };
  research: {
    summary: string;
    findings: string[];
  };
  tags: string[];
  durations: number[]; // in minutes
  guide: {
    steps: string[];
    audioAvailable: boolean;
  };
  mastery: {
    score: number; // 0-100
    level: string;
    confidence: number; // 0-100
    sparkline: number[]; // last 30 days
    totalMinutes: number;
    lastPracticed: string;
  };
}

export const practices: Practice[] = [
  {
    id: "breath-awareness",
    title: "Breath Awareness",
    teacher: {
      name: "Kelly Smith",
      bio: "Focus on the natural rhythm of your breath. This foundational practice builds concentration by anchoring attention to the sensations of breathing—at the nostrils, chest, or belly. When the mind wanders, gently return to the breath without judgment.",
      image: "sarah-chen",
    },
    scholar: {
      name: "Dr. N. Sujato",
      context: "Ānāpānasati (mindfulness of breathing) appears in the Pāli Canon as one of the Buddha's primary meditation instructions. It is the first of the four foundations of mindfulness and is considered suitable for all temperaments. Historical sources link this practice to both samatha (calm) and vipassanā (insight) traditions.",
    },
    research: {
      summary: "Breath-focused meditation has been extensively studied for its effects on stress reduction, attention, and emotional regulation.",
      findings: [
        "Meta-analysis shows significant reduction in anxiety and depression symptoms",
        "fMRI studies reveal increased activity in prefrontal cortex and decreased amygdala reactivity",
        "Improves heart rate variability and parasympathetic nervous system function",
        "Associated with increased gray matter density in brain regions related to attention"
      ]
    },
    tags: ["Theravāda", "Awareness", "Foundation"],
    durations: [5, 10, 30],
    guide: {
      steps: [
        "Sit comfortably with a tall, relaxed spine",
        "Close your eyes or soften your gaze downward",
        "Take three deep breaths to settle",
        "Let your breath return to its natural rhythm",
        "Notice the sensation of breath at your nostrils, chest, or belly",
        "When your mind wanders, gently return to the breath",
        "Continue for the duration of your session",
      ],
      audioAvailable: true,
    },
    mastery: {
      score: 68,
      level: "Steady",
      confidence: 72,
      sparkline: [45, 50, 52, 55, 58, 60, 62, 64, 66, 67, 68, 68, 70, 68, 68],
      totalMinutes: 320,
      lastPracticed: "2025-10-06",
    },
  },
  {
    id: "metta",
    title: "Mettā (Loving-Kindness)",
    teacher: {
      name: "Sharon Salzberg",
      bio: "Mettā practice cultivates warm-hearted, unconditional goodwill toward yourself and others. Begin with phrases like 'May I be happy, may I be safe,' then extend this care outward—to loved ones, neutral people, difficult people, and all beings.",
      image: "sharon-salzberg",
    },
    scholar: {
      name: "Dr. Analayo",
      context: "Mettā bhāvanā is one of the four Brahmavihāras (divine abodes) described in early Buddhist texts. It counters ill-will and anger, and is traditionally used to develop both concentration and heart qualities. The Karaniya Metta Sutta is the most famous discourse on this practice.",
    },
    research: {
      summary: "Loving-kindness meditation has shown measurable effects on social connection, positive emotions, and physiological markers of well-being.",
      findings: [
        "Increases positive emotions and social connectedness after just 7 weeks of practice",
        "Enhances vagal tone, linked to improved emotional regulation",
        "Reduces implicit bias and increases empathy toward out-group members",
        "Associated with increased telomere length, a marker of cellular aging"
      ]
    },
    tags: ["Theravāda", "Heart", "Brahmavihāra"],
    durations: [5, 10, 20],
    guide: {
      steps: [
        "Sit comfortably and take a few settling breaths",
        "Bring to mind an image of yourself",
        "Silently repeat: 'May I be happy. May I be healthy. May I be safe. May I live with ease.'",
        "Feel the intention behind the words",
        "When ready, bring to mind a loved one and repeat the phrases for them",
        "Continue with a neutral person, then a difficult person",
        "End by extending mettā to all beings everywhere",
      ],
      audioAvailable: true,
    },
    mastery: {
      score: 62,
      level: "Steady",
      confidence: 68,
      sparkline: [40, 42, 45, 48, 50, 52, 55, 58, 60, 61, 62, 62, 64, 62, 62],
      totalMinutes: 180,
      lastPracticed: "2025-10-05",
    },
  },
  {
    id: "body-scan",
    title: "Body Scan",
    teacher: {
      name: "Jon Kabat-Zinn",
      bio: "The body scan is a systematic journey through the body, bringing gentle, curious attention to each part. Notice sensations—warmth, tingling, tension, or ease—without trying to change anything. This practice builds somatic awareness and releases held tension.",
      image: "jon-kabat-zinn",
    },
    scholar: {
      name: "Dr. Joanna Macy",
      context: "The body scan draws from the second foundation of mindfulness (kāyānupassanā) in the Satipaṭṭhāna Sutta. While traditional instructions focus on posture and elements, modern body scans integrate somatic psychology and stress reduction, popularized through MBSR (Mindfulness-Based Stress Reduction).",
    },
    research: {
      summary: "Body scan meditation is a core component of MBSR and has been studied for pain management and stress reduction.",
      findings: [
        "Reduces chronic pain intensity and pain-related distress in clinical trials",
        "Decreases cortisol levels and inflammatory markers",
        "Improves interoceptive awareness and body-mind connection",
        "Effective for managing symptoms of fibromyalgia and irritable bowel syndrome"
      ]
    },
    tags: ["MBSR", "Somatic", "Awareness"],
    durations: [10, 20, 30],
    guide: {
      steps: [
        "Lie down or sit in a comfortable position",
        "Take a few deep breaths to settle",
        "Bring attention to your left foot",
        "Notice any sensations—warmth, tingling, pressure, or nothing at all",
        "Slowly move attention up through your left leg, then right leg",
        "Continue through pelvis, torso, arms, neck, and head",
        "End by noticing the body as a whole",
      ],
      audioAvailable: true,
    },
    mastery: {
      score: 45,
      level: "Learning",
      confidence: 50,
      sparkline: [20, 25, 28, 30, 32, 35, 38, 40, 42, 43, 45, 45, 46, 45, 45],
      totalMinutes: 90,
      lastPracticed: "2025-10-04",
    },
  },
  {
    id: "open-monitoring",
    title: "Open Monitoring",
    teacher: {
      name: "Joseph Goldstein",
      bio: "Open monitoring is a choiceless awareness practice. Rather than focusing on one object (like the breath), you remain receptive to whatever arises—sounds, sensations, thoughts, emotions. Notice each experience as it comes and goes, without grasping or pushing away.",
      image: "joseph-goldstein",
    },
    scholar: {
      name: "Dr. B. Alan Wallace",
      context: "This practice aligns with vipassanā (insight) meditation and Dzogchen's rigpa (open awareness). It differs from focused attention by not selecting a single object. Cognitive science studies suggest it enhances meta-awareness and reduces the default mode network's activity.",
    },
    research: {
      summary: "Open monitoring meditation shows distinct neural patterns compared to focused attention practices.",
      findings: [
        "Reduces activity in default mode network, associated with mind-wandering",
        "Enhances meta-awareness and cognitive flexibility",
        "Shows different EEG patterns than focused attention meditation",
        "May be more effective for creative problem-solving and divergent thinking"
      ]
    },
    tags: ["Vipassanā", "Awareness", "Advanced"],
    durations: [10, 20, 30],
    guide: {
      steps: [
        "Sit comfortably with a relaxed, alert posture",
        "Begin with a few minutes of breath awareness to settle",
        "Open your attention to the full field of experience",
        "Notice whatever arises—sounds, body sensations, thoughts, emotions",
        "Label softly if helpful: 'hearing,' 'thinking,' 'feeling'",
        "Let experiences come and go without following or suppressing them",
        "Rest in open, spacious awareness",
      ],
      audioAvailable: true,
    },
    mastery: {
      score: 32,
      level: "Exploring",
      confidence: 35,
      sparkline: [10, 12, 15, 18, 20, 22, 25, 27, 29, 30, 32, 32, 33, 32, 32],
      totalMinutes: 60,
      lastPracticed: "2025-10-03",
    },
  },
  {
    id: "walking-meditation",
    title: "Walking Meditation",
    teacher: {
      name: "Thich Nhat Hanh",
      bio: "Walking meditation brings mindfulness into movement. Walk slowly and deliberately, coordinating your steps with your breath. Feel your feet touching the earth. Each step is an arrival, not a means to an end. This practice integrates body, breath, and awareness.",
      image: "thich-nhat-hanh",
    },
    scholar: {
      name: "Dr. Gil Fronsdal",
      context: "Cankama (walking meditation) is one of the four traditional postures for meditation in Buddhism, alongside sitting, standing, and reclining. It is used to balance energy, prevent drowsiness, and develop continuous mindfulness in daily life. The Satipaṭṭhāna Sutta includes walking as a key contemplation.",
    },
    research: {
      summary: "Walking meditation combines mindfulness with gentle physical activity, offering unique benefits for both mental and physical health.",
      findings: [
        "Improves balance and gait in elderly populations",
        "Reduces symptoms of depression comparable to seated meditation",
        "May be more accessible for those with physical discomfort during seated practice",
        "Enhances mind-body integration and proprioceptive awareness"
      ]
    },
    tags: ["Movement", "Mindfulness", "Theravāda"],
    durations: [5, 10, 15],
    guide: {
      steps: [
        "Find a quiet path 10-15 paces long",
        "Stand at one end and take a moment to settle",
        "Walk very slowly, feeling each movement: lifting, moving, placing",
        "Coordinate your steps with your breath if helpful",
        "When you reach the end, pause, turn mindfully, and continue",
        "If your mind wanders, gently return to the sensations of walking",
        "Continue for the duration of your practice",
      ],
      audioAvailable: false,
    },
    mastery: {
      score: 55,
      level: "Steady",
      confidence: 60,
      sparkline: [35, 38, 40, 42, 45, 47, 50, 52, 53, 54, 55, 55, 56, 55, 55],
      totalMinutes: 120,
      lastPracticed: "2025-10-07",
    },
  },
  {
    id: "noting",
    title: "Noting Practice",
    teacher: {
      name: "Shinzen Young",
      bio: "Noting is a precision tool for developing mindfulness. As experiences arise, give them a brief mental label: 'seeing,' 'hearing,' 'thinking,' 'feeling.' The label should be light and quick, like a Post-it note. This practice sharpens concentration and builds equanimity.",
      image: "jack-kornfield",
    },
    scholar: {
      name: "Dr. Daniel Ingram",
      context: "Noting is associated with Mahasi Sayadaw's Burmese vipassanā tradition. It formalizes the practice of sati (mindfulness) by naming the objects of awareness. This method is popular in contemporary insight meditation and is considered efficient for developing both concentration and insight.",
    },
    research: {
      summary: "Noting practice enhances metacognitive awareness and emotional regulation through explicit labeling of experiences.",
      findings: [
        "Verbal labeling of emotions reduces amygdala activity and emotional reactivity",
        "Improves mindfulness trait scores more rapidly than other techniques",
        "Enhances interoceptive accuracy and self-awareness",
        "Particularly effective for managing anxiety and rumination"
      ]
    },
    tags: ["Vipassanā", "Mahasi", "Technique"],
    durations: [10, 20, 30],
    guide: {
      steps: [
        "Sit comfortably and settle into your posture",
        "Begin with breath awareness for a minute or two",
        "As sensations, thoughts, or emotions arise, note them softly",
        "Use simple labels: 'hearing,' 'thinking,' 'feeling,' 'tightness,' 'pleasant'",
        "Note at the pace of one label per second or slower",
        "Don't force labels—let them arise naturally",
        "Return to the breath if you lose track",
      ],
      audioAvailable: true,
    },
    mastery: {
      score: 28,
      level: "Exploring",
      confidence: 30,
      sparkline: [5, 8, 10, 12, 15, 18, 20, 22, 24, 26, 28, 28, 29, 28, 28],
      totalMinutes: 45,
      lastPracticed: "2025-10-02",
    },
  },
  {
    id: "zazen",
    title: "Zazen (Just Sitting)",
    teacher: {
      name: "Shunryu Suzuki",
      bio: "Zazen is not meditation on something—it is just sitting. Sit upright with eyes half-open, gazing softly downward. Let thoughts come and go like clouds. Don't chase them or push them away. This is shikantaza: 'nothing but precisely sitting.'",
      image: "tara-brach",
    },
    scholar: {
      name: "Dr. Taigen Dan Leighton",
      context: "Zazen is the heart of Sōtō Zen practice. Unlike koan study (Rinzai), Sōtō emphasizes shikantaza—objectless meditation. Dōgen Zenji taught that zazen is not a means to enlightenment but the expression of enlightenment itself. This non-goal-oriented approach influences modern Western mindfulness.",
    },
    research: {
      summary: "Zen meditation has been studied for its unique approach to consciousness and its effects on attention and self-referential processing.",
      findings: [
        "Long-term practitioners show reduced habitual responding and increased present-moment awareness",
        "Associated with decreased self-referential thinking and ego-dissolution experiences",
        "Unique brain activity patterns distinct from other meditation styles",
        "May enhance acceptance and reduce avoidance behaviors in psychological distress"
      ]
    },
    tags: ["Zen", "Sōtō", "Awareness"],
    durations: [10, 20, 40],
    guide: {
      steps: [
        "Sit on a cushion or chair with a straight, dignified posture",
        "Rest hands in cosmic mudra (left hand on right, thumbs touching)",
        "Eyes half-open, gaze softly at the floor a few feet ahead",
        "Breathe naturally—don't control it",
        "Don't focus on anything in particular",
        "When thoughts arise, let them pass like clouds",
        "Just sit",
      ],
      audioAvailable: false,
    },
    mastery: {
      score: 75,
      level: "Steady",
      confidence: 80,
      sparkline: [60, 62, 64, 66, 68, 70, 72, 73, 74, 75, 75, 76, 75, 75, 75],
      totalMinutes: 420,
      lastPracticed: "2025-10-07",
    },
  },
  {
    id: "tonglen",
    title: "Tonglen (Taking and Sending)",
    teacher: {
      name: "Pema Chödrön",
      bio: "Tonglen reverses our usual logic. On the in-breath, breathe in suffering—yours or others'. On the out-breath, send out relief, spaciousness, whatever would help. This counterintuitive practice develops courage and compassion by leaning into, rather than away from, difficulty.",
      image: "pema-chodron",
    },
    scholar: {
      name: "Dr. Reginald Ray",
      context: "Tonglen is a Tibetan Buddhist lojong (mind training) practice, associated with the Kadampa and later Kagyu traditions. It is part of the bodhisattva path, which emphasizes compassion for all beings. The practice subverts ego-clinging and is considered advanced, as it requires stable equanimity.",
    },
    research: {
      summary: "Compassion-based practices like Tonglen are being studied for their effects on prosocial behavior and emotional resilience.",
      findings: [
        "Increases compassionate behavior and altruistic actions in laboratory settings",
        "May enhance resilience to secondary traumatic stress in caregiving professions",
        "Associated with increased neural activity in empathy-related brain regions",
        "Shows promise for treating PTSD and trauma through counter-intuitive engagement"
      ]
    },
    tags: ["Tibetan", "Heart", "Advanced"],
    durations: [10, 15, 20],
    guide: {
      steps: [
        "Sit comfortably and take a few grounding breaths",
        "Visualize or sense something you're struggling with",
        "On the in-breath, breathe in that difficulty as dark, heavy smoke",
        "On the out-breath, send out relief, light, spaciousness",
        "Continue for yourself, then for someone else, then for all beings",
        "If it feels too intense, return to neutral breathing",
        "End with a few breaths of rest",
      ],
      audioAvailable: true,
    },
    mastery: {
      score: 18,
      level: "Exploring",
      confidence: 20,
      sparkline: [5, 6, 8, 10, 12, 14, 15, 16, 17, 18, 18, 19, 18, 18, 18],
      totalMinutes: 30,
      lastPracticed: "2025-09-28",
    },
  },
];
