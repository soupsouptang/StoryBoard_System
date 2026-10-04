# ENGINEERING REPLICA 入库报告（2026-09-18）

> 7 个品牌器材 preset 从「共用通用基型冒充」升级为「按真实尺寸程序化生成的专属几何」。
> 分级：**ENGINEERING REPLICA**（不是 DIGITAL TWIN —— 那需要厂商原生 CAD/STEP + IES 光度 + license，本批均不具备）。

## 1. 生产分工
| 角色 | 任务 | 状态 |
|---|---|---|
| general-purpose-3 | 5 盏品牌灯 GLB + spec | ✅ 交付 |
| general-purpose-4 | ALEXA 35 + Avenger C-Stand | ✅ 交付（完成后 429，未能发报告） |
| 团队主代理 | 独立验收 + 入库 + 门禁 + 本报告 | ✅（GP-2 两次 429，由主代理代执行） |

生成器：`film_equipment_25d_pack/generators/{lights,grip-camera}/*.mjs` —— 纯 Node 零依赖，手写 glTF 2.0 二进制（JSON chunk + BIN chunk，4 字节对齐），单位米、Y 向上、原点底部中心。
spec：`film_equipment_25d_pack/metadata/replica_specs/*.json`

## 2. 独立验收（主代理实测，非子代理自述）
- 7 个 GLB magic=glTF、JSON+BIN 完整、**sha256 全不相同**（几何互异，无"改名冒充"）
- bbox 实测对照（cm）：

| preset key | 实测 bbox | 规格（来源分级） |
|---|---|---|
| light/arri_skypanel_x21 | 87.5×57.6×17.8 | 87.5×58.8×17.0（**官方** arri.com，含 yoke） |
| light/aputure_storm_1200x | 33.4×33.6×55.7 | 33.4×33.6×55.7（**官方** aputure.com，含 yoke） |
| light/nanlite_forza_300b_ii | 37.0×24.8×13.5 | 灯头 33×22.8×12.3（**经销商**，官方站 HTTP 500；实测含 yoke 略大） |
| light/nanlite_forza_500b_ii | 45.0×25.3×15.4 | 灯头 40×23×14.2（**经销商**；同上） |
| light/arri_orbiter | 44.0×42.8×33.6 | ~40×40×33（**官方** arri.com tech-specs） |
| camera/arri_alexa_35 | 15×21.5×32.3 | 机身 13.8×15.2×18.8（卡口/重量**官方**，尺寸**项目内部值**；实测含提手/卡口筒/取景器） |
| grip/avenger_a2033f | 68.4×87.7×72.5 | 立杆 84cm + 底座展开 ~95cm（**经销商** Thomann/CameraNordic） |

来源分级字段 `specTier`：`official` ×3、`retailer` ×3、`mixed` ×1 —— ASSET_MAP 里如实标注，未冒充一手来源。

## 3. 入库变更（static/lighting-assets.js）
- 7 条 ASSET_MAP 条目 `glb` 改为专属文件，新增 `replica:true, verifiedSpecs:true, specSource, specTier`
- 保留 `cc0glb` 作为对照引用

### 入库过程中发现并修复的两个运行时 Bug（均由验收暴露）
1. **grip 类型资产静默不加载**：画布对象是 V1 降级形态，`grip→tripod`，精确 key
   `tripod/avenger_a2033f` 查不到 → 返回 null → 不加载。修复：`getAsset()` 增加
   **按 subtype 反查回退**。C-Stand 的 GLB 本身完全正常（GLTFLoader 解析 17 mesh，68×88×73cm）。
2. **replica 几何被 CC0 通用模型顶掉**：`getGLBUrl()` 原逻辑 `return cc0glb || glb`
   —— 优先加载通用货！修复：`replica/twin` 条目强制返回专属 `glb`。
   修复前运行时 `Loaded GLBs=4`（一半在加载通用模型），修复后 **=7**。

## 4. 门禁结果
```
分级统计: replica 7 / cc0 12 / generic 33 / reference 8 / staging 0 / digital_twin 0
tests/asset_gate_qa.cjs → PASS
```
- `digital_twin` 保持 **0**：没有任何资产自称数字孪生（需原生 CAD/STEP + IES + license）
- 对象库徽章：品牌条目 `ENGINEERING REPLICA`，通用条目 `GENERIC REFERENCE`
- 运行时 HUD：Fixtures 7 / Loaded GLBs 7 / Meshes 69，7 个 `glbLoaded:true`
- 截图：`qa-artifacts/replica/replica-all-25d.png`、`replica-all-3d.png`

## 5. 回归
8 个 JS 套件 + 3 个 Python 套件全部 PASS（含本日新增的 aim/height 与 mount/practical 守护测试）。

## 6. 限制与下一步
- 本批几何为程序化拼装（基本体组合），可辨识但非精细外观；达到 `DIGITAL TWIN` 仍需厂商原生 CAD/STEP + IES 光度 + license 三件套
- `specTier: retailer/mixed` 的 4 项如后续拿到官方一手页可升级标注
- 47 个 3DAssets.dev CC0 道具维持 `GENERIC REFERENCE`，禁止冠品牌名
