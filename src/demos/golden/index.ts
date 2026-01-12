import { registerDemo } from '../../core/registry';
import { TunnelDemo } from './tunnel';
import { RotozoomDemo } from './rotozoom';
import { MetaballsDemo } from './metaballs';

registerDemo(new TunnelDemo());
registerDemo(new RotozoomDemo());
registerDemo(new MetaballsDemo());
