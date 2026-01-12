import './styles.css';
import './demos'; // This registers all demos - must be before Gallery
import { Gallery } from './gallery/Gallery';

const canvas = document.getElementById('demo-canvas') as HTMLCanvasElement;
new Gallery(canvas);
