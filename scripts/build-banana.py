"""Original half-peeled banana. Run with Blender --background --python this_file.

Visuals and short convex collision pieces are derived from the same closed rings.
The scale is illustrative, in the terrarium's mm units; this is not a botanical scan.
"""
import bpy, bmesh, math, json, struct, hashlib
from pathlib import Path
from mathutils import Vector

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / 'public/props/banana'
(OUT / 'collision').mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

mat = bpy.data.materials.new('Banana / surface pigments')
mat.use_nodes = True
shader = mat.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = .72
color = mat.node_tree.nodes.new('ShaderNodeVertexColor')
color.layer_name = 'Pigment'
mat.node_tree.links.new(color.outputs['Color'], shader.inputs['Base Color'])
parts = []
colliders = []

def pigment(base, t, a, peel=False):
    # Deterministic, surface-bound mottling, longitudinal fibres and tiny freckles.
    noise = math.sin(t*173+a*59)*math.sin(t*241-a*113)
    fibre = .025*math.sin(a*63 + t*12)
    bruise = .30*max(0, math.sin(t*37+a*5)-.68) if peel else 0
    fleck = .32 if peel and noise > .81 else 0
    return tuple(max(.01, min(1, c*(1-bruise-fleck)+fibre+noise*.018)) for c in base)+(1,)

def create(name, rings, colors, stride=3):
    n, count = len(rings[0]), len(rings)
    verts = [v for ring in rings for v in ring]
    faces = [(0, *range(n-1, 0, -1))]
    for j in range(count-1):
        for k in range(n):
            faces.append((j*n+k,j*n+(k+1)%n,(j+1)*n+(k+1)%n,(j+1)*n+k))
    faces.append(tuple((count-1)*n+k for k in range(n)))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces); mesh.update()
    obj = bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    attribute = mesh.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='POINT')
    for i,c in enumerate(colors): attribute.data[i].color = c
    for face in mesh.polygons: face.use_smooth=True
    parts.append(obj)
    # Each small hull encloses only a short curved section, preserving the open peel.
    for start in range(0,count-1,stride):
        end=min(count-1,start+stride)
        colliders.append((f'{name}_{start:03}',[v for ring in rings[start:end+1] for v in ring]))

def tube(name, path, radius, base, n=32, steps=60, peel=False, ribs=.03, stride=3):
    rings=[]; colors=[]
    for i in range(steps+1):
        t=i/steps; p=Vector(path(t))
        tangent=Vector(path(min(1,t+.001)))-Vector(path(max(0,t-.001)))
        tangent.normalize(); side=Vector((0,1,0)); up=tangent.cross(side).normalized()
        ring=[]
        for j in range(n):
            a=2*math.pi*j/n; r=radius(t)*(1+ribs*math.cos(5*a))
            ring.append(tuple(p + r*(side*math.cos(a)+up*math.sin(a))))
            colors.append(pigment(base,t,a,peel))
        rings.append(ring)
    create(name,rings,colors,stride)

def fruit(t): return (-3.2+6.3*t,.12*math.sin(t*math.pi),.69+.62*math.sin(t*math.pi))
def radius(t): return .46*(.18+.82*math.sin(math.pi*t)**.32)
tube('flesh',fruit,radius,(.94,.84,.56),ribs=.045)
tube('unopened_skin',lambda t:fruit(.56+.44*t),lambda t:radius(.56+.44*t)+.028,(.81,.58,.025),peel=True,steps=30)
tube('stem',lambda t:(3.09+.48*t,0,.68-.13*t),lambda t:.10-.025*t,(.22,.13,.035),n=14,steps=6,stride=2)
tube('blossom_tip',lambda t:(-3.2-.05*t,0,.69),lambda t:.075*(1-.6*t),(.20,.12,.04),n=12,steps=3,stride=3)

# Three thick flaps: pale concave inner surface, yellow outer skin, dark edges.
for flap,(fan,reach) in enumerate([(-1.9,4.25),(1.9,4.0),(.18,5.0)]):
    rings=[]; colors=[]; cross=10
    for i in range(61):
        t=i/60; width=.43*(.3+.7*math.sin(math.pi*(.12+.88*t))**.6)
        x=.38-reach*t; y=fan*math.sin(math.pi*t/2)
        z=1.19*(1-t)**3+.13+.25*t**7
        ring=[]
        for outer in [False,True]:
            js=range(cross+1) if not outer else range(cross,-1,-1)
            for j in js:
                u=2*j/cross-1
                ring.append((x+.1*u*t,y+u*width,z+.13*u*u*math.sin(math.pi*t)-(.055 if outer else 0)))
                base=(.79,.54,.02) if outer else (.84,.75,.43)
                if abs(u)>.95:base=(.34,.22,.045)
                colors.append(pigment(base,t,j*.3,outer))
        rings.append(ring)
    create(f'peel_{flap+1}',rings,colors,3)

# Place the lowest surface exactly on the same plane used by the physics model.
floor=min(v.co.z for o in parts for v in o.data.vertices)
for o in parts:
    for v in o.data.vertices:v.co.z-=floor

entries=[]
for name,verts in colliders:
    bm=bmesh.new()
    for x,y,z in verts:bm.verts.new((x,y,z-floor))
    bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
    bmesh.ops.triangulate(bm,faces=list(bm.faces))
    bm.normal_update()
    triangles=[f for f in bm.faces if len(f.verts)==3]
    payload=bytearray(b'Original dmelanogaster banana contact hull'.ljust(80,b' '))+struct.pack('<I',len(triangles))
    for f in triangles:
        payload+=struct.pack('<12fH',*f.normal,*f.verts[0].co,*f.verts[1].co,*f.verts[2].co,0)
    file=OUT/'collision'/f'{name}.stl';file.write_bytes(payload)
    entries.append({'name':name,'file':f'collision/{name}.stl','sha256':hashlib.sha256(payload).hexdigest(),'bytes':len(payload)})
    bm.free()

bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.export_scene.gltf(filepath=str(OUT/'banana.glb'),export_format='GLB',use_selection=True,export_yup=False,export_materials='EXPORT')
(BASE/'assets').mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'assets/banana.blend'))
manifest={'version':1,'author':'dmelanogaster / original procedural Blender model','license':'MIT','scale':'Illustrative miniature banana in mm; not measured botanical anatomy','position':[-3.5,-4,0],'rotationZ':-.25,'upAxis':'Z','visual':'banana.glb','visualSha256':hashlib.sha256((OUT/'banana.glb').read_bytes()).hexdigest(),'collision':'Short convex sections enclosing the authored surface; open spaces between peel flaps are preserved. Conservative local approximation, not triangle-level concave contact.','pieces':entries}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f'BANANA: {len(parts)} visual parts, {len(entries)} convex pieces, {floor=}')
