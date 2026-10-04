import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const extendedTHREE = Object.assign({}, THREE, {
  GLTFLoader: GLTFLoader,
  OrbitControls: OrbitControls
});

if (typeof window !== 'undefined') {
  window.THREE = extendedTHREE;
}
if (typeof globalThis !== 'undefined') {
  globalThis.THREE = extendedTHREE;
}

export default extendedTHREE;
