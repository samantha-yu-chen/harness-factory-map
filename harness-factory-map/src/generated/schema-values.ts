// GENERATED FILE — DO NOT EDIT MANUALLY. Regenerate with `npm run generate`.

export const ENTITY_TYPES = ["actor","component","artifact","decision","external-system","workflow-step"] as const;

export const PLANES = ["request","control","execution","knowledge","assurance","external"] as const;

export const SCOPES = ["mvp","next","future"] as const;

export const STATUSES = ["idea","specified","ready","building","implemented","validated","production-ready","blocked"] as const;

export const RISKS = ["low","medium","high","critical"] as const;

export const ACTOR_TYPES = ["human","agent","deterministic-system","external"] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];
export type Plane = (typeof PLANES)[number];
export type Scope = (typeof SCOPES)[number];
export type Status = (typeof STATUSES)[number];
export type Risk = (typeof RISKS)[number];
export type ActorType = (typeof ACTOR_TYPES)[number];
