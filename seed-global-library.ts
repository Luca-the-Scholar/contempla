import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Read from .env file manually
const envContent = fs.readFileSync('.env', 'utf-8');
const projectId = envContent.match(/VITE_SUPABASE_PROJECT_ID="?([^"\n]+)"?/)?.[1] || '';
const publishableKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="?([^"\n]+)"?/)?.[1] || '';

// Initialize Supabase client
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publishableKey;

if (!projectId || !publishableKey) {
  throw new Error('Missing Supabase credentials in .env file');
}

console.log(`Using Supabase URL: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedGlobalLibrary() {
  console.log('🌱 Seeding Global Library...\n');

  // Step 1: Get the current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('❌ Error: Not authenticated. Please sign in first.');
    console.error('   Run the app and sign in, then run this script again.');
    return;
  }

  console.log(`✅ Authenticated as user ID: ${user.id}`);
  console.log(`   Email: ${user.email}\n`);

  // Step 2: Check if user has a profile
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, handle')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile) {
    console.error('❌ Error: User profile not found');
    console.error('   Please complete profile setup in the app first.');
    return;
  }

  console.log(`✅ Using profile:`);
  console.log(`   ID: ${userProfile.id}`);
  console.log(`   Name: ${userProfile.name}`);
  console.log(`   Handle: @${userProfile.handle}\n`);

  const submitterId = userProfile.id;

  // Step 2: Prepare techniques data
  const techniques = [
    {
      name: "Loving-Kindness Meditation",
      teacher_attribution: "Sharon Salzberg",
      origin_story: "A practice of offering silent phrases of well-wishing to ourselves, others, and all beings. Loving-kindness meditation cultivates our natural capacity for an open and loving heart, realizing how interconnected all of our lives are. The practice leads to the development of concentration, connection, fearlessness, and genuine happiness.",
      instructions: "1. Sit comfortably, or lie down if that's better for you. Close your eyes or leave them open.\n2. Let your attention settle into your body and take a few deep breaths.\n3. Allow your breath to be natural. Choose phrases such as: may I be safe, be happy, be healthy, live with ease.\n4. Repeat these phrases over and over with enough space and silence to create a rhythm that's pleasing to you.\n5. Bring to mind a benefactor, someone who has helped you. Visualize them, say their name to yourself, and offer the phrases: may you be safe, be happy, be healthy, live with ease.\n6. Have that benefactor offer loving-kindness back to you. Put yourself in the position of the recipient as they offer the phrases to you.\n7. Bring to mind a good friend. Offer them the phrases of loving-kindness: may you be safe, be happy, be healthy, live with ease.\n8. Imagine a gathering of friends and family, anyone that comes to mind. Offer loving-kindness to that collective: may you be safe, be happy, be healthy, live with ease.\n9. Add all beings everywhere: all people, all creatures, all those in existence, near and far, known and unknown. May all beings be safe, be happy, be healthy, live with ease.",
      tips: "• Use any variation of phrases that are personally meaningful to you\n• Don't struggle to get a certain kind of feeling; let the feelings come and go naturally\n• If emotions arise, let them wash through you as you steady your attention on the repetition of the phrases\n• The practice works whether it feels glorious or mechanical; what matters is forming the intention\n• Practice for 20 minutes for a complete session",
      tradition: "Buddhist meditation (Metta practice)",
      lineage_info: "Lovingkindness by Sharon Salzberg, or Real Happiness by Sharon Salzberg",
      relevant_link: "https://www.mindful.org/a-guided-loving-kindness-meditation-with-sharon-salzberg/",
      tags: ["20 min"],
      worldview_context: "Sharon Salzberg is co-founder of the Insight Meditation Society in Barre, Massachusetts, and has played a crucial role in bringing Asian meditation practices to the West. She has been a student of meditation since 1971, guiding retreats worldwide since 1974.",
      submitted_by: submitterId,
      approval_status: 'pending'
    },
    {
      name: "Centering Prayer",
      teacher_attribution: "Thomas Keating",
      origin_story: "A receptive method of Christian silent prayer which deepens our relationship with God, the Indwelling Presence. A prayer in which we can experience God's presence within us, closer than breathing, closer than thinking, closer than consciousness itself. This method is both a relationship with God and a discipline to deepen that relationship.",
      instructions: "1. Choose a sacred word as the symbol of your intention to consent to God's presence and action within.\n2. Sit comfortably with eyes closed. Settle briefly in silence.\n3. Silently introduce the sacred word as the symbol of your consent to God's presence and action within.\n4. When you become engaged with your thoughts, return ever-so-gently to the sacred word.\n5. At the end of the prayer period, remain in silence with eyes closed for a couple of minutes.",
      tips: "• Practice Centering Prayer for a minimum of 20 minutes, twice each day\n• The sacred word can be any word such as Jesus, peace, or Abba that represents your intention\n• You may also practice with a sacred breath instead of a word, gently touching the breath with your attention\n• Resist no thought, retain no thought, react to no thought; simply return to the sacred word\n• This is a time for God to heal and transform you through what Thomas Keating called Divine Therapy",
      tradition: "Christian Contemplative Prayer",
      lineage_info: "Open Mind, Open Heart by Thomas Keating",
      relevant_link: "https://www.contemplativeoutreach.org/centering-prayer-method/",
      tags: ["20 min"],
      worldview_context: "Centering Prayer was developed in the 1970s by Trappist monks William Meninger, M. Basil Pennington, and Thomas Keating at St. Joseph's Abbey in Spencer, Massachusetts. The practice is based on Matthew 6:6 and influenced by The Cloud of Unknowing and Desert Fathers teachings.",
      submitted_by: submitterId,
      approval_status: 'pending'
    },
    {
      name: "Body Scan Meditation",
      teacher_attribution: "Jon Kabat-Zinn",
      origin_story: "A systematic practice of sweeping through the body with the mind, bringing an affectionate, openhearted, interested attention to its various regions. One of the lying down practices that people train in Mindfulness-Based Stress Reduction. Without moving a muscle, we put our mind anywhere in the body we choose and feel and be aware of whatever sensations are present in that moment.",
      instructions: "1. Lie down on your back in a comfortable position. You may also sit if lying down doesn't work for you.\n2. Close your eyes and take a few deep breaths to settle your body.\n3. Bring attention to the toes of your left foot, noticing any sensations present.\n4. Move through the entirety of the left foot: sole, heel, top of the foot.\n5. Move up the left leg, including the ankle, shin and calf, knee and kneecap, the thigh in its entirety.\n6. Move to the toes of the right foot, then up the right leg in the same manner as the left.\n7. Move attention into the pelvic region, including hips, buttocks, genitals, and lower back.\n8. Move to the abdomen, then the upper torso: upper back, chest, and ribs.\n9. Move attention down both arms simultaneously, from shoulders to fingertips.\n10. Move to the neck, throat, face, and head, including jaw, eyes, forehead, and crown.\n11. After completing the scan, bring awareness to the whole body breathing.",
      tips: "• A thorough body scan takes 30 to 45 minutes of uninterrupted relaxation and focus\n• It's not uncommon to fall asleep during the practice; simply begin again when you notice\n• Sensations may feel more acute during practice, but they are met more accurately with less judgment\n• If discomfort becomes too much, stay with your breath or open your eyes to orient yourself\n• This is not about forcing anything; simply tuning in and opening to sensations that are already present",
      tradition: "Mindfulness-Based Stress Reduction (MBSR)",
      lineage_info: "Full Catastrophe Living by Jon Kabat-Zinn or Coming to Our Senses by Jon Kabat-Zinn",
      relevant_link: "https://palousemindfulness.com/docs/bodyscan.pdf",
      tags: ["45 min"],
      worldview_context: "Body Scan Meditation is one of the core formal practices in MBSR programs developed at the University of Massachusetts Medical Center. Jon Kabat-Zinn describes it as developing a greater intimacy with bare sensation, opening to the give-and-take embedded in the reciprocity between sensations and our awareness of them.",
      submitted_by: submitterId,
      approval_status: 'pending'
    },
    {
      name: "Box Breathing",
      teacher_attribution: "U.S. Navy SEALs",
      origin_story: "A breathing technique used by first responders, the military, and athletes to focus, gain control, and manage stress. Also known as combat or tactical breathing, it helps control worry and nervousness through a simple four-count rotation of breathing in, holding the breath, breathing out, and holding again. The technique activates the parasympathetic nervous system to create a calming and relaxing effect.",
      instructions: "1. Sit comfortably with your spine straight, on the floor or in a chair with feet flat. You may also lie down or stand.\n2. Close your eyes or maintain a soft, unfocused gaze.\n3. Exhale fully through your mouth to release all stale air from your lungs.\n4. Breathe in through your nose, slowly counting to four. Visualize each number as you count.\n5. Stop and hold your breath, counting to four.\n6. Exhale through your mouth, slowly counting to four. Concentrate on getting all the air out of your lungs.\n7. Hold your breath with empty lungs, counting to four.\n8. Repeat the cycle for at least 5 complete rounds, or continue for 5 minutes.",
      tips: "• Relax yourself by taking 3 to 5 breaths as described\n• Visualize each number as you count to enhance focus\n• Effects are often noticeable after just 3-4 cycles\n• For deeper stress relief, extend to 10-15 cycles\n• Can be practiced anywhere, anytime stress strikes, even discreetly during meetings or in traffic",
      tradition: "Secular breathwork (military stress management)",
      lineage_info: "Based on pranayama, an Ayurvedic form of breathwork practiced in yoga",
      relevant_link: "https://www.health.harvard.edu/mind-and-mood/try-this-take-a-tactical-breather",
      tags: ["5 min"],
      worldview_context: "Box breathing originated from ancient yogic breathing practices but gained modern prominence through adoption by U.S. Navy SEALs and other elite military forces. It's used to maintain composure and mental clarity in life-threatening situations and high-stress scenarios.",
      submitted_by: submitterId,
      approval_status: 'pending'
    },
    {
      name: "Anapana Meditation",
      teacher_attribution: "S.N. Goenka",
      origin_story: "Observation of natural breath to concentrate the mind, used as preparation for Vipassana meditation. This practice involves keeping attention in the area below the nostrils and above the upper lip, remaining aware of each breath as it enters or leaves. The technique sharpens concentration and prepares the mind to observe bodily sensations with clarity.",
      instructions: "1. Sit in a comfortable, upright posture with your spine straight in a quiet environment.\n2. Close your eyes and focus on the natural breath, observing it without controlling it.\n3. Narrow your attention to the area around the nostrils and upper lip.\n4. Notice the sensation of air entering and leaving this specific area.\n5. If the mind is very dull or very agitated, breathe deliberately and slightly harder for some time. Otherwise, the breathing should be natural.\n6. When your mind wanders, gently bring it back to the breath without judgment.\n7. Continue observing breath after breath. The unwavering mind becomes still and pure.",
      tips: "• Practice for 10-15 minutes daily, or longer during retreats\n• In Goenka's 10-day courses, practitioners do Anapana for the first 3 days before Vipassana\n• This is not a breathing exercise; do not try to regulate the breath\n• Do not repeat any word or mantra or visualize any shape along with awareness of respiration\n• Observe bare respiration as it is\n• If you cannot feel sensations, continue patiently; awareness will deepen with practice",
      tradition: "Theravada Buddhist meditation (Vipassana tradition)",
      lineage_info: "The Art of Living: Vipassana Meditation as taught by S.N. Goenka by William Hart",
      relevant_link: "https://www.dhamma.org/en/osguide",
      tags: ["15 min"],
      worldview_context: "S.N. Goenka learned this technique from Sayagyi U Ba Khin in Burma and began teaching in India in 1969. Vipassana courses in this tradition are now held at over 390 locations in more than 90 countries. Goenka taught that Buddha's path to liberation was non-sectarian, universal, and scientific in character.",
      submitted_by: submitterId,
      approval_status: 'pending'
    }
  ];

  // Step 3: Insert techniques
  console.log('📝 Inserting 5 meditation techniques...\n');

  const { data: inserted, error: insertError } = await supabase
    .from('global_techniques')
    .insert(techniques)
    .select('id, name, teacher_attribution, approval_status');

  if (insertError) {
    console.error('❌ Error inserting techniques:');
    console.error(insertError);
    return;
  }

  console.log(`✅ Successfully inserted ${inserted?.length || 0} techniques:\n`);
  inserted?.forEach((tech, idx) => {
    console.log(`${idx + 1}. ${tech.name}`);
    console.log(`   Attribution: ${tech.teacher_attribution}`);
    console.log(`   Status: ${tech.approval_status}`);
    console.log(`   ID: ${tech.id}\n`);
  });

  console.log('🎉 Global Library seeding complete!');
  console.log(`\n📋 Summary:`);
  console.log(`   - Techniques inserted: ${inserted?.length || 0}`);
  console.log(`   - Submitted by: @${lucaProfile.handle} (${lucaProfile.name})`);
  console.log(`   - Approval status: pending`);
  console.log(`   - Display name: Will show as "Submitted by ${lucaProfile.name}"`);
  console.log(`\n💡 Note: @${lucaProfile.handle} has full editing rights to these techniques.`);
  console.log(`   To approve them for display, update approval_status to 'approved'.`);
}

// Run the seed script
seedGlobalLibrary().catch(console.error);
