"""Portable rich-text runs. HTML, URLs and arbitrary CSS are never persisted."""
import json

TEXT_FIELDS = {'title', 'scene', 'description', 'voiceover', 'action', 'performance', 'composition', 'director_notes', 'notes', 'dialogue', 'subtitle', 'music', 'sound'}
SIZES = {10, 12, 14, 16, 18, 20, 24, 28, 32}
COLORS = {'yellow', 'green', 'blue', 'pink'}


def normalize_rich_text(value, shot):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (TypeError, ValueError):
            return {}
    if not isinstance(value, dict):
        return {}
    result = {}
    for field, runs in value.items():
        if field not in TEXT_FIELDS or not isinstance(runs, list) or len(runs) > 10000:
            continue
        clean = []
        total = 0
        for run in runs:
            if not isinstance(run, dict) or not isinstance(run.get('text'), str):
                continue
            item = {'text': run['text'][:10000]}
            total += len(item['text'])
            if total > 10000:
                clean = []
                break
            for key in ('bold', 'italic', 'underline'):
                if run.get(key) is True:
                    item[key] = True
            size = run.get('size')
            if isinstance(size, (int, float)) and not isinstance(size, bool) and size in SIZES:
                item['size'] = size
            color = run.get('highlight')
            if isinstance(color, str) and color in COLORS:
                item['highlight'] = color
            clean.append(item)
        # Stale marks must never replace newer text edited in another surface.
        if ''.join(run['text'] for run in clean) == str(shot.get(field) or '')[:10000]:
            result[field] = clean
    return result
