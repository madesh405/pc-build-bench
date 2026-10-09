import assert from 'node:assert/strict';
import { components, workloads, defaultReqs, qfdRelationships } from '../src/data/data.js';
import { runQfd } from '../src/logic/qfd.js';
import { analyzeBuild } from '../src/logic/analysis.js';
import { recommend } from '../src/logic/recommend.js';
import { componentsToCsv, parseComponentCsv } from '../src/lib/catalogCsv.js';

assert.ok(components.length >= 40, 'catalogue should include a useful starter range of components');
assert.equal(new Set(components.map(item => item.category)).size, 7, 'catalogue should cover seven categories');
assert.equal(Object.keys(workloads).length, 5, 'there should be five workload profiles');

const csv = componentsToCsv(components);
const csvRoundTrip = parseComponentCsv(csv);
assert.equal(csvRoundTrip.length, components.length, 'CSV export/import should retain every component');
assert.equal(csvRoundTrip.find(item => item.id === 'gpu2').specs.length, '300 mm', 'CSV round-trip should preserve JSON specifications');


const qfd = runQfd(defaultReqs, qfdRelationships);
assert.equal(qfd.priorities.length, 8, 'QFD should output eight technical priorities');
assert.equal(Math.max(...qfd.priorities.map(item => item.normalized)), 100, 'highest normalized priority should be 100');
const performanceReqs = { ...defaultReqs, Performance: 1 };
const changedQfd = runQfd(performanceReqs, qfdRelationships);
assert.notEqual(
  qfd.priorities.find(item => item.name === 'GPU Performance').raw,
  changedQfd.priorities.find(item => item.name === 'GPU Performance').raw,
  'changing user importance must change QFD output'
);

const empty = analyzeBuild({}, components, []);
assert.equal(empty.total, 0);
assert.equal(empty.power, 0);
assert.equal(empty.completeBuild, false);
assert.equal(empty.compatible, false, 'an empty build must not be reported compatible');

const goodBuild = {
  name: 'Smoke test', budget: 100000,
  cpu: 'cpu1', motherboard: 'mb1', ram: 'ram2', gpu: 'gpu1',
  storage: 'st2', psu: 'psu1', case: 'case1'
};
const goodAnalysis = analyzeBuild(goodBuild, components, ['Gaming', 'Programming']);
assert.equal(goodAnalysis.completeBuild, true);
assert.equal(goodAnalysis.compatible, true);
assert.equal(goodAnalysis.budgetOk, true);
assert.equal(goodAnalysis.checks.find(item => item.name === 'Storage capacity').label, 'Adequate', '2 TB storage should pass the 2 TB workload target');

const storageBuild = { ...goodBuild, storage: 'st1' };
const storageAnalysis = analyzeBuild(storageBuild, components, ['Video Editing']);
assert.equal(storageAnalysis.checks.find(item => item.name === 'Storage capacity').label, 'Below workload target', '1 TB must be below the 2 TB workload target');

const clearanceBuild = { ...goodBuild, gpu: 'gpu2', case: 'case3', budget: 80000 };
const clearanceAnalysis = analyzeBuild(clearanceBuild, components, ['Gaming']);
assert.equal(clearanceAnalysis.checks.find(item => item.name === 'GPU ↔ Case').status, 'bad');
assert.ok(clearanceAnalysis.fmea.some(item => item.mode === 'GPU/case clearance issue' && item.rpn === 64));
assert.equal(clearanceAnalysis.budget, 80000);

const zeroBudget = analyzeBuild({ ...goodBuild, budget: 0 }, components, ['Gaming']);
assert.equal(zeroBudget.budget, 0, 'a zero budget must not silently default to ₹80,000');
assert.equal(zeroBudget.budgetOk, false);

const recs = recommend(clearanceBuild, ['Gaming'], qfd, clearanceAnalysis, components);
assert.ok(recs.some(item => item.title === 'Case clearance fix'), 'recommendations should address the selected GPU/case mismatch');
assert.ok(recs.some(item => item.title.startsWith('Budget alternative')), 'over-budget builds should receive cost-reducing alternatives when available');

console.log('PC Build Bench logic smoke tests passed.');
