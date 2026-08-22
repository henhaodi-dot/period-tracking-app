let currentLang = 'en';

const strings = {
  // App
  appName: { zh: 'Cycle', en: 'Cycle' },

  // Nav
  navToday: { zh: '今天', en: 'Today' },
  navLog: { zh: '记录', en: 'Log' },
  navHistory: { zh: '历史', en: 'History' },
  navExplore: { zh: '探索', en: 'Explore' },
  navJournal: { zh: '日记', en: 'Journal' },
  navLearn: { zh: '了解', en: 'Learn' },
  navSettings: { zh: '设置', en: 'Settings' },

  // Phases
  phaseMenustrual: { zh: '行经期', en: 'Menstrual' },
  phaseFollicular: { zh: '经后期', en: 'Post-menstrual' },
  phaseOvulatory: { zh: '经间期', en: 'Ovulatory' },
  phaseLuteal: { zh: '经前期', en: 'Pre-menstrual' },

  // TCM pathology
  tcmMenstrual: { zh: '血海泄溢，血室正开', en: 'Blood chamber opening, blood descending' },
  tcmFollicular: { zh: '血海空虚，阴血渐复', en: 'Blood sea empty, yin and blood rebuilding' },
  tcmOvulatory: { zh: '重阴转阳，氤氲之时', en: 'Deep yin transforming to yang' },
  tcmLuteal: { zh: '阳气渐长，肝气易郁', en: 'Yang qi rising, liver qi prone to stagnation' },

  // TCM principles
  principleMenstrual: { zh: '活血调经，温经散寒', en: 'Activate blood, regulate menses, warm and dispel cold' },
  principleFollicular: { zh: '滋阴养血，填精益髓', en: 'Nourish yin and blood, replenish essence' },
  principleOvulatory: { zh: '助阳活血，温肾暖宫', en: 'Support yang, warm kidney and uterus' },
  principleLuteal: { zh: '疏肝理气，健脾助运', en: 'Soothe liver qi, strengthen spleen transport' },

  // Today
  cycleDay: { zh: '第{n}天', en: 'Day {n}' },
  hormoneSnapshot: { zh: '激素概览', en: 'Hormone Snapshot' },
  estrogen: { zh: '雌激素', en: 'Estrogen' },
  progesterone: { zh: '孕激素', en: 'Progesterone' },
  prolactinLabel: { zh: '泌乳素', en: 'Prolactin' },
  lhLabel: { zh: '黄体生成素', en: 'LH' },
  fshLabel: { zh: '卵泡刺激素', en: 'FSH' },
  recommendations: { zh: '调养建议', en: 'Suggestions' },
  quickLog: { zh: '快速记录', en: 'Quick Log' },

  // Hormone note
  modelNotMeasurement: { zh: '模型估算，非实际测量', en: 'Model estimate, not a measurement' },

  // Felt experience
  feltMenstrual: { zh: '子宫内膜脱落中，可能感到疲倦和不适', en: 'Uterine lining shedding — you may feel tired and tender' },
  feltFollicular: { zh: '雌激素上升中，精力和情绪通常会逐渐好转', en: 'Estrogen rising — energy and mood tend to climb from here' },
  feltOvulatory: { zh: '雌激素达到高峰，精力充沛，可能感到更自信', en: 'Estrogen peaks — you may feel energized and more confident' },
  feltLuteal: { zh: '孕激素升高中，身体开始减速，可能感到情绪波动', en: 'Progesterone rising — body slowing, mood may shift' },

  // Logging
  bleeding: { zh: '出血', en: 'Bleeding' },
  flow: { zh: '量', en: 'Flow' },
  flowNone: { zh: '无', en: 'None' },
  flowSpotting: { zh: '点滴', en: 'Spotting' },
  flowLight: { zh: '少量', en: 'Light' },
  flowMedium: { zh: '中等', en: 'Medium' },
  flowHeavy: { zh: '大量', en: 'Heavy' },
  colour: { zh: '颜色', en: 'Colour' },
  colourBright: { zh: '鲜红', en: 'Bright red' },
  colourDark: { zh: '暗红', en: 'Dark red' },
  colourBrown: { zh: '褐色', en: 'Brown' },
  colourPink: { zh: '粉色', en: 'Pink' },
  clots: { zh: '血块', en: 'Clots' },
  clotsNone: { zh: '无', en: 'None' },
  clotsSmall: { zh: '小', en: 'Small' },
  clotsLarge: { zh: '大', en: 'Large' },
  pain: { zh: '疼痛', en: 'Pain' },
  painNone: { zh: '无', en: 'None' },
  painMild: { zh: '轻微', en: 'Mild' },
  painModerate: { zh: '中等', en: 'Moderate' },
  painSevere: { zh: '剧烈', en: 'Severe' },
  symptoms: { zh: '症状', en: 'Symptoms' },
  mood: { zh: '情绪', en: 'Mood' },
  discharge: { zh: '白带', en: 'Discharge' },
  dischargeDry: { zh: '干燥', en: 'Dry' },
  dischargeSticky: { zh: '粘稠', en: 'Sticky' },
  dischargeCreamy: { zh: '乳白', en: 'Creamy' },
  dischargeEggWhite: { zh: '蛋清样', en: 'Egg white' },
  context: { zh: '生活记录', en: 'Context' },
  sleepHours: { zh: '睡眠(小时)', en: 'Sleep (hours)' },
  nightWakings: { zh: '夜醒次数', en: 'Night wakings' },
  caffeine: { zh: '咖啡因', en: 'Caffeine' },
  stress: { zh: '压力', en: 'Stress' },
  stressLow: { zh: '低', en: 'Low' },
  stressMedium: { zh: '中', en: 'Medium' },
  stressHigh: { zh: '高', en: 'High' },
  exercise: { zh: '运动', en: 'Exercise' },
  nursingSessions: { zh: '哺乳次数', en: 'Nursing sessions' },
  save: { zh: '保存', en: 'Save' },
  saved: { zh: '已保存', en: 'Saved' },

  // Symptoms
  symptomHeadDistension: { zh: '头胀', en: 'Head distension' },
  symptomHeadache: { zh: '头痛', en: 'Headache' },
  symptomFacialHeat: { zh: '面部发热', en: 'Facial heat' },
  symptomDizziness: { zh: '头晕', en: 'Dizziness' },
  symptomTinnitus: { zh: '耳鸣', en: 'Tinnitus' },
  symptomDryEyes: { zh: '眼干', en: 'Dry eyes' },
  symptomBreastTenderness: { zh: '乳房胀痛', en: 'Breast tenderness' },
  symptomLowBackAche: { zh: '腰酸', en: 'Low back ache' },
  symptomColdExtremities: { zh: '手脚冰凉', en: 'Cold hands/feet' },
  symptomAbdominalPain: { zh: '单侧下腹痛', en: 'One-sided lower abdominal pain' },
  symptomBloating: { zh: '腹胀', en: 'Bloating' },
  symptomAppetiteShift: { zh: '食欲变化', en: 'Appetite shift' },
  symptomLooseStool: { zh: '大便偏软', en: 'Loose stool' },
  symptomConstipation: { zh: '便秘', en: 'Constipation' },

  // Moods
  moodIrritability: { zh: '烦躁', en: 'Irritability' },
  moodLow: { zh: '低落', en: 'Low mood' },
  moodAnxiety: { zh: '焦虑', en: 'Anxiety' },
  moodFlatness: { zh: '平淡', en: 'Flatness' },
  moodTearfulness: { zh: '易哭', en: 'Tearfulness' },
  moodLibidoHigh: { zh: '性欲增加', en: 'Libido increase' },
  moodLibidoLow: { zh: '性欲减退', en: 'Libido decrease' },
  moodCalm: { zh: '平静', en: 'Calm' },
  moodHappy: { zh: '开心', en: 'Happy' },
  moodEnergetic: { zh: '精力充沛', en: 'Energetic' },

  // Onboarding
  onboardingWelcome: { zh: '欢迎', en: 'Welcome' },
  onboardingIntro: { zh: '让我们了解你的周期。你能回忆起最近几次月经的开始日期吗？', en: "Let's learn about your cycle. Can you recall the start dates of your recent periods?" },
  onboardingMostRecent: { zh: '最近一次月经开始日期', en: 'Most recent period start date' },
  onboardingAddEarlier: { zh: '添加更早的日期', en: 'Add an earlier date' },
  onboardingApproximate: { zh: '日期不确定', en: 'Date approximate' },
  onboardingBreastfeeding: { zh: '是否在哺乳？', en: 'Currently breastfeeding?' },
  onboardingConstitution: { zh: '体质', en: 'Constitution' },
  onboardingThermal: { zh: '寒热', en: 'Thermal tendency' },
  thermalWarm: { zh: '偏热', en: 'Warm' },
  thermalCool: { zh: '偏寒', en: 'Cool' },
  thermalNeutral: { zh: '平和', en: 'Neutral' },
  onboardingResult: { zh: '根据你的数据', en: 'Based on your data' },
  avgLength: { zh: '平均周期长度', en: 'Average cycle length' },
  rangeLabel: { zh: '观察范围', en: 'Observed range' },
  nextPrediction: { zh: '预计下次月经', en: 'Next period prediction' },
  days: { zh: '天', en: 'days' },
  finish: { zh: '完成', en: 'Finish' },
  next: { zh: '下一步', en: 'Next' },
  back: { zh: '返回', en: 'Back' },
  skip: { zh: '跳过', en: 'Skip' },
  remove: { zh: '删除', en: 'Remove' },
  yes: { zh: '是', en: 'Yes' },
  no: { zh: '否', en: 'No' },

  // Interval validation
  intervalWarning: { zh: '从{from}到{to}间隔{n}天。中间是否有遗漏的月经？', en: "That's a {n}-day gap between {from} and {to}. Was there a period in between, or was the cycle genuinely that long?" },
  genuineLong: { zh: '确实那么长', en: 'Genuinely that long' },
  missedPeriod: { zh: '中间有遗漏', en: 'Missed one in between' },

  // History
  historyTitle: { zh: '周期历史', en: 'Cycle History' },
  backfilled: { zh: '回忆补录', en: 'Backfilled' },
  anovulatory: { zh: '疑似无排卵', en: 'Possibly anovulatory' },

  // Journal
  journalTitle: { zh: '日记', en: 'Journal' },
  journalPromptMenstrual: { zh: '有什么准备好放下的吗？', en: "What's ready to be let go of?" },
  journalPromptFollicular: { zh: '什么真正让你恢复精力？', en: 'What actually restores you?' },
  journalPromptOvulatory: { zh: '有什么正在转变的吗？', en: "What's turning over?" },
  journalPromptLuteal: { zh: '有什么还没有说出口的？', en: "What hasn't been said?" },

  // Explore
  exploreTitle: { zh: '探索', en: 'Explore' },
  selectVariables: { zh: '选择两个变量查看对比', en: 'Select two variables to compare' },
  insufficientData: { zh: '至少需要3个周期的数据', en: 'Need at least 3 cycles of data' },

  // Learn
  learnTitle: { zh: '了解', en: 'Learn' },

  // Settings
  settingsTitle: { zh: '设置', en: 'Settings' },
  language: { zh: '语言', en: 'Language' },
  breastfeedingLabel: { zh: '哺乳中', en: 'Breastfeeding' },
  constitution: { zh: '体质设置', en: 'Constitution' },
  exportData: { zh: '导出数据', en: 'Export Data' },
  exportJSON: { zh: '导出 JSON', en: 'Export JSON' },
  exportMD: { zh: '导出 Markdown', en: 'Export Markdown' },
  importData: { zh: '导入数据', en: 'Import Data' },
  backupReminder: { zh: '请定期备份你的数据。本应用数据仅存储在本设备上。', en: 'Please back up your data regularly. All data is stored only on this device.' },
  logPeriodStart: { zh: '记录月经开始', en: 'Log period start' },
  logPeriodEnd: { zh: '记录月经结束', en: 'Log period end' },

  // Period logging
  periodStarted: { zh: '月经开始了？', en: 'Period started?' },
  periodStartConfirm: { zh: '将今天标记为新周期的开始', en: 'Mark today as the start of a new cycle' },
  periodEnded: { zh: '月经结束了？', en: 'Period ended?' },
  confirm: { zh: '确认', en: 'Confirm' },
  cancel: { zh: '取消', en: 'Cancel' },

  // Confidence
  confidenceLow: { zh: '低置信度', en: 'Low confidence' },
  confidenceMedium: { zh: '中置信度', en: 'Medium confidence' },
  confidenceHigh: { zh: '高置信度', en: 'High confidence' },

  // Backup
  backupTitle: { zh: '备份提醒', en: 'Backup Reminder' },
  backupMessage: { zh: '已经一个月没有备份了。建议导出数据以防丢失。', en: "It's been a month since your last backup. Consider exporting your data." },
  backupDismiss: { zh: '稍后提醒', en: 'Remind me later' },
  backupNow: { zh: '现在备份', en: 'Back up now' },
};

export function setLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
}

export function getLanguage() {
  return currentLang;
}

export function t(key, vars) {
  const entry = strings[key];
  if (!entry) return key;
  let s = entry[currentLang] || entry.en || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, v);
    }
  }
  return s;
}

export function bilingualPhase(phase) {
  const names = {
    menstrual:  { zh: '行经期', en: 'Menstrual' },
    follicular: { zh: '经后期', en: 'Post-menstrual' },
    ovulatory:  { zh: '经间期', en: 'Ovulatory' },
    luteal:     { zh: '经前期', en: 'Pre-menstrual' }
  };
  const n = names[phase] || names.follicular;
  return `${n.zh} · ${n.en}`;
}
