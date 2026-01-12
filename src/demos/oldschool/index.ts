import { registerDemo } from '../../core/registry';
import { PlasmaDemo } from './plasma';
import { StarfieldDemo } from './starfield';
import { FireDemo } from './fire';

registerDemo(new PlasmaDemo());
registerDemo(new StarfieldDemo());
registerDemo(new FireDemo());
