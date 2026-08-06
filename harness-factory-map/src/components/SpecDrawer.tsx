import { MarkdownBody } from './MarkdownBody';
import type { GeneratedEntity } from '../types/specification';
import type { StationDefinition } from '../app/stations';

interface SpecDrawerProps {
  station: StationDefinition | undefined;
  entity: GeneratedEntity | undefined;
  onClose: () => void;
}

export function SpecDrawer({ station, entity, onClose }: SpecDrawerProps) {
  if (!station || !entity) return null;
  return (
    <aside className="spec-drawer" aria-label="Station specification">
      <div className="drawer-header">
        <div>
          <span className="drawer-kicker">Station specification</span>
          <h2>{station.label}</h2>
          <p>{entity.description}</p>
        </div>
        <button type="button" className="close-button" onClick={onClose} aria-label="Close station specification">×</button>
      </div>
      <div className="drawer-meta">
        <span>{entity.entity_type}</span>
        <span>{entity.plane}</span>
        <span>Owner: {entity.owner}</span>
      </div>
      <p className="drawer-source">Source: {entity.sourcePath}</p>
      <MarkdownBody body={entity.body} />
    </aside>
  );
}
