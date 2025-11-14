#!/usr/bin/env node

/**
 * Script to extract and display test coverage percentage
 * Usage: node scripts/get-coverage.js
 */

const fs = require('fs');
const path = require('path');

const coveragePath = path.join(__dirname, '..', 'coverage', 'lcov.info');

if (!fs.existsSync(coveragePath)) {
    console.log('❌ Coverage file not found. Please run: npm run test:coverage');
    process.exit(1);
}

const coverageContent = fs.readFileSync(coveragePath, 'utf-8');
const lines = coverageContent.split('\n');

let totalStatements = 0;
let coveredStatements = 0;
let totalBranches = 0;
let coveredBranches = 0;
let totalFunctions = 0;
let coveredFunctions = 0;
let totalLines = 0;
let coveredLines = 0;

let currentFile = null;
let fileStatements = 0;
let fileCoveredStatements = 0;
let fileBranches = 0;
let fileCoveredBranches = 0;
let fileFunctions = 0;
let fileCoveredFunctions = 0;
let fileLines = 0;
let fileCoveredLines = 0;

lines.forEach(line => {
    if (line.startsWith('SF:')) {
        // New file
        if (currentFile) {
            // Add previous file totals
            totalStatements += fileStatements;
            coveredStatements += fileCoveredStatements;
            totalBranches += fileBranches;
            coveredBranches += fileCoveredBranches;
            totalFunctions += fileFunctions;
            coveredFunctions += fileCoveredFunctions;
            totalLines += fileLines;
            coveredLines += fileCoveredLines;
        }
        currentFile = line.substring(3);
        fileStatements = 0;
        fileCoveredStatements = 0;
        fileBranches = 0;
        fileCoveredBranches = 0;
        fileFunctions = 0;
        fileCoveredFunctions = 0;
        fileLines = 0;
        fileCoveredLines = 0;
    } else if (line.startsWith('LF:')) {
        fileLines = parseInt(line.substring(3)) || 0;
    } else if (line.startsWith('LH:')) {
        fileCoveredLines = parseInt(line.substring(3)) || 0;
    } else if (line.startsWith('FNF:')) {
        fileFunctions = parseInt(line.substring(4)) || 0;
    } else if (line.startsWith('FNH:')) {
        fileCoveredFunctions = parseInt(line.substring(4)) || 0;
    } else if (line.startsWith('BRF:')) {
        fileBranches = parseInt(line.substring(4)) || 0;
    } else if (line.startsWith('BRH:')) {
        fileCoveredBranches = parseInt(line.substring(4)) || 0;
    }
});

// Add last file
if (currentFile) {
    totalStatements += fileLines; // Using lines as proxy for statements
    coveredStatements += fileCoveredLines;
    totalBranches += fileBranches;
    coveredBranches += fileCoveredBranches;
    totalFunctions += fileFunctions;
    coveredFunctions += fileCoveredFunctions;
    totalLines += fileLines;
    coveredLines += fileCoveredLines;
}

// Calculate percentages
const statementsPercent = totalStatements > 0 
    ? ((coveredStatements / totalStatements) * 100).toFixed(2)
    : '0.00';
const branchesPercent = totalBranches > 0
    ? ((coveredBranches / totalBranches) * 100).toFixed(2)
    : '0.00';
const functionsPercent = totalFunctions > 0
    ? ((coveredFunctions / totalFunctions) * 100).toFixed(2)
    : '0.00';
const linesPercent = totalLines > 0
    ? ((coveredLines / totalLines) * 100).toFixed(2)
    : '0.00';

console.log('\n📊 Test Coverage Summary\n');
console.log('┌─────────────┬──────────┬──────────┬──────────┬──────────┐');
console.log('│ Metric      │ Covered  │ Total    │ Percent  │ Status   │');
console.log('├─────────────┼──────────┼──────────┼──────────┼──────────┤');
console.log(`│ Statements  │ ${String(coveredStatements).padStart(8)} │ ${String(totalStatements).padStart(8)} │ ${String(statementsPercent + '%').padStart(8)} │ ${getStatusBar(parseFloat(statementsPercent))} │`);
console.log(`│ Branches    │ ${String(coveredBranches).padStart(8)} │ ${String(totalBranches).padStart(8)} │ ${String(branchesPercent + '%').padStart(8)} │ ${getStatusBar(parseFloat(branchesPercent))} │`);
console.log(`│ Functions   │ ${String(coveredFunctions).padStart(8)} │ ${String(totalFunctions).padStart(8)} │ ${String(functionsPercent + '%').padStart(8)} │ ${getStatusBar(parseFloat(functionsPercent))} │`);
console.log(`│ Lines       │ ${String(coveredLines).padStart(8)} │ ${String(totalLines).padStart(8)} │ ${String(linesPercent + '%').padStart(8)} │ ${getStatusBar(parseFloat(linesPercent))} │`);
console.log('└─────────────┴──────────┴──────────┴──────────┴──────────┘');

console.log('\n📈 Overall Coverage: ' + linesPercent + '%\n');

// Check thresholds
const threshold = 90;
const metrics = [
    { name: 'Statements', value: parseFloat(statementsPercent), threshold },
    { name: 'Branches', value: parseFloat(branchesPercent), threshold },
    { name: 'Functions', value: parseFloat(functionsPercent), threshold },
    { name: 'Lines', value: parseFloat(linesPercent), threshold }
];

const belowThreshold = metrics.filter(m => m.value < threshold);
if (belowThreshold.length > 0) {
    console.log('⚠️  Metrics below 90% threshold:');
    belowThreshold.forEach(m => {
        const diff = (threshold - m.value).toFixed(2);
        console.log(`   - ${m.name}: ${m.value}% (${diff}% below threshold)`);
    });
    console.log('');
}

function getStatusBar(percent) {
    if (percent >= 90) return '✅';
    if (percent >= 70) return '⚠️ ';
    return '❌';
}

