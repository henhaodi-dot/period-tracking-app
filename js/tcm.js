// TCM content engine with constitution and lactation filters

export const phaseInfo = {
  menstrual: {
    pathology: { zh: '血海泄溢，血室正开', en: 'Blood chamber opening, blood descending' },
    principle: { zh: '活血调经，温经散寒。勿食生冷。', en: 'Let it move, keep warm, no cold or raw food.' },
    season: 'winter',
    journalPrompt: { zh: '有什么准备好放下的吗？', en: "What's ready to be let go of?" }
  },
  follicular: {
    pathology: { zh: '血海空虚，阴血渐复', en: 'Blood sea empty, yin and blood rebuilding' },
    principle: { zh: '滋阴养血，填精益髓。不宜行气。', en: 'Rebuild blood and yin. Don\'t move qi yet.' },
    season: 'spring',
    journalPrompt: { zh: '什么真正让你恢复精力？', en: 'What actually restores you?' }
  },
  ovulatory: {
    pathology: { zh: '重阴转阳，氤氲之时', en: 'Deep yin transforming to yang' },
    principle: { zh: '助阳活血，温肾暖宫。', en: 'Gentle qi movement, warm the low back.' },
    season: 'summer',
    journalPrompt: { zh: '有什么正在转变的吗？', en: "What's turning over?" }
  },
  luteal: {
    pathology: { zh: '阳气渐长，肝气易郁', en: 'Yang qi rising, liver qi prone to stagnation' },
    principle: { zh: '疏肝理气，健脾助运。饮食宜清淡。', en: 'Soothe liver qi, lighter food.' },
    season: 'autumn',
    journalPrompt: { zh: '有什么还没有说出口的？', en: "What hasn't been said?" }
  }
};

