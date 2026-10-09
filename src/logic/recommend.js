import { motherboardCaseFit } from './analysis.js';

const keys = {
  CPU: 'cpu',
  Motherboard: 'motherboard',
  RAM: 'ram',
  GPU: 'gpu',
  Storage: 'storage',
  PSU: 'psu',
  Case: 'case'
};

const numeric = value => {
  const match = String(value ?? '').match(/[0-9]+(?:\.[0-9]+)?/);
  return match ? Number(match[0]) : 0;
};

const capacityGB = value => {
  const text = String(value ?? '');
  const match = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|MB)\b/i);
  if (!match) return numeric(value);
  const amount = Number(match[1]);
  return match[2].toUpperCase() === 'TB' ? amount * 1000 : match[2].toUpperCase() === 'MB' ? amount / 1000 : amount;
};

export function recommend(build = {}, work = [], qfd, analysis, all = []) {
  const activeWorkloads = Array.isArray(work) ? work : [];
  const selectedCount = Object.values(keys).filter(key => Boolean(build[key])).length;
  if (!selectedCount && !activeWorkloads.length) return [];

  const getCurrent = category => all.find(item => String(item.id) === String(build[keys[category]]));
  const selected = Object.fromEntries(Object.keys(keys).map(category => [category, getCurrent(category)]));
  const priority = name => qfd?.priorities?.find(item => item.name === name)?.normalized || 0;
  const output = [];
  const emitted = new Set();
  const push = item => {
    if (!item || emitted.has(item.title)) return;
    emitted.add(item.title);
    output.push(item);
  };

  const totalAfterReplacement = (category, candidate) =>
    (analysis?.total || 0) - (selected[category]?.price || 0) + (candidate?.price || 0);
  const withinBudget = (category, candidate) => {
    const total = totalAfterReplacement(category, candidate);
    if (total <= (analysis?.budget ?? 80000)) return true;
    return Boolean(analysis && !analysis.budgetOk && total < analysis.total);
  };

  const fitsSelectedBuild = (category, candidate) => {
    const cpu = category === 'CPU' ? candidate : selected.CPU;
    const motherboard = category === 'Motherboard' ? candidate : selected.Motherboard;
    const ram = category === 'RAM' ? candidate : selected.RAM;
    const gpu = category === 'GPU' ? candidate : selected.GPU;
    const caseItem = category === 'Case' ? candidate : selected.Case;

    // Check only constraints affected by the candidate. An unrelated existing
    // mismatch should not prevent useful recommendations for another category.
    if ((category === 'CPU' || category === 'Motherboard') && cpu && motherboard && cpu.specs?.socket && motherboard.specs?.socket && cpu.specs.socket !== motherboard.specs.socket) return false;
    if ((category === 'RAM' || category === 'Motherboard') && ram && motherboard && ram.specs?.type && motherboard.specs?.ramType && ram.specs.type !== motherboard.specs.ramType) return false;
    if ((category === 'Motherboard' || category === 'Case') && motherboard && caseItem) {
      if (motherboardCaseFit(motherboard.specs?.formFactor, caseItem.specs?.formFactor) === false) return false;
    }
    if (category === 'PSU' && (analysis?.requiredPsu || 0) > numeric(candidate.specs.wattage)) return false;
    return true;
  };

  const options = (category, { budget = true, compatibility = true, different = false } = {}) => all
    .filter(item => item.category === category)
    .filter(item => !different || String(item.id) !== String(build[keys[category]]))
    .filter(item => !compatibility || fitsSelectedBuild(category, item))
    .filter(item => !budget || withinBudget(category, item));

  // Resolve compatibility problems first, using the current selected components.
  const cpuCheck = analysis?.checks?.find(item => item.name === 'CPU ↔ Motherboard');
  if (cpuCheck?.status === 'bad' && selected.CPU) {
    const candidate = options('Motherboard', { budget: false })
      .filter(item => item.specs.socket === selected.CPU.specs.socket)
      .sort((a, b) => a.price - b.price)[0];
    if (candidate) push({
      title: 'Motherboard compatibility fix', category: 'Compatibility', name: candidate.name, score: 100,
      reason: `The selected CPU uses ${selected.CPU.specs.socket}. ${candidate.name} has the matching socket.`
    });
  }

  const ramCheck = analysis?.checks?.find(item => item.name === 'RAM ↔ Motherboard');
  if (ramCheck?.status === 'bad' && selected.Motherboard) {
    const candidate = options('RAM', { budget: false })
      .filter(item => item.specs.type === selected.Motherboard.specs.ramType)
      .sort((a, b) => a.price - b.price)[0];
    if (candidate) push({
      title: 'RAM compatibility fix', category: 'Compatibility', name: candidate.name, score: 100,
      reason: `${selected.Motherboard.name} supports ${selected.Motherboard.specs.ramType}; this RAM kit matches that type.`
    });
  }

  const caseCheck = analysis?.checks?.find(item => item.name === 'Motherboard ↔ Case');
  if (caseCheck?.status === 'bad' && selected.Motherboard) {
    const candidate = options('Case', { budget: false })
      .filter(item => motherboardCaseFit(selected.Motherboard.specs?.formFactor, item.specs?.formFactor) !== false)
      .sort((a, b) => a.price - b.price)[0];
    if (candidate) push({
      title: 'Case compatibility fix', category: 'Compatibility', name: candidate.name, score: 95,
      reason: `The selected motherboard uses ${selected.Motherboard.specs.formFactor}; this case family supports that board size.`
    });
  }

  const psuCheck = analysis?.checks?.find(item => item.name === 'PSU headroom');
  if (psuCheck?.status === 'bad' && (analysis?.requiredPsu || 0) > 0) {
    const candidate = all.filter(item => item.category === 'PSU')
      .filter(item => numeric(item.specs.wattage) >= (analysis?.requiredPsu || 0))
      .sort((a, b) => a.price - b.price)[0];
    if (candidate) push({
      title: 'Power supply recommendation', category: 'Power', name: candidate.name, score: 95,
      reason: `The current estimate requires ${analysis.requiredPsu} W after a 35% headroom allowance. This PSU is rated for ${numeric(candidate.specs.wattage)} W.`
    });
  }

  // Workload and QFD priorities influence recommendations. Candidates must remain
  // compatible with already-selected parts and fit the budget when possible.
  const gpuIsImportant = activeWorkloads.some(name => ['Gaming', 'Video Editing', 'AI/ML'].includes(name)) || priority('GPU Performance') >= 75;
  if (gpuIsImportant) {
    const candidate = options('GPU', { different: true })
      .sort((a, b) => {
        const scoreA = numeric(a.specs.performanceScore) + priority('GPU Performance') * 0.25;
        const scoreB = numeric(b.specs.performanceScore) + priority('GPU Performance') * 0.25;
        return scoreB - scoreA;
      })[0] || (!selected.GPU ? options('GPU', { different: false }).sort((a, b) => numeric(b.specs.performanceScore) - numeric(a.specs.performanceScore))[0] : null);
    if (candidate && String(candidate.id) !== String(selected.GPU?.id)) push({
      title: 'GPU recommendation', category: 'Performance', name: candidate.name,
      score: Math.round(Math.min(100, numeric(candidate.specs.performanceScore) + priority('GPU Performance') * 0.2)),
      reason: `GPU Performance has a QFD priority of ${priority('GPU Performance').toFixed(1)}${activeWorkloads.length ? ` for the selected workload mix (${activeWorkloads.join(', ')})` : ''}. The candidate fits the current compatibility and budget checks where possible.`
    });
  }

  const ramIsImportant = priority('RAM Capacity') >= 75 || activeWorkloads.some(name => ['Programming', 'Video Editing', 'AI/ML'].includes(name));
  if (ramIsImportant) {
    const candidate = options('RAM', { different: true })
      .sort((a, b) => capacityGB(b.specs.capacity) - capacityGB(a.specs.capacity) || a.price - b.price)[0];
    const currentCapacity = capacityGB(selected.RAM?.specs.capacity);
    if (candidate && capacityGB(candidate.specs.capacity) > currentCapacity) push({
      title: 'RAM recommendation', category: 'Capacity', name: candidate.name,
      score: Math.round(priority('RAM Capacity')),
      reason: `RAM Capacity has a QFD priority of ${priority('RAM Capacity').toFixed(1)}. ${candidate.specs.capacity} provides more memory than the current selection${selected.RAM ? ` (${selected.RAM.specs.capacity})` : ''}.`
    });
  }

  if (priority('Motherboard Upgradeability') >= 75) {
    const candidate = options('Motherboard', { different: true })
      .sort((a, b) => {
        const score = item => numeric(item.specs.maxRam) + (item.specs.maxPcieGeneration === '5.0' ? 20 : 0) + (item.specs.formFactor === 'ATX' ? 10 : 0);
        return score(b) - score(a) || a.price - b.price;
      })[0];
    if (candidate) push({
      title: 'Motherboard recommendation', category: 'Upgradeability', name: candidate.name,
      score: Math.round(priority('Motherboard Upgradeability')),
      reason: `Motherboard Upgradeability has a QFD priority of ${priority('Motherboard Upgradeability').toFixed(1)}. The candidate supports ${candidate.specs.maxRam} maximum memory and PCIe ${candidate.specs.maxPcieGeneration}.`
    });
  }

  // When over budget, provide compatible lower-cost replacements rather than only
  // showing premium parts that increase the overspend.
  if (analysis && !analysis.budgetOk) {
    const alternatives = Object.keys(keys).flatMap(category => {
      const current = selected[category];
      if (!current) return [];
      return options(category, { budget: false, different: true })
        .filter(candidate => candidate.price < current.price)
        .map(candidate => ({ category, current, candidate, saving: current.price - candidate.price, nextTotal: totalAfterReplacement(category, candidate) }));
    }).sort((a, b) => (a.nextTotal <= analysis.budget ? 1 : 0) - (b.nextTotal <= analysis.budget ? 1 : 0) || b.saving - a.saving);

    let count = 0;
    for (const alternative of alternatives) {
      if (emitted.has('Budget alternative') || count >= 2) break;
      if (!fitsSelectedBuild(alternative.category, alternative.candidate)) continue;
      push({
        title: `Budget alternative ${count + 1}`, category: 'Budget', name: alternative.candidate.name,
        score: Math.min(95, 65 + Math.round(alternative.saving / 1000)),
        reason: `Replacing ${alternative.current.name} saves ₹${alternative.saving.toLocaleString('en-IN')}. Recheck the total before finalizing the build.`
      });
      count++;
    }
  }

  return output;
}
