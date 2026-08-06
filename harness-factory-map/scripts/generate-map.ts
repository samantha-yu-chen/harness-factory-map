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
  console.log(
    `Generated ${map.validation.entityCount} entities, ${map.validation.edgeCount} edges, and ${map.validation.workflowCount} workflow(s).`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Map generation failed: ${message}`);
  process.exitCode = 1;
}