export const remedies = [
  // === Menstrual phase ===
  { id: 'brown-sugar-ginger', name: { zh: '红糖姜茶', en: 'Brown sugar ginger tea' }, type: 'food', thermal: 'warming', actions: ['活血', '温经'], suitablePhases: ['menstrual'], suitableConstitutions: { thermal: ['cool', 'neutral'] }, lactationEffect: 'neutral', cautions: [], description: { zh: '温经散寒，活血化瘀，缓解经期不适', en: 'Warms the channels, dispels cold, eases menstrual discomfort' } },
  { id: 'dang-gui-egg', name: { zh: '当归煮蛋', en: 'Dang gui boiled egg' }, type: 'food', thermal: 'warming', actions: ['补血', '活血'], suitablePhases: ['menstrual'], suitableConstitutions: { thermal: ['cool', 'neutral'] }, lactationEffect: 'increases', cautions: [], description: { zh: '补血活血，适合经期血虚者', en: 'Nourishes and activates blood, good for blood deficiency during menses' } },
  { id: 'rose-tea', name: { zh: '玫瑰花茶', en: 'Rose tea' }, type: 'herb', thermal: 'warming', actions: ['疏肝', '活血'], suitablePhases: ['menstrual', 'luteal'], suitableConstitutions: { thermal: ['cool', 'neutral', 'warm'] }, lactationEffect: 'neutral', cautions: [], description: { zh: '疏肝理气，活血化瘀', en: 'Soothes liver qi, mildly activates blood' } },
  { id: 'lamb-soup', name: { zh: '羊肉汤', en: 'Lamb soup' }, type: 'food', thermal: 'warming', actions: ['温经', '补气'], suitablePhases: ['menstrual'], suitableConstitutions: { thermal: ['cool'] }, lactationEffect: 'increases', cautions: [{ zh: '体质偏热者慎用', en: 'Avoid if constitution runs warm' }], description: { zh: '温补气血，驱寒暖宫', en: 'Warms and tonifies qi and blood' } },

  // === Follicular phase ===
  { id: 'goji-chrysanthemum', name: { zh: '枸杞菊花茶', en: 'Goji chrysanthemum tea' }, type: 'herb', thermal: 'neutral', actions: ['滋阴', '明目'], suitablePhases: ['follicular'], suitableConstitutions: { thermal: ['cool', 'neutral', 'warm'] }, lactationEffect: 'neutral', cautions: [], description: { zh: '滋补肝肾，清肝明目', en: 'Nourishes liver and kidney yin, brightens eyes' } },
  { id: 'black-sesame', name: { zh: '黑芝麻糊', en: 'Black sesame paste' }, type: 'food', thermal: 'neutral', actions: ['补血', '滋阴'], suitablePhases: ['follicular'], suitableConstitutions: { thermal: ['cool', 'neutral', 'warm'] }, lactationEffect: 'increases', cautions: [], description: { zh: '补肝肾，益精血，润肠', en: 'Tonifies liver-kidney, nourishes essence and blood' } },
  { id: 'tremella-lotus', name: { zh: '银耳莲子羹', en: 'Tremella lotus seed soup' }, type: 'food', thermal: 'neutral', actions: ['滋阴', '养心'], suitablePhases: ['follicular'], suitableConstitutions: { thermal: ['cool', 'neutral', 'warm'] }, lactationEffect: 'neutral', cautions: [], description: { zh: '滋阴润肺，养心安神', en: 'Nourishes yin, calms the heart-spirit' } },
  { id: 'pork-liver-spinach', name: { zh: '猪肝菠菜', en: 'Pork liver with spinach' }, type: 'food', thermal: 'neutral', actions: ['补血', '明目'], suitablePhases: ['follicular'], suitableConstitutions: { thermal: ['cool', 'neutral'] }, lactationEffect: 'neutral', cautions: [], description: { zh: '补血养肝，适合经后血虚', en: 'Replenishes blood, good for post-menstrual blood deficiency' } },
  { id: 'red-date-longan', name: { zh: '红枣桂圆茶', en: 'Red date longan tea' }, type: 'food', thermal: 'warming', actions: ['补血', '养心'], suitablePhases: ['follicular'], suitableConstitutions: { thermal: ['cool', 'neutral'] }, lactationEffect: 'increases', cautions: [{ zh: '体质偏热者少用', en: 'Use sparingly if constitution runs warm' }], description: { zh: '补气养血，安神益脾', en: 'Tonifies qi and blood, calms spirit' } },

  // === Ovulatory phase ===
  { id: 'walnut-congee', name: { zh: '核桃粥', en: 'Walnut congee' }, type: 'food', thermal: 'warming', actions: ['补肾', '温阳'], suitablePhases: ['ovulatory'], suitableConstitutions: { thermal: ['cool', 'neutral'] }, lactationEffect: 'neutral', cautions: [], description: { zh: '温补肾阳，益精', en: 'Warms kidney yang, benefits essence' } },
  { id: 'shrimp', name: { zh: '虾', en: 'Shrimp' }, type: 'food', thermal: 'warming', actions: ['补肾', '温阳'], suitablePhases: ['ovulatory'], suitableConstitutions: { thermal: ['cool', 'neutral'] }, lactationEffect: 'increases', cautions: [], description: { zh: '温阳补肾，通乳', en: 'Warms yang, tonifies kidney' } },
  { id: 'cinnamon-tea', name: { zh: '肉桂茶', en: 'Cinnamon tea' }, type: 'herb', thermal: 'warming', actions: ['温阳', '温经'], suitablePhases: ['ovulatory'], suitableConstitutions: { thermal: ['cool'] }, lactationEffect: 'neutral', cautions: [{ zh: '体质偏热者避用', en: 'Avoid if constitution runs warm' }], description: { zh: '温补命门火，暖宫', en: 'Warms the gate of life fire' } },

  // === Luteal phase ===
  { id: 'chrysanthemum-tea', name: { zh: '菊花茶', en: 'Chrysanthemum tea' }, type: 'herb', thermal: 'cooling', actions: ['疏肝', '降火'], suitablePhases: ['luteal'], suitableConstitutions: { thermal: ['warm', 'neutral'] }, lactationEffect: 'neutral', cautions: [{ zh: '体质偏寒者少饮', en: 'Drink less if constitution runs cool' }], description: { zh: '清肝泻火，平肝明目', en: 'Clears liver heat, calms liver' } },
  { id: 'chen-pi-tea', name: { zh: '陈皮茶', en: 'Aged tangerine peel tea' }, type: 'herb', thermal: 'warming', actions: ['理气', '健脾'], suitablePhases: ['luteal'], suitableConstitutions: { thermal: ['cool', 'neutral', 'warm'] }, lactationEffect: 'neutral', cautions: [], description: { zh: '理气健脾，燥湿化痰', en: 'Regulates qi, strengthens spleen' } },
  { id: 'celery', name: { zh: '芹菜', en: 'Celery' }, type: 'food', thermal: 'cooling', actions: ['疏肝', '降火'], suitablePhases: ['luteal'], suitableConstitutions: { thermal: ['warm', 'neutral'] }, lactationEffect: 'neutral', cautions: [], description: { zh: '清肝降压，疏通肝气', en: 'Clears liver, regulates qi' } },
  { id: 'lily-bulb-congee', name: { zh: '百合粥', en: 'Lily bulb congee' }, type: 'food', thermal: 'cooling', actions: ['滋阴', '安神'], suitablePhases: ['luteal'], suitableConstitutions: { thermal: ['warm', 'neutral'] }, lactationEffect: 'neutral', cautions: [], description: { zh: '养阴润肺，清心安神', en: 'Nourishes yin, calms the mind' } },
  { id: 'hawthorn-tea', name: { zh: '山楂茶', en: 'Hawthorn tea' }, type: 'herb', thermal: 'warming', actions: ['理气', '活血'], suitablePhases: ['luteal'], suitableConstitutions: { thermal: ['cool', 'neutral'] }, lactationEffect: 'reduces', cautions: [{ zh: '哺乳期慎用', en: 'Use with caution while breastfeeding' }], description: { zh: '消食化积，理气活血', en: 'Aids digestion, regulates qi and blood' } },

  // === Lactation-sensitive items ===
  { id: 'peppermint-tea', name: { zh: '薄荷茶', en: 'Peppermint tea' }, type: 'herb', thermal: 'cooling', actions: ['疏肝', '降火'], suitablePhases: ['luteal'], suitableConstitutions: { thermal: ['warm'] }, lactationEffect: 'reduces', cautions: [{ zh: '哺乳期避免使用', en: 'Avoid while breastfeeding' }], description: { zh: '疏散风热，清利头目', en: 'Disperses wind-heat, clears the head' } },
  { id: 'malt-tea', name: { zh: '麦芽茶', en: 'Malt tea' }, type: 'herb', thermal: 'neutral', actions: ['理气', '健脾'], suitablePhases: ['luteal'], suitableConstitutions: { thermal: ['cool', 'neutral', 'warm'] }, lactationEffect: 'dose-dependent', cautions: [{ zh: '大剂量可回乳', en: 'High doses may reduce milk supply' }], description: { zh: '消食和中，小剂量助消化', en: 'Aids digestion in small doses; large doses reduce lactation' } },
];

