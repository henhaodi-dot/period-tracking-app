import { t, getLanguage } from '../i18n.js';
import { remedies } from '../tcm.js';

let selectedId = null;

const articles = [
  {
    id: 'hormones',
    title: { zh: '激素与周期', en: 'Hormones & Your Cycle' },
    summary: { zh: '了解雌激素、孕激素、LH、FSH 如何协调你的周期', en: 'How estrogen, progesterone, LH, and FSH coordinate your cycle' },
    content: {
      zh: `<h3>雌激素 (Estrogen)</h3><p>主要由卵巢的卵泡产生。在卵泡期逐渐升高，排卵前达到峰值，促使LH激增引发排卵。黄体期有第二个较小的高峰。</p><p>雌激素上升时，你可能感到精力充沛、情绪稳定、皮肤状态好。</p><h3>孕激素 (Progesterone)</h3><p>排卵后由黄体分泌。在黄体期中期达到峰值，维持子宫内膜。如果没有怀孕，孕激素下降引发月经。</p><p>孕激素升高时，体温微升，可能感到困倦、情绪波动。</p><h3>黄体生成素 (LH)</h3><p>由脑垂体分泌。排卵前约36小时出现急剧上升（LH峰值），这是排卵最可靠的信号。</p><h3>卵泡刺激素 (FSH)</h3><p>在月经初期开始上升，刺激卵泡发育。随着优势卵泡产生雌激素，FSH通过负反馈降低。</p>`,
      en: `<h3>Estrogen</h3><p>Produced mainly by ovarian follicles. Rises through the follicular phase, peaks just before ovulation to trigger the LH surge, dips, then has a secondary rise in the luteal phase.</p><p>When estrogen is high, you may feel energized, mood-stable, and notice clearer skin.</p><h3>Progesterone</h3><p>Secreted by the corpus luteum after ovulation. Peaks mid-luteal phase, maintaining the uterine lining. If pregnancy doesn't occur, its drop triggers menstruation.</p><p>Rising progesterone can bring mild fatigue, mood shifts, and a slight temperature increase.</p><h3>LH (Luteinizing Hormone)</h3><p>A sharp surge about 36 hours before ovulation is the most reliable ovulation signal available without lab work.</p><h3>FSH (Follicle-Stimulating Hormone)</h3><p>Rises early in the cycle to recruit follicles. As the dominant follicle produces estrogen, FSH falls via negative feedback.</p>`
    }
  },
  {
    id: 'phases',
    title: { zh: '四期与中医', en: 'Four Phases & TCM' },
    summary: { zh: '西医生理与中医病机的四期对照', en: 'Western physiology alongside TCM pathology for each phase' },
    content: {
      zh: `<h3>行经期 · 冬</h3><p>子宫内膜脱落，血海泄溢。中医认为此时血室正开，宜温经活血，忌生冷。类似自然界的冬天——向内收藏，休息。</p><h3>经后期 · 春</h3><p>血海空虚，阴血渐复。卵泡发育，雌激素缓慢上升。中医强调滋阴养血，不宜过度行气。如春天万物复苏，身体在重建。</p><h3>经间期 · 夏</h3><p>重阴转阳，排卵发生。雌激素达峰，LH激增。中医称此为氤氲之时，阴阳转化的关键节点。精力达到高峰。</p><h3>经前期 · 秋</h3><p>阳气渐长但肝气易郁。孕激素升高，情绪可能波动。中医主张疏肝理气。如秋天开始收敛，身体准备进入下一个周期。</p>`,
      en: `<h3>Menstrual · Winter</h3><p>The uterine lining sheds. In TCM, the blood chamber is open — warm the channels, avoid cold food. Like winter: turn inward, rest.</p><h3>Post-menstrual · Spring</h3><p>The blood sea is empty, yin rebuilds. Follicles develop, estrogen slowly rises. TCM emphasizes nourishing yin and blood. Like spring — the body is rebuilding.</p><h3>Ovulatory · Summer</h3><p>Deep yin transforms to yang. Estrogen peaks, LH surges. Energy is at its highest. A pivotal yin-yang transition point.</p><h3>Pre-menstrual · Autumn</h3><p>Yang qi rises but liver qi easily stagnates. Progesterone is high, mood may shift. TCM focuses on soothing liver qi. The body prepares for the next cycle.</p>`
    }
  },
  {
    id: 'prolactin',
    title: { zh: '泌乳素与产后周期', en: 'Prolactin & Postpartum Cycles' },
    summary: { zh: '哺乳如何影响周期恢复和激素水平', en: 'How breastfeeding affects cycle return and hormones' },
    content: {
      zh: `<h3>泌乳素的作用</h3><p>泌乳素由脑垂体分泌，每次哺乳时升高。它抑制促性腺激素释放激素(GnRH)，从而减少FSH和LH的分泌，延长卵泡期甚至抑制排卵。</p><h3>周期恢复的过程</h3><p>随着哺乳频率降低，泌乳素水平逐渐下降。你可能会注意到：</p><p>最初几个周期可能较长且不规律。这是正常的——卵泡期在延长，因为泌乳素仍在部分抑制卵泡发育。</p><p>随着喂奶次数减少，周期会逐渐缩短和规律化。这个过程可能需要数月。</p><h3>这个应用如何帮助你</h3><p>通过记录每天的哺乳次数，应用可以追踪泌乳素的大致趋势，并将周期长度变化与哺乳频率关联起来。当你看到两条线一起移动时，不规律就从"问题"变成了可以理解的过程。</p>`,
      en: `<h3>What Prolactin Does</h3><p>Prolactin rises with each nursing session. It suppresses GnRH, which in turn reduces FSH and LH secretion — lengthening the follicular phase and sometimes preventing ovulation entirely.</p><h3>How Cycles Come Back</h3><p>As nursing frequency drops, prolactin gradually falls. Your first cycles back may be longer and irregular. This is normal — the follicular phase is extended because prolactin is still partially suppressing follicle development.</p><p>As feeds decrease, cycles tend to shorten and regularize. This process can take months.</p><h3>How This App Helps</h3><p>By logging daily nursing sessions, the app tracks prolactin trends and maps cycle length changes against nursing frequency. When you see the two lines moving together, irregularity shifts from "problem" to an understandable process.</p>`
    }
  },
  {
    id: 'tcm-concepts',
    title: { zh: '中医基础概念', en: 'TCM Foundational Concepts' },
    summary: { zh: '血海、冲任、气血、肝气郁结', en: 'Blood sea, Chong-Ren vessels, qi-blood, liver qi stagnation' },
    content: {
      zh: `<h3>血海</h3><p>冲脉被称为"血海"，是气血汇聚之处。月经的来潮和止息与血海的盈亏直接相关。经后血海空虚，经前血海充盈。</p><h3>冲任二脉</h3><p>冲脉主血海，任脉主胞宫。两者协调，共同调节月经和生殖功能。冲任失调是月经不调的核心病机。</p><h3>气血</h3><p>气为血之帅，血为气之母。气推动血的运行，血滋养气的生成。月经是气血协调运动的外在表现。气虚则血行无力，气滞则血行不畅。</p><h3>肝气郁结</h3><p>肝主疏泄，调畅气机。情绪压力、生活不规律容易导致肝气郁结，表现为经前乳胀、烦躁、叹气等。疏肝理气是经前期的重要调养方向。</p><h3>阴阳转化</h3><p>排卵期是月经周期中阴阳转化的关键节点——重阴转阳。此时阴精充足，阳气始动，卵子排出。理解这个转化有助于把握周期的节奏。</p>`,
      en: `<h3>Blood Sea (血海)</h3><p>The Chong vessel is called the "sea of blood" — where qi and blood converge. Menstruation directly reflects the filling and emptying of this reservoir.</p><h3>Chong & Ren Vessels (冲任二脉)</h3><p>The Chong governs the blood sea; the Ren governs the uterus. Together they regulate menstruation and reproduction. Their disharmony is the core mechanism of menstrual irregularity.</p><h3>Qi & Blood (气血)</h3><p>Qi moves blood; blood nourishes qi. Menstruation is the outward expression of their coordinated movement. Qi deficiency means weak blood flow; qi stagnation means impeded flow.</p><h3>Liver Qi Stagnation (肝气郁结)</h3><p>The liver ensures smooth qi flow. Emotional stress easily causes stagnation — premenstrual breast distension, irritability, sighing. Soothing liver qi is key in the luteal phase.</p><h3>Yin-Yang Transformation (阴阳转化)</h3><p>Ovulation is the cycle's pivotal yin-to-yang shift. Yin essence is full, yang qi begins to stir, and the egg is released. Understanding this rhythm helps you follow the cycle's natural arc.</p>`
    }
  }
];

