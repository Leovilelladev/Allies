"""Família Relíquia: sólidos convexos, normais de leitura e prévia conjunta."""
import bpy
import math
import os
from itertools import combinations
from mathutils import Vector

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../public/models/reliquia_leo'))
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metal, rough, emission=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    p.inputs['Emission Color'].default_value = (*color, 1)
    p.inputs['Emission Strength'].default_value = emission
    return m

navy = material('Obsidiana', (.004, .014, .035), .48, .28)
blue = material('Petroleo', (.008, .035, .072), .4, .3)
gold = material('Ouro', (.92, .57, .1), .7, .24)
cyan = material('Inscricoes', (.06, .72, .88), .65, .25, .28)
font = bpy.data.fonts.load('C:/Windows/Fonts/georgiab.ttf')

def hull(points):
    """Agrupa planos de suporte coplanares e ordena vértices com normal externa."""
    points = [Vector(p) for p in points]
    planes = {}
    for a, b, c in combinations(range(len(points)), 3):
        n = (points[b] - points[a]).cross(points[c] - points[a])
        if n.length < 1e-7:
            continue
        n.normalize()
        ds = [n.dot(p - points[a]) for p in points]
        if min(ds) < -1e-6 and max(ds) > 1e-6:
            continue
        if max(ds) > 1e-6:
            n.negate()
        ids = tuple(i for i, d in enumerate(ds) if abs(d) < 1e-6)
        planes[ids] = n
    faces = []
    for ids, n in sorted(planes.items()):
        center = sum((points[i] for i in ids), Vector()) / len(ids)
        u = (points[ids[0]] - center).normalized()
        v = n.cross(u)
        faces.append(sorted(ids, key=lambda i: math.atan2((points[i]-center).dot(v), (points[i]-center).dot(u))))
    return points, faces

def dual(points):
    points, faces = hull(points)
    result = []
    for face in faces:
        a, b, c = [points[i] for i in face[:3]]
        n = (b-a).cross(c-a).normalized()
        result.append(n / n.dot(a))
    return result

phi = (1 + math.sqrt(5)) / 2
ico = [(0,a,b*phi) for a in (-1,1) for b in (-1,1)] + [(a,b*phi,0) for a in (-1,1) for b in (-1,1)] + [(b*phi,0,a) for a in (-1,1) for b in (-1,1)]
# Dual do antiprisma pentagonal: dez faces planas em pipa.
antiprism = [(math.cos(i*math.pi/5), math.sin(i*math.pi/5), .55 if i%2 == 0 else -.55) for i in range(10)]
shapes = {
    4: [(1,1,1), (1,-1,-1), (-1,1,-1), (-1,-1,1)],
    6: [(x,y,z) for x in (-1,1) for y in (-1,1) for z in (-1,1)],
    8: [(s if a==0 else 0, s if a==1 else 0, s if a==2 else 0) for a in range(3) for s in (-1,1)],
    10: dual(antiprism), 12: dual(ico), 20: ico,
}

groups = []
for kind in (4,6,8,10,12,20,'percent','units'):
    count = 10 if kind in ('percent','units') else kind
    vertices, faces = hull(shapes[count])
    radius = max(v.length for v in vertices)
    vertices = [v * (2 / radius) for v in vertices]
    assert len(faces) == count, (kind, len(faces))
    mesh = bpy.data.meshes.new(f'd{kind}_mesh')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    body = bpy.data.objects.new('DiceBody', mesh)
    bpy.context.collection.objects.link(body)
    for mat in (navy,blue,gold):
        body.data.materials.append(mat)
    for p in mesh.polygons:
        p.material_index = p.index % 2
    bevel = body.modifiers.new('Gold bevel', 'BEVEL')
    bevel.width = .055
    bevel.segments = 3
    bevel.material = 2
    objects = [body]
    # Pares opostos somam N+1 (d4 possui leitura de face na apresentação digital).
    numbers = {}
    remaining = set(range(count))
    for low in range(1, count//2+1):
        first = min(remaining)
        remaining.remove(first)
        opposite = min(remaining, key=lambda i: mesh.polygons[first].normal.dot(mesh.polygons[i].normal))
        remaining.remove(opposite)
        numbers[first], numbers[opposite] = low, count+1-low
    for p in mesh.polygons:
        value = numbers[p.index]
        display = str(value) if kind != 'percent' else f'{(value % 10)*10:02d}'
        if kind == 'units':
            display = str(value % 10)
        n = p.normal.normalized()
        center = p.center.copy()
        rot = n.to_track_quat('Z','Y')
        marker = bpy.data.objects.new(f'Face_{value:02d}', None)
        marker.location = center
        marker.rotation_euler = rot.to_euler()
        # GLTF exporta os eixos em Y-up; estes vetores usam essa mesma base.
        up = rot @ Vector((0,1,0))
        marker['normal'] = [n.x,n.z,-n.y]
        marker['up'] = [up.x,up.z,-up.y]
        bpy.context.collection.objects.link(marker)
        objects.append(marker)
        curve = bpy.data.curves.new(f'Number_{value}', 'FONT')
        curve.body = display
        curve.font = font
        curve.align_x = 'CENTER'
        curve.align_y = 'CENTER'
        curve.size = .60 if count <= 12 else .45
        if len(display) > 1:
            curve.size *= .8
        curve.resolution_u = 4
        curve.extrude = .003
        curve.bevel_depth = .001
        curve.bevel_resolution = 1
        curve.materials.append(cyan)
        obj = bpy.data.objects.new(f'Number_{value:02d}', curve)
        obj.location = center + n*.012
        obj.rotation_euler = rot.to_euler()
        bpy.context.collection.objects.link(obj)
        objects.append(obj)
        if value in (6,9) and kind != 'percent':
            curve.body += '.'
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,f'd{kind}_leo.glb'), export_format='GLB', use_selection=True, export_apply=True, export_extras=True)
    groups.append(objects)
    # Separa os conjuntos para a apresentação.
    for obj in objects:
        obj.location.x += (len(groups)-1)*4.8
        obj.name = f'd{kind}_{obj.name}'

floor_mat = material('Studio', (.014,.023,.035), .1, .6)
bpy.ops.mesh.primitive_plane_add(size=200, location=(14,0,-2.05))
bpy.context.object.data.materials.append(floor_mat)
for pos, power, color in [((8,-8,14),3800,(1,.86,.65)), ((20,5,10),3000,(.4,.8,1))]:
    bpy.ops.object.light_add(type='AREA', location=pos)
    light = bpy.context.object
    light.data.energy = power
    light.data.shape = 'DISK'
    light.data.size = 12
    light.rotation_euler = (Vector((14,0,0))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(16.8,-23,18))
camera = bpy.context.object
camera.rotation_euler = (Vector((16.8,0,0))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 40
scene = bpy.context.scene
scene.camera = camera
scene.world.color = (.12,.12,.12)
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = 1800, 620
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = os.path.join(OUT,'familia_preview.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'familia_reliquia_leo.blend'))
bpy.ops.render.render(write_still=True)
print('Familia gerada:', OUT)
