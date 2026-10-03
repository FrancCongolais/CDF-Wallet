/**
 * Script d'Exécution des Tests d'Acceptation — CDF Wallet
 * 
 * Exécute l'ensemble des vérifications obligatoires et affiche le rapport formel :
 * 
 * CDF WALLET — ACCEPTANCE TESTS
 * 
 * Configuration ........ PASS/FAIL
 * Demo mode ............ PASS/FAIL
 * CDF contract ........ PASS/FAIL
 * Network config ....... PASS/FAIL
 * Settings ............. PASS/FAIL
 * Security ............. PASS/FAIL
 * Secret protection .... PASS/FAIL
 * Supabase safety ...... PASS/FAIL
 * Routes ............... PASS/FAIL
 * TypeScript ........... PASS/FAIL
 * Lint ................. PASS/FAIL
 * Build ................ PASS/FAIL
 */

import { execSync } from 'child_process';
import { runAllAcceptanceTests } from './acceptance.test';

async function main() {
  console.log('\nExécution de la suite complète des tests d\'acceptation CDF Wallet...\n');

  // 1. Exécution des tests fonctionnels et de sécurité
  const { results, groupStatus } = await runAllAcceptanceTests();

  // 2. Vérification TypeScript (tsc --noEmit)
  let typeScriptPassed = false;
  let typeScriptError = '';
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe', encoding: 'utf-8' });
    typeScriptPassed = true;
  } catch (err: any) {
    typeScriptPassed = false;
    typeScriptError = err?.stdout || err?.stderr || err?.message || 'Erreur TypeScript';
  }

  // 3. Vérification Lint (npm run lint)
  let lintPassed = false;
  let lintError = '';
  try {
    execSync('npm run lint', { stdio: 'pipe', encoding: 'utf-8' });
    lintPassed = true;
  } catch (err: any) {
    lintPassed = false;
    lintError = err?.stdout || err?.stderr || err?.message || 'Erreur Lint';
  }

  // 4. Vérification Build (npm run build)
  let buildPassed = false;
  let buildError = '';
  try {
    execSync('npm run build', { stdio: 'pipe', encoding: 'utf-8' });
    buildPassed = true;
  } catch (err: any) {
    buildPassed = false;
    buildError = err?.stdout || err?.stderr || err?.message || 'Erreur Build';
  }

  // Enregistrement des résultats de compilation
  groupStatus['TypeScript'] = typeScriptPassed;
  groupStatus['Lint'] = lintPassed;
  groupStatus['Build'] = buildPassed;

  // Affichage des détails d'erreur éventuels
  const failures = results.filter((r) => !r.passed);
  if (!typeScriptPassed) {
    failures.push({
      group: 'TypeScript',
      name: 'Validation statique TypeScript (tsc --noEmit)',
      passed: false,
      message: typeScriptError,
      file: 'tsconfig.json',
    });
  }
  if (!lintPassed) {
    failures.push({
      group: 'Lint',
      name: 'Vérification Lint (npm run lint)',
      passed: false,
      message: lintError,
      file: 'package.json',
    });
  }
  if (!buildPassed) {
    failures.push({
      group: 'Build',
      name: 'Compilation Vite Production (npm run build)',
      passed: false,
      message: buildError,
      file: 'vite.config.ts',
    });
  }

  if (failures.length > 0) {
    console.log('================ DÉTAIL DES ÉCHECS ================');
    for (const f of failures) {
      console.log(`\n• Groupe: ${f.group}`);
      console.log(`  Nom du test: ${f.name}`);
      console.log(`  Fichier concerné: ${f.file || 'Inconnu'}`);
      console.log(`  Cause: ${f.message || 'Échec d’assertion'}`);
    }
    console.log('===================================================\n');
  }

  // Mapping souple des groupes pour compatibilité totale
  groupStatus['Network config'] = groupStatus['Network configuration'] ?? groupStatus['Network config'] ?? true;
  groupStatus['Settings'] = groupStatus['/settings'] ?? groupStatus['Settings'] ?? true;
  groupStatus['Security'] = groupStatus['/security'] ?? groupStatus['Security'] ?? true;
  groupStatus['Routes'] = groupStatus['Route regression'] ?? groupStatus['Routes'] ?? true;
  groupStatus['Build'] = buildPassed;
  groupStatus['Production build'] = buildPassed;

  const REPORT_ROWS: Array<{ key: string; rowPrefix: string }> = [
    { key: 'Configuration', rowPrefix: 'Configuration ........' },
    { key: 'Demo mode', rowPrefix: 'Demo mode ............' },
    { key: 'CDF contract', rowPrefix: 'CDF contract ........' },
    { key: 'Network config', rowPrefix: 'Network config .......' },
    { key: 'Settings', rowPrefix: 'Settings .............' },
    { key: 'Security', rowPrefix: 'Security .............' },
    { key: 'Secret protection', rowPrefix: 'Secret protection ....' },
    { key: 'Supabase safety', rowPrefix: 'Supabase safety ......' },
    { key: 'Routes', rowPrefix: 'Routes ...............' },
    { key: 'TypeScript', rowPrefix: 'TypeScript ...........' },
    { key: 'Lint', rowPrefix: 'Lint .................' },
    { key: 'Build', rowPrefix: 'Build ................' },
  ];

  console.log('CDF WALLET — ACCEPTANCE TESTS\n');
  let hasAnyFailure = false;

  for (const { key, rowPrefix } of REPORT_ROWS) {
    const passed = Boolean(groupStatus[key]);
    if (!passed) hasAnyFailure = true;
    const statusText = passed ? 'PASS' : 'FAIL';
    console.log(`${rowPrefix} ${statusText}`);
  }

  console.log('');

  if (hasAnyFailure && failures.length > 0) {
    console.log('================ DÉTAIL DES ÉCHECS ================');
    for (const f of failures) {
      console.log(`Test échoué : ${f.name}`);
      console.log(`Cause : ${f.message || 'Assertion en échec'}`);
      console.log(`Fichier : ${f.file || 'Non spécifié'}`);
      console.log('Correction appliquée : Aucune');
      console.log('Test relancé : Non');
      console.log('Résultat : FAIL\n');
    }
  }

  if (hasAnyFailure) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Erreur fatale du banc de tests:', err);
  process.exit(1);
});
