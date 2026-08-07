import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generateProjectMap } from './lib/specifications';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

try {
  const map = await generateProjectMap(
    projectRoot,
    resolve(projectRoot, 'src/generated/map.json'),
    resolve(projectRoot, 'src/generated/schema-values.ts'),
  );
  const { validation, contracts } = map;
  console.log(
    `Generated ${validation.entityCount} entities, ${validation.edgeCount} edges, ${validation.stageCount} stages, ${validation.coverageGapCount} coverage gap(s).`,
  );
  console.log(
    `${contracts.units.length} deployable unit(s): ${contracts.crossUnitCount} cross-repository contract(s), ` +
      `${contracts.inUnitCount} in-repository, ${validation.contractGapCount} unbacked.`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Map generation failed: ${message}`);
  process.exitCode = 1;
}
