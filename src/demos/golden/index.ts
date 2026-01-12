import { registerDemo } from '../../core/registry';
import { TunnelDemo } from './tunnel';
import { RotozoomDemo } from './rotozoom';
import { MetaballsDemo } from './metaballs';
import { FlowFieldDemo } from './flowfield';
import { VoronoiDemo } from './voronoi';
import { AttractorDemo } from './attractor';
import { EpicyclesDemo } from './epicycles';
import { InterferenceDemo } from './interference';

registerDemo(new TunnelDemo());
registerDemo(new RotozoomDemo());
registerDemo(new MetaballsDemo());
registerDemo(new FlowFieldDemo());
registerDemo(new VoronoiDemo());
registerDemo(new AttractorDemo());
registerDemo(new EpicyclesDemo());
registerDemo(new InterferenceDemo());
