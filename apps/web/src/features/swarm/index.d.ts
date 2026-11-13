import type { ReactElement } from 'react';

/** 场景交互动作，宿主据此接管站内跳转。 */
export interface SwarmAction {
  type: string;
  to?: string;
  target?: string;
  label?: string;
  kind?: string;
  title?: string;
  plan?: string;
}

export interface SwarmExperienceProps {
  sceneFactory?: (getWorkerCount: () => number) => unknown;
  interactions?: readonly unknown[];
  onAction?: (action: SwarmAction, engine: unknown) => boolean | void;
  autoStart?: boolean;
}

export declare function SwarmExperience(props: SwarmExperienceProps): ReactElement;

export interface AmbientCursorsProps {
  maxCursors?: number;
}

export declare function AmbientCursors(
  props: AmbientCursorsProps,
): ReactElement | null;

export declare function SwarmPageBuild(): ReactElement;

export declare const PAGE_INTERACTIONS: readonly SwarmAction[];
export declare const ActionType: Readonly<{
  START: string;
  SCROLL: string;
  DIALOG: string;
  CUSTOM: string;
}>;
export declare const InteractionStyle: Readonly<{ LINK: string; BUTTON: string }>;
export declare const DialogKind: Readonly<Record<string, string>>;
export declare const PlanName: Readonly<Record<string, string>>;
export declare class SceneBuilder {
  constructor();
  elements: unknown[];
  tasks: unknown[];
  groups: unknown[];
}
export declare function createScene(getWorkerCount: () => number): unknown;
