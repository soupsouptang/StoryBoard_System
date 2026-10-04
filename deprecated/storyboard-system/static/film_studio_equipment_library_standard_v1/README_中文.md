# Film Studio Equipment Library Standard v1

这是“真实摄影棚器材库”第一版工程标准包，不是模型成品包。

它解决的是：后续每一个 ARRI / Aputure / Nanlite / Avenger / Camera / Grip 资产应该用什么坐标、尺寸、LOD、Anchor、附件接口和 QA 规则进入网页。

## 包含
- `schema/asset.schema.json`：正式资产 JSON Schema
- `catalog/verified_seed_catalog.json`：第一批已核对官方数据的种子目录
- `docs/STANDARD_中文.md`：完整资产标准
- `docs/PIPELINE_中文.md`：CAD → GLB → 2.5D Runtime 管线
- `docs/OFFICIAL_SOURCES.md`：厂家公开资料索引
- `examples/`：Orbiter / SkyPanel X21 / STORM / Forza / A2033F 的 asset.json 模板
- `scripts/validate_asset.py`：最基础的资产 QA 校验

下一步应该在这个标准上开始真正 ingest：
1. ARRI Orbiter 官方 STP
2. SkyPanel X Technical Information
3. STORM 1200x IES
4. Nanlite / Avenger 工程重建