export async function render(container) {
  const lang = getLanguage();

  if (selectedId) {
    const article = articles.find(a => a.id === selectedId) || findRemedyArticle(selectedId);
    if (article) {
      renderArticle(container, article, lang);
      return;
    }
    selectedId = null;
  }

  container.innerHTML = `
    <div class="screen">
      <div class="card-header">
        <span class="card-title">${t('learnTitle')}</span>
      </div>
      <div class="learn-list">
        ${articles.map(a => `
          <div class="learn-item" data-id="${a.id}">
            <h3>${a.title[lang] || a.title.en}</h3>
            <p>${a.summary[lang] || a.summary.en}</p>
          </div>
        `).join('')}
        <div class="log-section-title mt-md">${lang === 'zh' ? '食材与草药' : 'Foods & Herbs'}</div>
        ${remedies.map(r => `
          <div class="learn-item" data-id="remedy-${r.id}">
            <h3>${r.name[lang] || r.name.en}</h3>
            <p>${r.description[lang] || r.description.en}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.learn-item').forEach(el => {
    el.addEventListener('click', () => {
      selectedId = el.dataset.id;
      render(container);
    });
  });
}

function findRemedyArticle(id) {
  if (!id.startsWith('remedy-')) return null;
  const rid = id.slice(7);
  const r = remedies.find(rm => rm.id === rid);
  if (!r) return null;
  const lang = getLanguage();
  return {
    id,
    title: r.name,
    content: {
      zh: buildRemedyContent(r, 'zh'),
      en: buildRemedyContent(r, 'en')
    }
  };
}

