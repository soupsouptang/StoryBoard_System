# 真实摄影棚器材库标准 v1

目标不是“影视器材图标包”，而是可以进入灯位图、技术勘景、Previs、器材清单和网页实时场景的 **Film Production Equipment Digital Twin Library**。

## 1. 资产等级

### Digital Twin
优先来源于厂家公开 CAD / STEP / STP / DWG / DXF / Technical Drawing / IES / GDTF。
几何尺寸、安装点、旋转轴和附件接口都以工程资料为依据。

### Engineering Replica
厂家没有公开 CAD，但有完整尺寸、技术手册、产品照片和光度资料。
允许人工重建，但必须记录来源与待验证项目。

### Generic Reference
仅用于临时场景和示意，不进入正式器材库核心目录。

## 2. 坐标标准

- 单位：meter
- Up：+Y
- Forward：+Z
- 真实设备不得靠整体 Scale 模拟高度或附件尺寸
- 落地设备 Root：floor projection center
- 灯头 Root：mount center
- 摄影机需额外提供 OPTICAL_CENTER 与 IMAGE_PLANE
- 灯具需提供 EMITTER 与 LIGHT_AXIS

## 3. 模型层级

灯具最低要求：
ROOT / YOKE_PAN / YOKE_TILT / FIXTURE / FRONT_ACCESSORY / EMITTER / LIGHT_AXIS

摄影机最低要求：
ROOT / BODY / LENS / MATTE_BOX / FOLLOW_FOCUS / RAILS / MONITOR / BATTERY /
OPTICAL_CENTER / IMAGE_PLANE

C-Stand / Combo 最低要求：
ROOT / BASE / RISER_01 / RISER_02 / PIN / GRIP_HEAD / GRIP_ARM

## 4. LOD

- Master：CAD 或高精度源，不直接进入网页
- LOD0：近距离选中查看，通常 20k–100k triangles
- LOD1：常规场景，8k–30k
- LOD2：大型灯位图，2k–8k
- Thumbnail：独立 WebP/PNG，不从 GLB 每次现算

对于复杂 Hero Asset 可以超过上述范围，但必须有实际性能测试。

## 5. 材质

统一 runtime 材质：
MAT_Black / MAT_Dark / MAT_Metal / MAT_White /
MAT_Fabric / MAT_Diffusion / MAT_Glass / MAT_Accent

正式网页版本默认去品牌字样、序列号和不必要贴纸。
品牌型号可以保留在 metadata，而不是依赖 Mesh 上 Logo 识别。

## 6. Attachment System

核心接口：
- stand_baby_16mm
- stand_junior_28mm
- bowens
- prolock_bowens
- arri_qlm
- quarter_20
- three_eighth_16
- 15mm_lws
- 19mm_studio
- grip_head
- frame_ear

附件必须通过兼容性规则挂载，而不是任意吸附。

## 7. 灯光数据

灯具资产可包含：
- IES / LDT
- GDTF
- CCT
- Beam Angle
- Emitter Node
- Light Axis
- Power
- DMX / Art-Net / sACN 能力（作为扩展 metadata）

Beam Cone 是视图层，不写死进 Mesh。

## 8. QA Gate

正式资产必须至少通过：
1. Dimensions
2. Pivot
3. Anchors
4. Articulation
5. Web Load
6. Thumbnail
7. License

任何一项 Pending 都不进入 `production` catalog。

## 9. 第一批 Hero Asset 顺序

1. ARRI Orbiter
2. ARRI SkyPanel X21
3. Aputure STORM 1200x Cine Kit
4. Nanlite Forza 300B II
5. Nanlite Forza 500B II
6. Nanlite Rapid 120
7. Avenger A2033F
8. D200 Grip Head
9. D520 Grip Arm
10. 4×4 Flag
11. 4×4 Diffusion Frame
12. Combo Stand

这批完成后，再进入 Camera / Dolly / Jib / Sound Cart。
