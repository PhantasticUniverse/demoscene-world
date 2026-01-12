import type { Demo, Era } from './types';

export interface DemoRegistry {
  oldschool: Demo[];
  golden: Demo[];
  modern: Demo[];
}

// This will be populated by the demo imports
export const demoRegistry: DemoRegistry = {
  oldschool: [],
  golden: [],
  modern: [],
};

export const registerDemo = (demo: Demo): void => {
  demoRegistry[demo.metadata.era].push(demo);
};

export const getDemosByEra = (era: Era): Demo[] => {
  return demoRegistry[era];
};

export const getDemoById = (id: string): Demo | undefined => {
  for (const era of Object.values(demoRegistry)) {
    const demo = era.find((d: Demo) => d.metadata.id === id);
    if (demo) return demo;
  }
  return undefined;
};

export const getAllDemos = (): Demo[] => {
  return [
    ...demoRegistry.oldschool,
    ...demoRegistry.golden,
    ...demoRegistry.modern,
  ];
};
