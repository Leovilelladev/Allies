# Modelos 3D do Allies

Família ativa no VTT: `reliquia_leo/` (Relíquia Refinada), com d4, d6, d8, d10, d12, d20 e d100.
O d100 usa dois modelos d10: `dpercent_leo.glb` (dezenas) e `dunits_leo.glb` (unidades); `00 + 0 = 100`.
O d4 usa um número por face voltada à câmera, uma convenção digital, em vez dos três números por face de um d4 tradicional.

Fonte editável: `reliquia_leo/familia_reliquia_leo.blend`; prévia: `reliquia_leo/familia_preview.png`.
Os GLBs incluem `DiceBody` e marcadores `Face_XX` com normal e orientação para exibir o resultado legível.

Para regenerar a família:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python-exit-code 1 --python tools/blender/create_dice_set_leo.py
```

Validação: `npm test` verifica os modelos e a conversão de resultados; `npm run build` valida o bundle.
Teste no VTT: `/r 1d4+1d6+1d8+1d10+1d12+1d20` e `/r 1d100`.
O limite visual é de 20 modelos por rolagem; o total do chat continua completo.

Fluxo de colaboração: manter alterações locais para revisão conjunta e só fazer push ou deploy com autorização explícita.

## D20 anterior (preservado)

Modelo anterior: `d20_allies_leo_v6.glb` (Relíquia Refinada).
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