function buildRemedyContent(r, lang) {
  const thermalLabels = { warming: { zh: '温性', en: 'Warming' }, cooling: { zh: '凉性', en: 'Cooling' }, neutral: { zh: '平性', en: 'Neutral' } };
  const lactLabels = { increases: { zh: '有助泌乳', en: 'May increase milk supply' }, reduces: { zh: '可能减少泌乳', en: 'May reduce milk supply' }, neutral: { zh: '对泌乳无明显影响', en: 'No significant effect on lactation' }, 'dose-dependent': { zh: '剂量相关', en: 'Dose-dependent effect on lactation' } };
  const typeLabels = { food: { zh: '食材', en: 'Food' }, herb: { zh: '草药', en: 'Herb' } };

  let html = `<p>${r.description[lang] || r.description.en}</p>`;
  html += `<p><strong>${lang === 'zh' ? '类型' : 'Type'}:</strong> ${typeLabels[r.type][lang]}</p>`;
  html += `<p><strong>${lang === 'zh' ? '性味' : 'Thermal nature'}:</strong> ${thermalLabels[r.thermal][lang]}</p>`;
  html += `<p><strong>${lang === 'zh' ? '功效' : 'Actions'}:</strong> ${r.actions.join('、')}</p>`;
  html += `<p><strong>${lang === 'zh' ? '哺乳影响' : 'Lactation'}:</strong> ${lactLabels[r.lactationEffect][lang]}</p>`;
  if (r.cautions.length) {
    html += `<p><strong>${lang === 'zh' ? '注意' : 'Cautions'}:</strong> ${r.cautions.map(c => c[lang] || c.en).join('; ')}</p>`;
  }
  return html;
}

function renderArticle(container, article, lang) {
  container.innerHTML = `
    <div class="screen">
      <button class="btn btn-ghost mb-md" id="back-learn">${t('back')}</button>
      <h2 style="font-family:var(--font-display);margin-bottom:16px">${article.title[lang] || article.title.en}</h2>
      <div class="learn-detail">${article.content[lang] || article.content.en}</div>
    </div>
  `;
  container.querySelector('#back-learn').addEventListener('click', () => {
    selectedId = null;
    render(container);
  });
}
