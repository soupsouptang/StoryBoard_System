# Master → Runtime GLB 管线

## A. 厂家 CAD
STEP/STP/DWG/DXF
→ CAD importer
→ 删除内部不可见机械细节
→ 修复法线 / 合并重复件
→ 识别可动轴与附件安装面
→ 统一 meter / +Y up / +Z forward
→ 建立 anchor nodes
→ LOD0
→ LOD1
→ LOD2
→ glTF/GLB

## B. 无 CAD 产品
官方 dimensions + manual + orthographic product views
→ Engineering Replica
→ 尺寸校验
→ 关键结构校验
→ 同样进入 LOD 管线

## C. 2.5D Render Preset
正交相机，不修改真实几何比例：
- yaw 35°–40°
- pitch 20°–25°
- roll 0°
- 软环境光
- 轻 AO / contact shadow
- 无 DOF
- 无 Bloom
- 简化材质高光

## D. 网页运行时
Asset Browser 只加载 thumbnail + metadata。
真正 GLB 在：
- 用户拖入场景
- 或进入近距离详情
时才加载。

复杂器材默认 LOD1；
镜头拉远 / 设备数量升高时切 LOD2；
选中器材或近距离查看时切 LOD0。
