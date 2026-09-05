# Modelos 3D do Allies

Modelo ativo no VTT: `d20_allies_leo_v6.glb` (Relíquia Refinada).
Fonte: `d20_allies_leo_v6.blend`; prévia: `d20_allies_leo_v6_preview.png`.
Para regenerar a V6, defina `$env:D20_VARIANT='v6'` antes do comando abaixo.
O gerador usa Georgia Bold de `C:\Windows\Fonts\georgiab.ttf` para esta versão.
As propostas V7 são apenas sugestões e ainda não foram implementadas.

- `d20_allies_leo.blend`: fonte editável do dado e cena de prévia.
- `d20_allies_leo.glb`: modelo otimizado para integração web.
- `d20_allies_leo_preview.png`: render de conferência.

Para regenerar:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python tools/blender/create_d20_allies_leo.py
```
