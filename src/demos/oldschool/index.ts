import { registerDemo } from '../../core/registry';
import { PlasmaDemo } from './plasma';
import { StarfieldDemo } from './starfield';
import { FireDemo } from './fire';
import { AuroraDemo } from './aurora';
import { CopperDemo } from './copper';

registerDemo(new PlasmaDemo());
registerDemo(new StarfieldDemo());
registerDemo(new FireDemo());
registerDemo(new AuroraDemo());
registerDemo(new CopperDemo());
