"""Importa o PDF oficial do SRD 5.2.1. Requer pypdf; não faz acesso à rede."""
import hashlib
import json
import re
import sys
from pathlib import Path
from pypdf import PdfReader

source = Path(sys.argv[1])
target = Path(sys.argv[2])
reader = PdfReader(source)
assert len(reader.pages) == 364, 'Confira a edição do PDF antes de importar'
chunks = []
for number, page in enumerate(reader.pages, 1):
    if number < 5:
        continue  # licença e sumário ficam separados da busca
    text = page.extract_text()
    text = re.sub(r'^System Reference Document 5\.2\.1\s*\d+\s*', '', text)
    text = re.sub(r'(\w)\s*-\s*\n\s*(\w)', r'\1\2', text)
    text = re.sub(r'[ \t]+', ' ', text).strip()
    for start in range(0, len(text), 1700):
        part = text[start:start + 2200]
        if not part.strip():
            continue
        chunks.append({'id': f'srd-{number}-{start // 1700}', 'pagina': number, 'texto': part})
result = {
    'versao': '5.2.1', 'idioma': 'en', 'paginas': len(reader.pages),
    'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'url': 'https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf',
    'trechos': chunks,
}
target.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
print(f'{len(chunks)} trechos; {target.stat().st_size} bytes; SHA256 {result["sha256"]}')
