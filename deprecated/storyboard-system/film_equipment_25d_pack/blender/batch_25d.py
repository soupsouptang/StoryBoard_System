# Blender 4.x batch helper for a neutral 2.5D asset style.
# Run example:
# blender --background --python batch_25d.py -- INPUT_DIR OUTPUT_DIR
import bpy, sys, math
from pathlib import Path
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(argv)<2:
    raise SystemExit('Usage: blender --background --python batch_25d.py -- INPUT_DIR OUTPUT_DIR')
SRC,OUT=Path(argv[0]),Path(argv[1]); OUT.mkdir(parents=True,exist_ok=True)

def clear():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def neutralize():
    # Keep geometry and animations, but simplify material response for UI/previs.
    for mat in bpy.data.materials:
        if not mat.use_nodes: continue
        bsdf=mat.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            bsdf.inputs['Metallic'].default_value=min(bsdf.inputs['Metallic'].default_value,0.35)
            bsdf.inputs['Roughness'].default_value=max(bsdf.inputs['Roughness'].default_value,0.62)

def setup_scene():
    sc=bpy.context.scene
    sc.render.film_transparent=True
    sc.render.resolution_x=768; sc.render.resolution_y=768; sc.render.resolution_percentage=100
    # Orthographic 3/4 camera: yaw ~37°, pitch ~23°
    cam_data=bpy.data.cameras.new('AssetCamera'); cam=bpy.data.objects.new('AssetCamera',cam_data); sc.collection.objects.link(cam)
    cam.data.type='ORTHO'; cam.location=(4.8,-6.0,4.1); cam.rotation_euler=(math.radians(66),0,math.radians(37)); cam.data.ortho_scale=3.2; sc.camera=cam
    # neutral area light
    ld=bpy.data.lights.new('Key','AREA'); ld.energy=650; ld.shape='DISK'; ld.size=4.0
    lo=bpy.data.objects.new('Key',ld); sc.collection.objects.link(lo); lo.location=(-3,-4,6)
    sc.world.color=(0.76,0.76,0.76)

def fit_camera():
    cam=bpy.context.scene.camera
    pts=[]
    for o in bpy.context.scene.objects:
        if o.type=='MESH':
            for c in o.bound_box:
                pts.append(o.matrix_world @ __import__('mathutils').Vector(c))
    if pts:
        xs=[p.x for p in pts]; ys=[p.y for p in pts]; zs=[p.z for p in pts]
        span=max(max(xs)-min(xs),max(ys)-min(ys),max(zs)-min(zs))
        cam.data.ortho_scale=max(0.5,span*1.55)

for p in sorted(SRC.glob('*.glb')):
    clear(); bpy.data.materials.clear()
    bpy.ops.import_scene.gltf(filepath=str(p))
    neutralize(); setup_scene(); fit_camera()
    out=OUT/(p.stem+'_25d.glb')
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_apply=True)
    print('exported',out)
