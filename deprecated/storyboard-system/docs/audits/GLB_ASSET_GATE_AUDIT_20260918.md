# GLB 资产门禁真实性审查报告

- **审查日期**：2026-09-18
- **审查对象**：FRAMEFORGE 灯光模块器材资产目录与 GLB 运行时门禁
- **审查方式**：只读 + 实测（未修改任何源码/配置）。本地服务 `http://127.0.0.1:18799`，Node 脚本实测 HTTP，Playwright 实测灯光平面图「对象库」徽章与 `getAssetStatus` 运行时行为。
- **依据**：项目文档 0A.36 / 0A.37 / P0_REOPEN 5.5（DIGITAL TWIN 仅可用于通过门禁的资产；未过门禁必须显示 STAGING；47 个 CC0 通用道具只能标 `generic_reference`；禁止「通用 Fresnel 改名成 ARRI Orbiter」）。

---

## 一、磁盘资产清点（实测 `static/assets/glb/`）

共 **59** 个文件，与磁盘完全一致：
- **47** 个 3DAssets.dev CC0 通用演播室道具，文件名形如 `35xxx_…_TV_Studio_and_Broadcast_Gallery_.glb`（电视剧场/广播通用件，非任何品牌真品）。
- **12** 个程序生成占位模型：`camera_cinema_tripod / camera_director_monitor / camera_slider / grip_c_stand / grip_flag_stand / grip_sandbag / light_fresnel_stand / light_led_panel_stand / light_softbox_stand / modifier_reflector_board / set_apple_box / sound_boom_mic`。
- **0** 个真实品牌型号 GLB（磁盘上没有任何 ARRI / Aputure / Nanlite / Avenger 真品模型）。

结论：磁盘上**不存在**任何真实的品牌 digital twin 模型，所谓「品牌资产」全部由通用/CC0 模型顶替。

---

## 二、GLB 运行时可达性（实测，对 `http://127.0.0.1:18799/assets/glb/<file>` 发起 GET）

`ASSET_MAP` 共 **60** 条；其中 **52** 条引用 GLB，**8** 条 `glb:null`（演员×3、床、承重柱、标注×3，按设计无 3D 模型）。

**总表（按 preset 分组）**

| 分组 | 条目 | GLB 200 | 404 |
|------|-----:|--------:|----:|
| light | 12 | 12 | 0 |
| modifier | 7 | 7 | 0 |
| camera | 9 | 9 | 0 |
| actor | 3 | 0 | 0 |
| grip | 7 | 7 | 0 |
| sound | 1 | 1 | 0 |
| furniture | 9 | 8 | 0 |
| architecture | 8 | 7 | 0 |
| annotation | 4 | 1 | 0 |
| **合计** | **60** | **52** | **0** |

**404 明细表**：**无**（0 条）。所有被引用的 GLB 均返回 HTTP 200，文件可用性不是门禁瓶颈。

---

## 三、徽章语义（Playwright 实测灯光平面图「对象库」材质卡片）

库内材质卡片徽章（资产未放置、未运行时验证时）实测结果：
- **7 个品牌条目** → 均显示 **`Staging`**（正确，未通过运行时验证，未冒用 DIGITAL TWIN）。
- CC0 条目 → `CC0 Studio`；通用生成条目 → `Generic 3D`。

库内**无**「应降级为 STAGING 却显示 DIGITAL TWIN」的错误（404 实测也为 0，故该特定失败模式不发生）。

---

## 四、冒充 / 误标清单（核心问题）

门禁函数 `getAssetStatus`（lighting-assets.js:402）与 3D 选中 HUD（lighting-render.js:1451）仅以 `glbLoaded && meshCount>0` 判定 DIGITAL TWIN，**不校验 license / metadata / 品牌一致性**。Playwright 实测：7 个品牌条目在其通用/CC0 GLB 加载后，状态一律由 `staging` 升为 `digital_twin`，放置后 HUD 显示 `DIGITAL TWIN VERIFIED`——即把通用模型冒充为品牌 digital twin。

| 条目(type/subtype) | 铭牌(zh) | 实际加载模型(文件名) | 模型性质 |
|---|---|---|---|
| light/arri_skypanel_x21 | ARRI SkyPanel X21 | 35504_Softbox_Panel_Light…glb | 通用柔光箱面板(CC0) |
| light/aputure_storm_1200x | Aputure STORM 1200x | 35501_Barn_Door_Spot…glb | 通用遮扉聚光(CC0) |
| light/nanlite_forza_300b_ii | Nanlite Forza 300B II | 35501_Barn_Door_Spot…glb | 通用遮扉聚光(CC0) |
| light/nanlite_forza_500b_ii | Nanlite Forza 500B II | 35501_Barn_Door_Spot…glb | 通用遮扉聚光(CC0) |
| light/arri_orbiter | ARRI Orbiter | 35502_Fresnel_Lamp_on_a_Hook_Clamp…glb | 通用菲涅尔灯(CC0) |
| camera/arri_alexa_35 | ARRI ALEXA 35 | 35497_Shoulder_Camera_on_a_Tripod…glb | 通用肩扛摄影机(CC0) |
| grip/avenger_a2033f | Avenger C-Stand 33" | grip_c_stand.glb | 程序生成通用 C 架 |

最典型即「通用菲涅尔灯改名成 ARRI Orbiter」——直接违反 P0_REOPEN 5.5 明令禁止的模式。

> 注：47 个 CC0 道具本身未被错误冠以品牌名（其字符段为通用中文名），问题出在上面的 7 个品牌条目**借用**通用/CC0 模型并冠以品牌铭牌。

---

## 五、结论

**未达 Production Gate。** 缺三项：

1. **真实品牌 GLB 缺失**：7 个品牌条目背后均为通用/CC0 或生成模型，磁盘上无任何品牌真品模型，却挂品牌铭牌并能在运行时拿到 DIGITAL TWIN 徽章。
2. **门禁语义缺陷**：DIGITAL TWIN 仅校验「GLB 是否加载 + 网格数>0」，未按要求校验 license、metadata 有效性与品牌一致性（`verified_seed_catalog.json` / `asset.schema.json` 已定义 `asset_level: digital_twin` 与 license 字段，但 `getAssetStatus` / HUD 均未引用）。
3. **缺少 manufacturer↔模型一致性交叉校验**：只要有 `manufacturer` 字段且 GLB 加载成功即升级为 digital twin，通用模型因此被冒用。

**建议（达到门禁所需）**：
- 为 7 个品牌条目取得合规授权的真实数字孪生模型，或将这 7 处品牌铭牌移除、降级为 `generic_reference`；
- 在 `getAssetStatus` 中引入 license + metadata 校验与 manufacturer/模型来源一致性校验，校验通过前只显示 `STAGING`；
- 维持 47 个 CC0 道具仅作为 `generic_reference`，禁止被重命名为品牌型号。
