/* 宦途疾行 · 离任事由（按年齿分池） */
const ExitReasons = (() => {
  const YOUNG_MAX = 31;
  const MID_MAX = 49;

  const YOUNG = [
    '贬谪远郡', '流放岭南', '永不录用', '织席贩履', '挂冠而去',
    '客居塞外', '侨寓他乡', '泛舟江湖', '货殖经商', '渔樵度日'
  ];
  const MID = [
    '辞官乡里', '归家务农', '闭户著书', '授徒课蒙', '筑庐讲学',
    '坐馆西席', '誊书绘扇', '行医济世', '卖浆浇花', '煮酒种梅'
  ];
  const OLD = [
    '颐养天年', '归隐田园', '守墓庐墓', '醉卧林泉', '采药名山'
  ];

  const PRISON_EXITS = [...YOUNG, ...MID, ...OLD];

  const EPILOGUE = {
    '颐养天年': ['诏狱风波后恩准致仕，归里颐养。', '门生故吏时来问安，不失晚节。'],
    '贬谪远郡': ['系狱勘问之后贬远方。', '吏牒既除，另起炉灶亦未可知。'],
    '归隐田园': ['脱身囹圄，携家归园。', '春耕秋敛，稻香满径。'],
    '归家务农': ['罢官回籍，荷锄戴笠。', '乡里称之前任官员，今作田翁。'],
    '流放岭南': ['远戍瘴乡，蛮烟毒雾。', '岭南花木亦奇，或可著一书。'],
    '永不录用': ['名册除名，不得再赴选。', '江湖广阔，何必系于朝堂。'],
    '织席贩履': ['落魄市井，织席贩履自给。', '昔日袍笏，换作竹笠草鞋。'],
    '挂冠而去': ['大狱既脱，遂挂冠南行。', '江湖夜雨，十年一梦。'],
    '辞官乡里': ['上表辞官，获准归里。', '桑麻阡陌，胜似公门。'],
    '客居塞外': ['远走边塞，牧马射猎。', '胡天月色，另是一番人生。'],
    '泛舟江湖': ['解缆江湖，扁舟一叶。', '往来吴越，诗酒为伴。'],
    '闭户著书': ['闭门谢客，整理生平奏牍。', '或成一家之言，传诸后世。'],
    '授徒课蒙': ['设帐乡塾，课童子识字。', '桃李虽不多，亦足自慰。'],
    '渔樵度日': ['与渔父樵翁为伍，朝出暮归。', '水云深处，心自安然。'],
    '货殖经商': ['弃儒就贾，货殖于市。', '算盘声里，亦是一种活法。'],
    '醉卧林泉': ['携酒入山，醉卧松风。', '世人知与不知，皆付一笑。'],
    '侨寓他乡': ['扶家远徙，侨寓异乡。', '新雨旧愁，渐渐相忘。'],
    '守墓庐墓': ['庐墓守丧，三年不仕。', '孝声既著，亦算善终。'],
    '煮酒种梅': ['城隅筑室，煮酒种梅。', '春来香雪，自得其乐。'],
    '誊书绘扇': ['鬻字誊书，绘扇为生。', '笔墨虽贱，不失文人骨。'],
    '卖浆浇花': ['市肆卖浆，篱边浇花。', '清贫自足，别是一般滋味。'],
    '行医济世': ['弃官行医，济世活人。', '药香满巷，人称沈先生。'],
    '筑庐讲学': ['山中筑庐，讲学授徒。', '斯文一脉，赖此延续。'],
    '采药名山': ['入山采药，长伴云霞。', '年齿既高，反得自在。'],
    '坐馆西席': ['为人西席，幕中筹策。', '虽非庙堂，亦养一家。']
  };

  function poolForAge(age) {
    const a = age ?? 24;
    if (a > MID_MAX) return OLD.concat(MID.slice(0, 4));
    if (a > YOUNG_MAX) return MID.concat(YOUNG.slice(0, 3));
    return YOUNG.slice();
  }

  function pickPrisonExit(age) {
    const pool = poolForAge(age);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function isNeutralExit(reason) {
    return PRISON_EXITS.includes(reason);
  }

  function fitsAge(reason, age) {
    const a = age ?? 24;
    if (OLD.includes(reason)) return a > MID_MAX;
    if (MID.includes(reason)) return a > YOUNG_MAX && a <= MID_MAX + 8;
    if (YOUNG.includes(reason)) return a <= YOUNG_MAX + 6;
    return true;
  }

  function fitReason(reason, age) {
    if (!reason) return pickPrisonExit(age);
    if (!isNeutralExit(reason)) return reason;
    if (fitsAge(reason, age)) return reason;
    return pickPrisonExit(age);
  }

  function epilogueLines(reason, age) {
    const r = fitReason(reason, age);
    const base = EPILOGUE[r] || [
      '勘问之后离任，仕途暂告段落。',
      '前尘既了，后事且付春风。'
    ];
    if (r === '颐养天年' && (age ?? 0) <= MID_MAX) {
      return ['勘问之后罢官，未可言老。', '另谋生计，前路尚长。'];
    }
    return base;
  }

  return {
    pickPrisonExit, fitReason, isNeutralExit, epilogueLines, poolForAge, PRISON_EXITS
  };
})();
