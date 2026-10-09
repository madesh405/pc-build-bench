const firstNumber = value => {
  const match = String(value ?? '').replace(/,/g, '').match(/[0-9]+(?:\.[0-9]+)?/);
  return match ? Number(match[0]) : 0;
};

const capacityInGB = value => {
  const match = String(value ?? '').match(/([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|MB)\b/i);
  if (!match) return firstNumber(value);
  const amount = Number(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'TB') return amount * 1000;
  if (unit === 'MB') return amount / 1000;
  return amount;
};

// Reference board-power estimates by GPU chipset. Partner-card power limits can
// vary, so these are planning values rather than exact measurements of each SKU.
// The fallback is deliberately conservative so the PSU estimator always works.
const GPU_POWER_RULES = [
  [/arc\s*b570/,150],[/arc\s*b580/,190],[/arc\s*a770/,225],[/arc\s*a750/,225],[/arc\s*a580/,185],[/arc\s*a380/,75],[/arc\s*a310/,75],
  [/rtx\s*5090/,575],[/rtx\s*5080/,360],[/rtx\s*5070\s*ti/,300],[/rtx\s*5070/,250],[/rtx\s*5060\s*ti/,180],[/rtx\s*5060/,145],[/rtx\s*5050/,130],
  [/rtx\s*4090/,450],[/rtx\s*4080/,320],[/rtx\s*4070\s*ti/,285],[/rtx\s*4070\s*super/,220],[/rtx\s*4070/,200],[/rtx\s*4060\s*ti/,160],[/rtx\s*4060/,115],
  [/rtx\s*3090\s*ti/,450],[/rtx\s*3090/,350],[/rtx\s*3080\s*ti/,350],[/rtx\s*3080/,320],[/rtx\s*3070\s*ti/,290],[/rtx\s*3070/,220],[/rtx\s*3060\s*ti/,200],[/rtx\s*3060/,170],[/rtx\s*3050\s*6gb/,70],[/rtx\s*3050/,130],
  [/rtx\s*2080\s*ti/,250],[/rtx\s*2080\s*super/,250],[/rtx\s*2080/,215],[/rtx\s*2070\s*super/,215],[/rtx\s*2070/,175],[/rtx\s*2060\s*super/,175],[/rtx\s*2060/,160],
  [/gtx\s*1080\s*ti/,250],[/gtx\s*1080/,180],[/gtx\s*1070\s*ti/,180],[/gtx\s*1070/,150],[/gtx\s*1060/,120],[/gtx\s*1660\s*ti/,120],[/gtx\s*1660\s*super/,125],[/gtx\s*1660/,120],[/gtx\s*1650\s*super/,100],[/gtx\s*1650/,75],[/gtx\s*1050\s*ti/,75],[/gtx\s*1050/,75],[/gtx\s*1030/,30],
  [/rx\s*9070\s*xt/,304],[/rx\s*9070/,220],[/rx\s*9060\s*xt/,160],[/rx\s*7900\s*xtx/,355],[/rx\s*7900\s*xt/,315],[/rx\s*7900\s*gre/,260],[/rx\s*7800\s*xt/,263],[/rx\s*7700\s*xt/,245],[/rx\s*7600\s*xt/,190],[/rx\s*7600/,165],
  [/rx\s*6950\s*xt/,335],[/rx\s*6900\s*xt/,300],[/rx\s*6800\s*xt/,300],[/rx\s*6800/,250],[/rx\s*6750\s*xt/,250],[/rx\s*6700\s*xt/,230],[/rx\s*6700/,175],[/rx\s*6650\s*xt/,180],[/rx\s*6600\s*xt/,160],[/rx\s*6600/,132],[/rx\s*6500\s*xt/,107],
  [/rx\s*590/,225],[/rx\s*580/,185],[/rx\s*570/,150],[/rx\s*5600\s*xt/,150],[/rx\s*5500\s*xt/,130],[/rx\s*480/,150],[/rx\s*470/,120],[/rx\s*460/,75],[/rx\s*6400/,53],
  [/vega\s*64/,295],[/vega\s*56/,210],[/radeon\s*vii/,300],[/radeon\s*pro\s*w7900/,295],[/radeon\s*pro\s*w7800/,260],[/radeon\s*pro\s*w6800/,250],[/radeon\s*pro\s*w6600/,130],
  [/rtx\s*6000\s*ada/,300],[/rtx\s*5000\s*ada/,250],[/rtx\s*4500\s*ada/,210],[/rtx\s*4000\s*ada/,130],[/rtx\s*2000\s*ada/,70],[/rtx\s*a6000/,300],[/rtx\s*a5500/,230],[/rtx\s*a5000/,230],[/rtx\s*a4500/,200],[/rtx\s*a4000/,140],[/rtx\s*a2000/,70],[/rtx\s*a1000/,50],
  [/gt\s*730/,50],[/gt\s*710/,19],[/gt\s*1030/,30],[/titan\s*rtx/,280],[/titan\s*x/,250],[/titan\s*v/,250],[/titan/,250],
  [/quadro|firepro|nvs|t[0-9]{3,4}/,100],
  [/radeon\s*hd\s*5450/,20],[/radeon\s*hd\s*6450/,27],[/radeon\s*hd\s*7750/,55],[/radeon\s*hd\s*7850/,130],[/radeon\s*hd\s*7970/,250],[/radeon\s*hd\s*6990/,375],[/radeon\s*r9\s*295x2/,500],[/radeon\s*r9\s*290/,275],[/radeon\s*r9\s*280/,250],[/radeon\s*r9\s*270/,150]
];

function estimateGpuPower(gpu) {
  const explicit = firstNumber(gpu?.specs?.boardPower) || firstNumber(gpu?.specs?.power) || firstNumber(gpu?.power);
  if (explicit > 0) return explicit;
  const identity = `${gpu?.specs?.chipset || ''} ${gpu?.name || ''}`.toLowerCase();
  const match = GPU_POWER_RULES.find(([pattern]) => pattern.test(identity));
  if (match) return match[1];
  if (/\b(gt|nvs)\b/.test(identity)) return 50;
  if (/\b(geforce|radeon|arc|quadro|firepro|titan|rtx|gtx)\b/.test(identity)) return 150;
  return 150;
}

export function motherboardCaseFit(boardFormFactor, caseFormFactor) {
  const board = String(boardFormFactor || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const chassis = String(caseFormFactor || '').toLowerCase();
  if (!board || !chassis) return null;
  const isMiniITX = board.includes('miniitx') || board === 'itx';
  const isMicroATX = board.includes('microatx') || board === 'matx';
  const isATX = board === 'atx';
  if (!isMiniITX && !isMicroATX && !isATX) return null;
  if (chassis.includes('mini itx') || chassis.includes('miniitx')) return isMiniITX;
  if (chassis.includes('microatx') || chassis.includes('micro-atx')) return isMicroATX || isMiniITX;
  if (chassis.includes('atx')) return isATX || isMicroATX || isMiniITX;
  // Names such as HTPC or Test Bench do not consistently define a supported size.
  return null;
}

export function analyzeBuild(build = {}, all = [], work = []) {
  const find = id => all.find(component => String(component.id) === String(id));
  const cpu = find(build.cpu);
  const motherboard = find(build.motherboard);
  const ram = find(build.ram);
  const gpu = find(build.gpu);
  const storage = find(build.storage);
  const psu = find(build.psu);
  const caseItem = find(build.case);
  const selected = [cpu, motherboard, ram, gpu, storage, psu, caseItem];
  const hasAnyPart = selected.some(Boolean);
  const completeBuild = selected.every(Boolean);
  const total = selected.reduce((sum, component) => sum + (Number(component?.price) || 0), 0);

  const cpuPower = firstNumber(cpu?.power) || firstNumber(cpu?.specs?.tdp) || 65;
  const gpuPower = gpu ? estimateGpuPower(gpu) : 0;
  const power = hasAnyPart ? cpuPower * Number(Boolean(cpu)) + gpuPower + 80 : 0;
  const powerEstimateComplete = Boolean(cpu && gpu);
  const requiredPsu = powerEstimateComplete && power > 0 ? Math.ceil((power * 1.35) / 50) * 50 : 0;
  const budget = build.budget === undefined || build.budget === null || build.budget === ''
    ? 80000
    : Math.max(0, Number(build.budget) || 0);

  const checks = [];
  const cpuSocket = cpu?.specs?.socket;
  const boardSocket = motherboard?.specs?.socket;
  if (cpu && motherboard && cpuSocket && boardSocket) {
    const socketOK = String(cpuSocket).trim().toLowerCase() === String(boardSocket).trim().toLowerCase();
    checks.push({
      name: 'CPU ↔ Motherboard',
      status: socketOK ? 'ok' : 'bad',
      label: socketOK ? 'Compatible' : 'Incompatible',
      detail: `${cpuSocket} ↔ ${boardSocket}`
    });
  }

  const ramType = ram?.specs?.type;
  const boardRamType = motherboard?.specs?.ramType;
  if (ram && motherboard && ramType && boardRamType) {
    const ramOK = String(ramType).trim().toLowerCase() === String(boardRamType).trim().toLowerCase();
    checks.push({
      name: 'RAM ↔ Motherboard',
      status: ramOK ? 'ok' : 'bad',
      label: ramOK ? 'Compatible' : 'Incompatible',
      detail: `${ramType} ↔ ${boardRamType}`
    });
  }

  const boardFormFactor = motherboard?.specs?.formFactor;
  const caseFormFactor = caseItem?.specs?.formFactor;
  const caseFit = motherboardCaseFit(boardFormFactor, caseFormFactor);
  if (motherboard && caseItem && caseFit !== null) {
    checks.push({
      name: 'Motherboard ↔ Case',
      status: caseFit ? 'ok' : 'bad',
      label: caseFit ? 'Compatible' : 'Incompatible',
      detail: `${boardFormFactor} motherboard / ${caseFormFactor} case`
    });
  }

  const psuWattage = firstNumber(psu?.specs?.wattage);
  const psuSufficient = Boolean(psu && requiredPsu > 0 && psuWattage > 0 && psuWattage >= requiredPsu);
  if (psu && requiredPsu > 0 && psuWattage > 0) {
    checks.push({
      name: 'PSU headroom',
      status: psuSufficient ? 'ok' : 'bad',
      label: psuSufficient ? 'Sufficient' : 'Under-capacity',
      detail: `${psuWattage} W selected / ${requiredPsu} W recommended`
    });
  }

  checks.push({
    name: 'Budget',
    status: total <= budget ? 'ok' : 'warn',
    label: total <= budget ? 'Within budget' : 'Over budget',
    detail: `₹${total.toLocaleString('en-IN')} / ₹${budget.toLocaleString('en-IN')}`
  });

  const activeWorkloads = Array.isArray(work) ? work : [];
  const needsMoreMemory = activeWorkloads.some(name => ['Programming', 'Video Editing', 'AI/ML'].includes(name));
  const needsMoreStorage = activeWorkloads.some(name => ['Video Editing', 'AI/ML'].includes(name));
  const ramCapacity = capacityInGB(ram?.specs?.capacity);
  const storageCapacity = capacityInGB(storage?.specs?.capacity);

  if (ram && ramCapacity > 0) {
    const lowForWorkload = needsMoreMemory && ramCapacity < 32;
    checks.push({
      name: 'RAM capacity',
      status: lowForWorkload ? 'warn' : 'ok',
      label: lowForWorkload ? 'Below workload target' : 'Adequate',
      detail: `${ram.specs.capacity}${needsMoreMemory ? ' · 32 GB target for selected workloads' : ''}`
    });
  }

  if (storage && storageCapacity > 0) {
    const lowForWorkload = needsMoreStorage && storageCapacity < 2000;
    checks.push({
      name: 'Storage capacity',
      status: lowForWorkload ? 'warn' : 'ok',
      label: lowForWorkload ? 'Below workload target' : 'Adequate',
      detail: `${storage.specs.capacity}${needsMoreStorage ? ' · 2 TB target for selected workloads' : ''}`
    });
  }

  const fmea = [];
  const addRisk = (mode, effect, s, o, d, mitigation) => {
    const rpn = s * o * d;
    fmea.push({ mode, effect, s, o, d, rpn, level: rpn >= 100 ? 'High' : rpn >= 50 ? 'Medium' : 'Low', mitigation });
  };

  if (cpu && motherboard && cpuSocket && boardSocket && String(cpuSocket).trim().toLowerCase() !== String(boardSocket).trim().toLowerCase()) {
    addRisk('CPU/motherboard mismatch', 'System may not initialize', 10, 2, 2, 'Select a motherboard with the CPU socket.');
  }
  if (ram && motherboard && ramType && boardRamType && String(ramType).trim().toLowerCase() !== String(boardRamType).trim().toLowerCase()) {
    addRisk('RAM incompatibility', 'Memory may not operate correctly', 8, 2, 3, 'Select RAM supported by the motherboard.');
  }
  if (motherboard && caseItem && caseFit === false) {
    addRisk('Motherboard/case form-factor mismatch', 'Motherboard mounting points may not fit the case', 8, 3, 2, 'Select a case that supports the motherboard form factor.');
  }
  if (hasAnyPart && !psu) {
    addRisk('PSU not selected', 'The build has no selected power supply', 9, 4, 3, 'Select a PSU with sufficient rated capacity.');
  } else if (psu && requiredPsu > 0 && psuWattage > 0 && !psuSufficient) {
    addRisk('PSU under-capacity', 'Insufficient estimated power headroom', 9, 5, 3, 'Select a higher-wattage PSU with adequate headroom.');
  }
  if (total > budget) {
    addRisk('Budget overrun', 'Configuration exceeds spending limit', 7, 6, 2, 'Replace high-cost components or revise the budget.');
  }
  if (ram && ramCapacity > 0 && needsMoreMemory && ramCapacity < 32) {
    addRisk('Insufficient RAM', 'The selected workload may experience memory pressure', 6, 6, 4, 'Consider at least 32 GB RAM for this workload mix.');
  }
  if (storage && storageCapacity > 0 && needsMoreStorage && storageCapacity < 2000) {
    addRisk('Insufficient storage', 'Media or model files may fill the drive quickly', 5, 5, 4, 'Consider a 2 TB or larger storage configuration.');
  }

  fmea.sort((a, b) => b.rpn - a.rpn);
  const compatibilityNames = new Set(['CPU ↔ Motherboard', 'RAM ↔ Motherboard', 'Motherboard ↔ Case', 'PSU headroom']);
  const compatibilityChecks = checks.filter(check => compatibilityNames.has(check.name));
  const hasKnownMismatch = compatibilityChecks.some(check => check.status === 'bad');
  const compatible = completeBuild && !hasKnownMismatch;
  const compatibilityStatus = hasKnownMismatch ? 'bad' : completeBuild ? 'ok' : 'warn';
  const compatibilityLabel = hasKnownMismatch ? 'Incompatible' : completeBuild ? 'Compatible' : 'Build incomplete';

  return {
    total,
    power,
    powerEstimateComplete,
    hasAnyPart,
    requiredPsu,
    compatibilityStatus,
    compatibilityLabel,
    budget,
    checks,
    compatible,
    completeBuild,
    budgetOk: total <= budget,
    highRisk: fmea.some(item => item.level === 'High'),
    mediumRisk: fmea.some(item => item.level === 'Medium'),
    fmea
  };
}