export function getRemediesForPhase(phase, constitution, breastfeeding) {
  return remedies.filter(r => {
    if (!r.suitablePhases.includes(phase)) return false;
    if (breastfeeding && r.lactationEffect === 'reduces') return false;
    if (constitution && constitution.thermal) {
      if (r.suitableConstitutions.thermal && !r.suitableConstitutions.thermal.includes(constitution.thermal)) return false;
    }
    return true;
  }).map(r => {
    const item = { ...r };
    if (breastfeeding && r.lactationEffect === 'dose-dependent') {
      item.demoted = true;
    }
    return item;
  }).sort((a, b) => (a.demoted ? 1 : 0) - (b.demoted ? 1 : 0));
}

export function getBleedingInterpretation(bleeding, lang = 'en') {
  if (!bleeding) return null;
  const patterns = [];
  if (bleeding.colour === 'dark' && (bleeding.clots === 'small' || bleeding.clots === 'large')) {
    patterns.push({ zh: '血瘀', en: 'Blood stasis pattern' });
  }
  if (bleeding.colour === 'pink' || (bleeding.flow === 'light' && bleeding.colour === 'bright')) {
    patterns.push({ zh: '血虚', en: 'Blood deficiency pattern' });
  }
  if (bleeding.colour === 'bright' && bleeding.flow === 'heavy') {
    patterns.push({ zh: '血热', en: 'Blood heat pattern' });
  }
  return patterns.length > 0 ? patterns : null;
}
