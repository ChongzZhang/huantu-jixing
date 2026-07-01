/* 宦途疾行 · 人生卷轴（结局评语） */
const LifeScroll = (() => {
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildEnding(d) {
    const name = d.name || '沈砚青';
    const safety = Math.round(d.safety ?? 0);
    const integrity = Math.round(d.integrity ?? 0);
    const age = d.age ?? 24;
    const rankName = d.ranks?.benguan?.name || '白身';
    const rankIdx = d.ranks?.benguan?.index ?? 0;
    const sanjie = d.ranks?.sanjie?.name || '未授';
    const reason = d.reason || '';

    if (d.type === 'emperor') {
      return {
        title: '登基称帝',
        epilogue: [
          `${name}历四途顶格，黄袍加身，年齿${age}岁。`,
          '三波敌兵尽破，同僚拱卫，殿陛山呼，万民景从。',
          '庙号谥典，千秋万代。'
        ],
        seal: '天子御极 · 万国来朝'
      };
    }

    if (d.type === 'traitor') {
      return {
        title: '乱臣贼子',
        epilogue: [
          `${name}妄承黄袍，逼宫之战中弹尽粮绝。`,
          '谪令诏狱齐至，安危气节俱尽，身名俱裂。',
          '青史一笔，定为乱臣。'
        ],
        seal: '诏狱系枷 · 史笔如铁'
      };
    }

    if (d.type === 'minister' || (d.grandWin && !d.coronationPicked)) {
      return {
        title: '位极人臣',
        epilogue: [
          `${name}历四途并进，终官${rankName}，年齿${age}岁。`,
          `安危${safety}、气节${integrity}，朝野称为一时之选。`,
          '黄袍当前而不取，守分而退，人称位极人臣。'
        ],
        seal: '紫宸赐券 · 青史留名'
      };
    }

    if (d.grandWin) {
      return {
        title: '位极人臣',
        epilogue: [
          `${name}历四途并进，终官${rankName}，年齿${age}岁。`,
          `安危${safety}、气节${integrity}，朝野称为一时之选。`,
          '紫宸赐券，青史留名。'
        ],
        seal: '紫宸赐券 · 青史留名'
      };
    }

    if (d.type === 'fail') {
      if (reason.includes('卒') || reason.includes('病逝') || reason.includes('急症') || reason.includes('心力')) {
        return {
          title: '寿尽任所',
          epilogue: [
            `${name}官至${rankName}，年齿${age}岁。`,
            `因${reason}，宦途戛然而止。`,
            '家属扶柩南归，同僚叹息。'
          ],
          seal: '吏部备案 · 寿终正寝'
        };
      }
      if (reason.includes('气节')) {
        return {
          title: '声名尽毁',
          epilogue: [
            `${name}本官止于${rankName}，气节归零。`,
            '士林哗然，同僚避之唯恐不及。',
            '史册所载，不过一声叹息。'
          ],
          seal: '吏部备案 · 气节尽毁'
        };
      }
      if (reason.includes('安危')) {
        return {
          title: '尸骨枕籍',
          epilogue: [
            `${name}官至${rankName}，安危尽失。`,
            '病榻缠绵，卒于任所。',
            '家属扶柩南归，僚属唏嘘。'
          ],
          seal: '吏部备案 · 客死任所'
        };
      }
      if (reason.includes('贬尽') || reason.includes('仕途')) {
        return {
          title: '贬谪余生',
          epilogue: [
            `${name}本官贬尽，止于${rankName}。`,
            `余${safety}安危、${integrity}气节，再难翻身。`,
            '江湖夜雨，十年一梦。'
          ],
          seal: '吏部备案 · 仕途已绝'
        };
      }
      if (ExitReasons.isNeutralExit(reason)) {
        const displayReason = ExitReasons.fitReason(reason, age);
        const extra = ExitReasons.epilogueLines(displayReason, age);
        return {
          title: displayReason,
          displayReason,
          epilogue: [
            `${name}官至${rankName}，年齿${age}岁。`,
            `因诏狱牵连，后${displayReason}。`,
            ...extra
          ],
          seal: age > 49 ? '吏部备案 · 离任归逸' : '吏部备案 · 仕途中断'
        };
      }
      if (reason.includes('诏狱') || reason.includes('伏诛') || reason.includes('系于')) {
        const displayReason = ExitReasons.fitReason(reason, age);
        const extra = ExitReasons.epilogueLines(displayReason, age);
        return {
          title: displayReason,
          displayReason,
          epilogue: [
            `${name}官至${rankName}，年齿${age}岁。`,
            `因诏狱牵连，后${displayReason}。`,
            ...extra
          ],
          seal: age > 49 ? '吏部备案 · 离任归逸' : '吏部备案 · 仕途中断'
        };
      }
      return {
        title: '仕途断绝',
        displayReason: reason,
        epilogue: [
          `${name}本官${rankName}，年齿${age}岁，因${reason}。`,
          '重来一局，或可另辟宦途。'
        ],
        seal: '吏部备案 · 仕途已绝'
      };
    }

    const high = rankIdx >= 12;
    const mid = rankIdx >= 6;
    const safeHigh = safety >= 65;
    const safeLow = safety < 35;
    const intHigh = integrity >= 70;
    const intLow = integrity < 35;

    if (high && intHigh && safeHigh) {
      return {
        title: '青史留芳',
        epilogue: [
          `${name}年齿${age}岁，终官${rankName}，散阶${sanjie}。`,
          `安危${safety}、气节${integrity}，官声清越。`,
          '任满归朝，士林传为美谈。'
        ],
        seal: '任期届满 · 载誉而归'
      };
    }
    if (high && intLow) {
      return {
        title: '位高毁誉',
        epilogue: [
          `${name}官至${rankName}，然气节仅余${integrity}。`,
          '清议汹汹，同僚多有微词。',
          '位尊而名不立，亦足戒来者。'
        ],
        seal: '任期届满 · 毁誉参半'
      };
    }
    if (!mid && intHigh) {
      return {
        title: '守道之士',
        epilogue: [
          `${name}止于${rankName}，官阶不高。`,
          `气节${integrity}，安危${safety}，清名远播。`,
          '虽未大用，然士林敬重。'
        ],
        seal: '任期届满 · 以名节传'
      };
    }
    if (age >= 48 && safeLow && intHigh) {
      return {
        title: '病躯归里',
        epilogue: [
          `${name}终官${rankName}，安危仅${safety}。`,
          `气节${integrity}尚在，扶病辞官。`,
          '乡里迎候，告老还乡。'
        ],
        seal: '任期届满 · 病退归休'
      };
    }
    if (safeHigh && intLow) {
      return {
        title: '贪逸失节',
        epilogue: [
          `${name}官至${rankName}，安危${safety}。`,
          `气节${integrity}，贪安忘义。`,
          '台谏有所指，然事已不可追。'
        ],
        seal: '任期届满 · 名节有亏'
      };
    }
    if (mid && safeHigh && intHigh) {
      return {
        title: '循吏之誉',
        epilogue: [
          `${name}年齿${age}岁，终官${rankName}。`,
          `安危${safety}、气节${integrity}，政声平稳。`,
          '吏部考绩上等，可冀再擢。'
        ],
        seal: '任期届满 · 循吏录名'
      };
    }
    if (!mid && safeLow) {
      return {
        title: '蹉跎半生',
        epilogue: [
          `${name}止于${rankName}，年齿${age}岁。`,
          `安危${safety}、气节${integrity}，宦途坎坷。`,
          '回首庆历，恍如一梦。'
        ],
        seal: '任期届满 · 平淡收场'
      };
    }

    return {
      title: '任期届满',
      epilogue: [
        `${name}宦途六载，年齿${age}岁，终官${rankName}。`,
        `散阶${sanjie}，安危${safety}、气节${integrity}。`,
        '卷轴既成，前尘付与后人评说。'
      ],
      seal: '任期届满 · 收卷归档'
    };
  }

  function renderSheet(data) {
    const d = data;
    const ending = buildEnding(d);

    return `
      <section class="sgt-sheet sgt-ending-only">
        <p class="scroll-headline">庆历 · ${esc(d.name || '')} · 人生卷轴</p>
        <h2 class="sgt-cover-head">${esc(ending.title)}</h2>
        <div class="scroll-ranks scroll-ranks-compact">
          <div class="scroll-rank-row"><span>本官</span><strong>${esc(d.ranks?.benguan?.name || '白身')}</strong></div>
          <div class="scroll-rank-row"><span>散阶</span><strong>${esc(d.ranks?.sanjie?.name || '未授')}</strong></div>
          <div class="scroll-rank-row"><span>勋</span><strong>${esc(d.ranks?.xun?.name || '未授')}</strong></div>
          <div class="scroll-rank-row"><span>爵</span><strong>${esc(d.ranks?.jue?.name || '未授')}</strong></div>
        </div>
        <p class="sgt-cover-meta">${esc(d.meta)}</p>
        ${d.npcKnockouts != null && d.npcKnockouts > 0 ? `<p class="sgt-achievement">本轮淘汰同僚 <strong>${d.npcKnockouts}</strong> 人${d.totalNpcKnockouts != null ? ` · 累计 ${d.totalNpcKnockouts} 人` : ''}</p>` : ''}
        ${d.type === 'fail' && ending.displayReason ? `<p class="sgt-cover-reason">因：${esc(ending.displayReason)}</p>` : (d.type === 'fail' && d.reason ? `<p class="sgt-cover-reason">因：${esc(ExitReasons.fitReason(d.reason, d.age ?? 24))}</p>` : '')}
        <div class="scroll-body scroll-epilogue">
          ${ending.epilogue.map((line) => `<p>${esc(line)}</p>`).join('')}
        </div>
        <p class="scroll-seal">${esc(ending.seal)}</p>
      </section>`;
  }

  function render(data) {
    const viewport = document.getElementById('scroll-viewport');
    const track = document.getElementById('scroll-track');
    if (!viewport || !track) return;

    const ending = buildEnding(data);
    data.title = ending.title;
    data.lines = ending.epilogue;
    data.seal = ending.seal;

    track.innerHTML = renderSheet(data);
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;

    const hint = document.getElementById('scroll-hint');
    if (hint) hint.classList.add('hidden');
  }

  return { render, buildEnding };
})();
