import { registerDemo } from '../../core/registry';
import { RaymarcherDemo } from './raymarcher';
import { FractalDemo } from './fractal';

registerDemo(new RaymarcherDemo());
registerDemo(new FractalDemo());
