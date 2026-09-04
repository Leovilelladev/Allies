import bpy
import math
import os
from mathutils import Vector


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(ROOT, "public", "models")
BLEND_PATH = os.path.join(OUT_DIR, "d20_allies_leo.blend")
GLB_PATH = os.path.join(OUT_DIR, "d20_allies_leo.glb")
PREVIEW_PATH = os.path.join(OUT_DIR, "d20_allies_leo_preview.png")


def material(name, color, metallic=0.0, roughness=0.45):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
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

navy = material("Allies Navy", (0.018, 0.055, 0.12), metallic=0.55, roughness=0.24)
gold = material("Allies Gold", (0.82, 0.57, 0.16), metallic=0.72, roughness=0.2)
floor_mat = material("Studio", (0.012, 0.018, 0.035), metallic=0.0, roughness=0.7)

bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=2.0, location=(0, 0, 0))
die = bpy.context.object
die.name = "D20_Allies_Leo"
die.data.materials.append(navy)

bevel = die.modifiers.new("Soft Edges", "BEVEL")
bevel.width = 0.075
bevel.segments = 3

numbering = opposite_numbering(die.data.polygons)
number_objects = []

for polygon in die.data.polygons:
    number = numbering[polygon.index]
    normal = polygon.normal.normalized()
    center = polygon.center + normal * 0.035

    bpy.ops.object.text_add(location=center)
    text = bpy.context.object
    text.name = f"Face_{number:02d}"
    text.data.body = str(number)
    text.data.align_x = "CENTER"
    text.data.align_y = "CENTER"
    text.data.size = 0.34 if number < 10 else 0.28
    text.data.extrude = 0.018
    text.data.bevel_depth = 0.006
    text.data.bevel_resolution = 2
    text.data.materials.append(gold)
    text.rotation_euler = normal.to_track_quat("Z", "Y").to_euler()
    number_objects.append(text)

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
