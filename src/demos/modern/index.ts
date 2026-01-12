import { registerDemo } from '../../core/registry';
import { RaymarcherDemo } from './raymarcher';
import { FractalDemo } from './fractal';
import { DomainWarpDemo } from './domainwarp';
import { ReactionDiffusionDemo } from './reaction';
import { JellyfishDemo } from './jellyfish';
import { HyperbolicDemo } from './hyperbolic';

registerDemo(new RaymarcherDemo());
registerDemo(new FractalDemo());
registerDemo(new DomainWarpDemo());
registerDemo(new ReactionDiffusionDemo());
registerDemo(new JellyfishDemo());
registerDemo(new HyperbolicDemo());
