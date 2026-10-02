"""Reuse Legacy pure parsers in canonical services without its server or DB.

Remove this bridge when the parsers move to a shared package and both runtime
consumers use that package with their existing import/export contracts verified.
"""
from functools import lru_cache
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

@lru_cache(maxsize=3)
def legacy_module(name: str):
    if name not in {'import_parsing', 'narration_timing', 'delivery_exports'}:
        raise ValueError('Unsupported legacy module')
    path = Path(__file__).resolve().parents[4] / 'storyboard-system' / f'{name}.py'
    spec = spec_from_file_location(f'frameforge_legacy_{name}', path)
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
