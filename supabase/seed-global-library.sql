-- Seed Global Library with 5 Meditation Techniques
-- These will be submitted by "Contempla" system account as pending (not approved)

DO $$
DECLARE
  contempla_user_id UUID;
  contempla_profile_id UUID;
BEGIN
  -- Step 1: Check if Contempla user exists
  SELECT id INTO contempla_user_id
  FROM auth.users
  WHERE email = 'contempla@contempla.app'
  LIMIT 1;

  -- Step 2: If Contempla user doesn't exist, create it
  IF contempla_user_id IS NULL THEN
    RAISE NOTICE 'Creating Contempla system user...';

    -- Insert into auth.users (this is a system account)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'contempla@contempla.app',
      crypt('SYSTEM_ACCOUNT_NO_LOGIN', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO contempla_user_id;

    RAISE NOTICE 'Created Contempla user with ID: %', contempla_user_id;
  ELSE
    RAISE NOTICE 'Found existing Contempla user with ID: %', contempla_user_id;
  END IF;

  -- Step 3: Check if Contempla profile exists
  SELECT id INTO contempla_profile_id
  FROM profiles
  WHERE id = contempla_user_id
  LIMIT 1;

  -- Step 4: If Contempla profile doesn't exist, create it
  IF contempla_profile_id IS NULL THEN
    RAISE NOTICE 'Creating Contempla profile...';

    INSERT INTO profiles (
      id,
      handle,
      name,
      bio,
      created_at,
      updated_at
    ) VALUES (
      contempla_contempla_user_id,
      'contempla',
      'Contempla',
      'Official Contempla account for curated meditation techniques',
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Created Contempla profile with handle @contempla';
  ELSE
    RAISE NOTICE 'Found existing Contempla profile';
  END IF;

  RAISE NOTICE 'Using Contempla user ID: %', contempla_user_id;

  -- Insert 5 meditation techniques
  INSERT INTO public.global_techniques (
    name,
    teacher_attribution,
    origin_story,
    instructions,
    tips,
    tradition,
    lineage_info,
    relevant_link,
    tags,
    worldview_context,
    submitted_by,
    approval_status
  ) VALUES
  -- TECHNIQUE 1: Loving-Kindness Meditation
  (
    'Loving-Kindness Meditation',
    'Sharon Salzberg',
    'A practice of offering silent phrases of well-wishing to ourselves, others, and all beings. Loving-kindness meditation cultivates our natural capacity for an open and loving heart, realizing how interconnected all of our lives are. The practice leads to the development of concentration, connection, fearlessness, and genuine happiness.',
    '1. Sit comfortably, or lie down if that''s better for you. Close your eyes or leave them open.
2. Let your attention settle into your body and take a few deep breaths.
3. Allow your breath to be natural. Choose phrases such as: may I be safe, be happy, be healthy, live with ease.
4. Repeat these phrases over and over with enough space and silence to create a rhythm that''s pleasing to you.
5. Bring to mind a benefactor, someone who has helped you. Visualize them, say their name to yourself, and offer the phrases: may you be safe, be happy, be healthy, live with ease.
6. Have that benefactor offer loving-kindness back to you. Put yourself in the position of the recipient as they offer the phrases to you.
7. Bring to mind a good friend. Offer them the phrases of loving-kindness: may you be safe, be happy, be healthy, live with ease.
8. Imagine a gathering of friends and family, anyone that comes to mind. Offer loving-kindness to that collective: may you be safe, be happy, be healthy, live with ease.
9. Add all beings everywhere: all people, all creatures, all those in existence, near and far, known and unknown. May all beings be safe, be happy, be healthy, live with ease.',
    '• Use any variation of phrases that are personally meaningful to you
• Don''t struggle to get a certain kind of feeling; let the feelings come and go naturally
• If emotions arise, let them wash through you as you steady your attention on the repetition of the phrases
• The practice works whether it feels glorious or mechanical; what matters is forming the intention
• Practice for 20 minutes for a complete session',
    'Buddhist meditation (Metta practice)',
    'Lovingkindness by Sharon Salzberg, or Real Happiness by Sharon Salzberg',
    'https://www.mindful.org/a-guided-loving-kindness-meditation-with-sharon-salzberg/',
    ARRAY['20 min'],
    'Sharon Salzberg is co-founder of the Insight Meditation Society in Barre, Massachusetts, and has played a crucial role in bringing Asian meditation practices to the West. She has been a student of meditation since 1971, guiding retreats worldwide since 1974.',
    contempla_user_id,
    'pending'
  ),

  -- TECHNIQUE 2: Centering Prayer
  (
    'Centering Prayer',
    'Thomas Keating',
    'A receptive method of Christian silent prayer which deepens our relationship with God, the Indwelling Presence. A prayer in which we can experience God''s presence within us, closer than breathing, closer than thinking, closer than consciousness itself. This method is both a relationship with God and a discipline to deepen that relationship.',
    '1. Choose a sacred word as the symbol of your intention to consent to God''s presence and action within.
2. Sit comfortably with eyes closed. Settle briefly in silence.
3. Silently introduce the sacred word as the symbol of your consent to God''s presence and action within.
4. When you become engaged with your thoughts, return ever-so-gently to the sacred word.
5. At the end of the prayer period, remain in silence with eyes closed for a couple of minutes.',
    '• Practice Centering Prayer for a minimum of 20 minutes, twice each day
• The sacred word can be any word such as Jesus, peace, or Abba that represents your intention
• You may also practice with a sacred breath instead of a word, gently touching the breath with your attention
• Resist no thought, retain no thought, react to no thought; simply return to the sacred word
• This is a time for God to heal and transform you through what Thomas Keating called Divine Therapy',
    'Christian Contemplative Prayer',
    'Open Mind, Open Heart by Thomas Keating',
    'https://www.contemplativeoutreach.org/centering-prayer-method/',
    ARRAY['20 min'],
    'Centering Prayer was developed in the 1970s by Trappist monks William Meninger, M. Basil Pennington, and Thomas Keating at St. Joseph''s Abbey in Spencer, Massachusetts. The practice is based on Matthew 6:6 and influenced by The Cloud of Unknowing and Desert Fathers teachings.',
    contempla_user_id,
    'pending'
  ),

  -- TECHNIQUE 3: Body Scan Meditation
  (
    'Body Scan Meditation',
    'Jon Kabat-Zinn',
    'A systematic practice of sweeping through the body with the mind, bringing an affectionate, openhearted, interested attention to its various regions. One of the lying down practices that people train in Mindfulness-Based Stress Reduction. Without moving a muscle, we put our mind anywhere in the body we choose and feel and be aware of whatever sensations are present in that moment.',
    '1. Lie down on your back in a comfortable position. You may also sit if lying down doesn''t work for you.
2. Close your eyes and take a few deep breaths to settle your body.
3. Bring attention to the toes of your left foot, noticing any sensations present.
4. Move through the entirety of the left foot: sole, heel, top of the foot.
5. Move up the left leg, including the ankle, shin and calf, knee and kneecap, the thigh in its entirety.
6. Move to the toes of the right foot, then up the right leg in the same manner as the left.
7. Move attention into the pelvic region, including hips, buttocks, genitals, and lower back.
8. Move to the abdomen, then the upper torso: upper back, chest, and ribs.
9. Move attention down both arms simultaneously, from shoulders to fingertips.
10. Move to the neck, throat, face, and head, including jaw, eyes, forehead, and crown.
11. After completing the scan, bring awareness to the whole body breathing.',
    '• A thorough body scan takes 30 to 45 minutes of uninterrupted relaxation and focus
• It''s not uncommon to fall asleep during the practice; simply begin again when you notice
• Sensations may feel more acute during practice, but they are met more accurately with less judgment
• If discomfort becomes too much, stay with your breath or open your eyes to orient yourself
• This is not about forcing anything; simply tuning in and opening to sensations that are already present',
    'Mindfulness-Based Stress Reduction (MBSR)',
    'Full Catastrophe Living by Jon Kabat-Zinn or Coming to Our Senses by Jon Kabat-Zinn',
    'https://palousemindfulness.com/docs/bodyscan.pdf',
    ARRAY['45 min'],
    'Body Scan Meditation is one of the core formal practices in MBSR programs developed at the University of Massachusetts Medical Center. Jon Kabat-Zinn describes it as developing a greater intimacy with bare sensation, opening to the give-and-take embedded in the reciprocity between sensations and our awareness of them.',
    contempla_user_id,
    'pending'
  ),

  -- TECHNIQUE 4: Box Breathing
  (
    'Box Breathing',
    'U.S. Navy SEALs',
    'A breathing technique used by first responders, the military, and athletes to focus, gain control, and manage stress. Also known as combat or tactical breathing, it helps control worry and nervousness through a simple four-count rotation of breathing in, holding the breath, breathing out, and holding again. The technique activates the parasympathetic nervous system to create a calming and relaxing effect.',
    '1. Sit comfortably with your spine straight, on the floor or in a chair with feet flat. You may also lie down or stand.
2. Close your eyes or maintain a soft, unfocused gaze.
3. Exhale fully through your mouth to release all stale air from your lungs.
4. Breathe in through your nose, slowly counting to four. Visualize each number as you count.
5. Stop and hold your breath, counting to four.
6. Exhale through your mouth, slowly counting to four. Concentrate on getting all the air out of your lungs.
7. Hold your breath with empty lungs, counting to four.
8. Repeat the cycle for at least 5 complete rounds, or continue for 5 minutes.',
    '• Relax yourself by taking 3 to 5 breaths as described
• Visualize each number as you count to enhance focus
• Effects are often noticeable after just 3-4 cycles
• For deeper stress relief, extend to 10-15 cycles
• Can be practiced anywhere, anytime stress strikes, even discreetly during meetings or in traffic',
    'Secular breathwork (military stress management)',
    'Based on pranayama, an Ayurvedic form of breathwork practiced in yoga',
    'https://www.health.harvard.edu/mind-and-mood/try-this-take-a-tactical-breather',
    ARRAY['5 min'],
    'Box breathing originated from ancient yogic breathing practices but gained modern prominence through adoption by U.S. Navy SEALs and other elite military forces. It''s used to maintain composure and mental clarity in life-threatening situations and high-stress scenarios.',
    contempla_user_id,
    'pending'
  ),

  -- TECHNIQUE 5: Anapana Meditation
  (
    'Anapana Meditation',
    'S.N. Goenka',
    'Observation of natural breath to concentrate the mind, used as preparation for Vipassana meditation. This practice involves keeping attention in the area below the nostrils and above the upper lip, remaining aware of each breath as it enters or leaves. The technique sharpens concentration and prepares the mind to observe bodily sensations with clarity.',
    '1. Sit in a comfortable, upright posture with your spine straight in a quiet environment.
2. Close your eyes and focus on the natural breath, observing it without controlling it.
3. Narrow your attention to the area around the nostrils and upper lip.
4. Notice the sensation of air entering and leaving this specific area.
5. If the mind is very dull or very agitated, breathe deliberately and slightly harder for some time. Otherwise, the breathing should be natural.
6. When your mind wanders, gently bring it back to the breath without judgment.
7. Continue observing breath after breath. The unwavering mind becomes still and pure.',
    '• Practice for 10-15 minutes daily, or longer during retreats
• In Goenka''s 10-day courses, practitioners do Anapana for the first 3 days before Vipassana
• This is not a breathing exercise; do not try to regulate the breath
• Do not repeat any word or mantra or visualize any shape along with awareness of respiration
• Observe bare respiration as it is
• If you cannot feel sensations, continue patiently; awareness will deepen with practice',
    'Theravada Buddhist meditation (Vipassana tradition)',
    'The Art of Living: Vipassana Meditation as taught by S.N. Goenka by William Hart',
    'https://www.dhamma.org/en/osguide',
    ARRAY['15 min'],
    'S.N. Goenka learned this technique from Sayagyi U Ba Khin in Burma and began teaching in India in 1969. Vipassana courses in this tradition are now held at over 390 locations in more than 90 countries. Goenka taught that Buddha''s path to liberation was non-sectarian, universal, and scientific in character.',
    contempla_user_id,
    'pending'
  );

  RAISE NOTICE 'Successfully inserted 5 meditation techniques!';
  RAISE NOTICE 'All techniques submitted by: Contempla (@contempla)';
  RAISE NOTICE 'All techniques are pending approval (approval_status = pending)';
  RAISE NOTICE 'To approve them, run: UPDATE global_techniques SET approval_status = ''approved'' WHERE approval_status = ''pending'';';

  -- Display verification info
  RAISE NOTICE '';
  RAISE NOTICE '=== Verification ===';
  RAISE NOTICE 'Run this query to verify the seeded techniques:';
  RAISE NOTICE 'SELECT gt.name, gt.teacher_attribution, p.handle, p.name FROM global_techniques gt JOIN profiles p ON gt.submitted_by = p.id WHERE gt.approval_status = ''pending'' ORDER BY gt.created_at DESC LIMIT 5;';
END $$;
