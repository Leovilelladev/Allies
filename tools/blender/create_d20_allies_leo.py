import bpy
import math
import os
from mathutils import Vector


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(ROOT, "public", "models")
VARIANT = os.environ.get("D20_VARIANT", "v1").lower()
SUFFIX = f"_{VARIANT}" if VARIANT != "v1" else ""
BLEND_PATH = os.path.join(OUT_DIR, f"d20_allies_leo{SUFFIX}.blend")
GLB_PATH = os.path.join(OUT_DIR, f"d20_allies_leo{SUFFIX}.glb")
PREVIEW_PATH = os.path.join(OUT_DIR, f"d20_allies_leo{SUFFIX}_preview.png")


def material(name, color, metallic=0.0, roughness=0.45, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def opposite_numbering(polygons):
    remaining = set(range(len(polygons)))
    pairs = []
    while remaining:
        first = min(remaining)
        remaining.remove(first)
        opposite = min(remaining, key=lambda index: polygons[first].normal.dot(polygons[index].normal))
        remaining.remove(opposite)
        pairs.append((first, opposite))

    numbering = {}
    for low, (first, opposite) in enumerate(pairs, start=1):
        numbering[first] = low
        numbering[opposite] = 21 - low
    return numbering


os.makedirs(OUT_DIR, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

PALETAS = {
    "v1": ((0.018, 0.055, 0.12), (0.82, 0.57, 0.16), (0.018, 0.055, 0.12)),
    "v2": ((0.012, 0.075, 0.145), (0.95, 0.62, 0.12), (0.025, 0.18, 0.28)),
    "v3": ((0.105, 0.018, 0.22), (0.96, 0.63, 0.12), (0.02, 0.62, 0.78)),
    "v4": ((0.006, 0.018, 0.045), (0.08, 0.74, 0.9), (0.9, 0.54, 0.08)),
    "v5": ((0.018, 0.105, 0.24), (0.98, 0.68, 0.14), (0.55, 0.18, 0.72)),
    "v6": ((0.004, 0.014, 0.035), (0.06, 0.72, 0.88), (0.92, 0.57, 0.1)),
}
cor_corpo, cor_numero, cor_aresta = PALETAS.get(VARIANT, PALETAS["v2"])
navy = material(f"Allies Body {VARIANT.upper()}", cor_corpo, metallic=0.48 if VARIANT == "v6" else 0.44, roughness=0.22 if VARIANT == "v6" else 0.3)
gold = material(
    f"Allies Numbers {VARIANT.upper()}", cor_numero, metallic=0.72 if VARIANT == "v6" else 0.82, roughness=0.2,
    emission=cor_numero if VARIANT == "v6" else None,
    emission_strength=0.32 if VARIANT == "v6" else 0.0,
)
edge = material(f"Allies Edges {VARIANT.upper()}", cor_aresta, metallic=0.7, roughness=0.2)
body_alt = material("Allies Body V6 Facets", (0.008, 0.035, 0.072), metallic=0.4, roughness=0.27) if VARIANT == "v6" else None
floor_mat = material("Studio", (0.012, 0.018, 0.035), metallic=0.0, roughness=0.7)

bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=2.0, location=(0, 0, 0))
die = bpy.context.object
die.name = "D20_Allies_Leo"
die.data.materials.append(navy)
if body_alt:
    die.data.materials.append(body_alt)
die.data.materials.append(edge)
if VARIANT == "v6":
    for polygon in die.data.polygons:
        polygon.material_index = polygon.index % 2

bevel = die.modifiers.new("Soft Edges", "BEVEL")
bevel.width = 0.065 if VARIANT == "v6" else (0.095 if VARIANT in ("v3", "v4", "v5") else (0.11 if VARIANT == "v2" else 0.075))
bevel.segments = 4 if VARIANT in ("v3", "v4", "v5", "v6") else (5 if VARIANT == "v2" else 3)
if VARIANT in ("v3", "v4", "v5", "v6"):
    bevel.material = 2 if VARIANT == "v6" else 1

numbering = opposite_numbering(die.data.polygons)
number_objects = []
face_info = {}

for polygon in die.data.polygons:
    number = numbering[polygon.index]
    normal = polygon.normal.normalized()
    face_info[number] = (polygon.center.copy(), normal.copy())
    center = polygon.center + normal * (0.012 if VARIANT != "v1" else 0.035)

    bpy.ops.object.text_add(location=center)
    text = bpy.context.object
    text.name = f"Face_{number:02d}"
    text.data.body = str(number)
    text.data.align_x = "CENTER"
    text.data.align_y = "CENTER"
    if VARIANT == "v6":
        text.data.font = bpy.data.fonts.load("C:\\Windows\\Fonts\\georgiab.ttf") if "Georgia Bold" not in bpy.data.fonts else bpy.data.fonts["Georgia Bold"]
    text.data.size = (0.45 if number < 10 else 0.36) if VARIANT == "v6" else ((0.42 if number < 10 else 0.34) if VARIANT != "v1" else (0.34 if number < 10 else 0.28))
    text.data.extrude = 0.004 if VARIANT == "v6" else (0.008 if VARIANT != "v1" else 0.018)
    text.data.bevel_depth = 0.003 if VARIANT != "v1" else 0.006
    text.data.bevel_resolution = 3 if VARIANT != "v1" else 2
    text.data.materials.append(gold)
    text.rotation_euler = normal.to_track_quat("Z", "Y").to_euler()
    number_objects.append(text)

# A edição Constelação ganha pequenos glifos de estrela em cinco faces.
if VARIANT == "v5":
    for number in (1, 5, 10, 15, 20):
        face_center, normal = face_info[number]
        rotacao = normal.to_track_quat("Z", "Y")
        deslocamento = rotacao @ Vector((0, -0.34, 0))
        vertices = []
        for i in range(10):
            angulo = math.pi / 2 + i * math.pi / 5
            raio = 0.095 if i % 2 == 0 else 0.04
            vertices.append((math.cos(angulo) * raio, math.sin(angulo) * raio, 0))
        mesh = bpy.data.meshes.new(f"StarMesh_{number:02d}")
        mesh.from_pydata(vertices, [], [list(range(10))])
        star = bpy.data.objects.new(f"Glifo_Estrela_{number:02d}", mesh)
        bpy.context.collection.objects.link(star)
        star.location = face_center + normal * 0.018 + deslocamento
        star.rotation_euler = rotacao.to_euler()
        star.data.materials.append(gold)
        number_objects.append(star)

# Um pequeno ponto diferencia 6 de 9.
for number in (6, 9):
    source = next(obj for obj in number_objects if obj.name == f"Face_{number:02d}")
    local_down = source.rotation_euler.to_matrix() @ Vector((0, -0.22, 0))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.035, location=source.location + local_down)
    dot = bpy.context.object
    dot.name = f"Marcador_{number:02d}"
    dot.data.materials.append(gold)
    number_objects.append(dot)

