# VNEXT Save Failure Live Request Capture & Root Cause Analysis

> **Timestamp**: 2026-09-16T07:31:10Z  
> **Environment**: FrameForge Local Production Server (Python 3.14.5 + SQLite + Playwright Browser Automation)  
> **Source Ref**: Section 0A.27 ("当前‘保存失败’必须采集真实 Payload")  
> **Status**: **REPRODUCED & FIXED**

---

## 1. Captured HTTP Request & Response Details

### 1.1 HTTP Transaction
- **Request URL**: `http://127.0.0.1:8080/api/projects/5abd9094-710a-4a51-aedf-7be6c78c8f93/creative-boards`
- **HTTP Method**: `PUT`
- **HTTP Status**: `400 Bad Request`
- **Response Headers**:
  - `Content-Type: application/json; charset=utf-8`
  - `Cache-Control: no-store, no-cache, must-revalidate`

### 1.2 Request JSON Payload
```json
{
  "revision": 1,
  "boards": [
    {
      "id": "ed9761e1-9519-427e-8bb5-96a2284d6f44",
      "kind": "lighting",
      "name": "灯光图 1",
      "width": 1600,
      "height": 1000,
      "shot_ids": [],
      "items": [
        {
          "id": "obj-pegky0nt",
          "type": "light",
          "subtype": "arri_skypanel_x21",
          "x": 80,
          "y": 80,
          "width": 74,
          "height": 34,
          "rotation": 0,
          "label": "ARRI SkyPanel X21",
          "z": 200,
          "beam_spread": 120,
          "beam_length": 380,
          "intensity": 85,
          "temperature": 5600,
          "show_coverage": true,
          "aim_tilt": -45
        }
      ]
    }
  ]
}
```

### 1.3 Response JSON Text
```json
{"error": "item: invalid object or unknown fields"}
```

---

## 2. Root Cause Analysis

1. **Missing `subtype` and V2 Attributes in V1 Item Whitelist**:
   - `creative_boards.py` strictly checked items with `_keys(item, allowed, 'item')`.
   - The allowed keys set did NOT include `subtype`, `v2_identity`, `manufacturer`, `model`, `mount`, `powerW`, or `optic`.
   - When `addPreset()` created an item from a V2 lighting preset (e.g. `arri_skypanel_x21`), it preserved `subtype: "arri_skypanel_x21"`.
   - When saved without explicit `schemaVersion: 2`, `_keys` computed `set(item) - allowed`, which contained `{'subtype'}` and raised `ValueError('item: invalid object or unknown fields')`.

2. **`is_v2` Detection Incomplete**:
   - `creative_boards.py` only detected V2 when `schemaVersion == 2`, `version == 2`, or `'objects' in board`.
   - When a board was dynamically created by `createBoard()` in `static/creative-boards.js` without explicit `schemaVersion: 2`, items with `subtype` were rejected.

3. **Demoted V2 Item Extras Whitelist**:
   - In `creative_boards.py`, `extras - permitted` checked whether `subtype` and lighting metadata were allowed for `LIGHT_TYPES`. Since `subtype` was omitted from `permitted`, it would raise `item: fields are not applicable to type`.

---

## 3. Resolution Applied

1. **`creative_boards.py`**:
   - Updated `is_v2` check to automatically detect lighting boards whose items contain `subtype`:
     ```python
     is_v2 = (kind == 'lighting' and (
         board.get('schemaVersion') == 2 or
         board.get('version') == 2 or
         'objects' in board or
         'scene' in board or
         any('subtype' in item for item in board.get('items', []) if isinstance(item, dict))
     ))
     ```
   - Expanded `_keys` allowed item set to include `subtype`, `v2_identity`, `manufacturer`, `model`, `mount`, `powerW`, `optic`.
   - Expanded `permitted` for `LIGHT_TYPES` to accept and preserve `subtype` and `v2_identity`.

2. **`static/creative-boards.js`**:
   - Updated `createBoard()` to automatically set `schemaVersion: 2` and `objects: []` for lighting boards.
   - Updated `s.snapshot()` to automatically synchronize V2 `objects` and `environment` via `FrameForgeLightingScene.normalizeScene(b)` upon serializing.

---

## 4. Verification & Regression Status

- `tests/test_creative_boards_contract.py`: **7/7 PASS**
- `tests/test_lighting_scene_v2_contract.py`: **3/3 PASS** (100% of presets preserved)
- `tests/lighting_scene_v2_contract_qa.cjs`: **53/53 PASS**
- `tests/lighting_workspace_v8_qa.cjs`: **13/13 PASS** (zero HTTP 400 errors, zero JS exceptions)