# Piso e estúdio para a prévia.
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -2.25))
floor = bpy.context.object
floor.name = "Preview_Floor"
floor.data.materials.append(floor_mat)

bpy.ops.object.light_add(type="AREA", location=(4.5, -4.0, 6.0))
key = bpy.context.object
key.name = "Preview_Key"
key.data.energy = 1050
key.data.shape = "DISK"
key.data.size = 4.0
key.data.color = (1.0, 0.72, 0.38)
look_at(key, (0, 0, 0))

bpy.ops.object.light_add(type="AREA", location=(-4.0, -1.5, 2.5))
fill = bpy.context.object
fill.name = "Preview_Fill"
fill.data.energy = 800
fill.data.size = 3.0
fill.data.color = (0.1, 0.55, 1.0)
look_at(fill, (0, 0, 0))

bpy.ops.object.light_add(type="AREA", location=(0.5, 4.0, 4.0))
rim = bpy.context.object
rim.name = "Preview_Rim"
rim.data.energy = 900
rim.data.size = 2.5
rim.data.color = (0.18, 0.8, 0.9)
look_at(rim, (0, 0, 0))

bpy.ops.object.camera_add(location=(5.9, -6.6, 4.8))
camera = bpy.context.object
camera.name = "Preview_Camera"
camera.data.lens = 58
look_at(camera, (0, 0, -0.15))
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = True
scene.render.filepath = PREVIEW_PATH
scene.world.color = (0.005, 0.008, 0.018)

bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

# Exporta somente o dado e seus números; luzes e cenário ficam no .blend.
bpy.ops.object.select_all(action="DESELECT")
die.select_set(True)
for obj in number_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = die
bpy.ops.export_scene.gltf(
    filepath=GLB_PATH,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
)

bpy.ops.render.render(write_still=True)
print(f"BLEND={BLEND_PATH}")
print(f"GLB={GLB_PATH}")
print(f"PREVIEW={PREVIEW_PATH}")
