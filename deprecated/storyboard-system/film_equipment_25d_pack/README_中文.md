# 影视器材 2.5D Asset Pack

这个压缩包面向灯位图 / Previs / 网页 2.5D 编辑器。

## 里面有什么

1. `generated_base_models/`：12 个可直接用的低模 GLB 基础器材（本包生成，作为离线兜底）。
2. `download/`：一键从 3DAssets.dev 官方 API 拉取 **TV Studio and Broadcast Gallery** 的 CC0 模型。
3. `blender/batch_25d.py`：Blender 4.x 批处理，统一为正交、低反射、2.5D 预演风格后重新导出 GLB。
4. `00_reference/`：你提供的灯具参考图。
5. `web/asset_schema.example.json`：网页资产元数据示例。

## 官方网络资产

来源：3DAssets.dev — TV Studio and Broadcast Gallery  
Manifest: https://3dassets.dev/api/v1/packs/tv-studio-and-broadcast-gallery  
Pack: https://3dassets.dev/packs/tv-studio-and-broadcast-gallery  
官方 starter scene: https://cdn.3dassets.dev/assets/35527/v1/model.glb

该包当前为 47 个 GLB，官方标注 CC0 1.0 Universal，可修改、商用和再分发，无需署名。

## Windows 一键下载

在 `download` 目录：

- 右键 PowerShell 运行 `一键下载_核心影视器材.ps1`：只抓摄影机、灯具、灯光控制、录音、监视器等核心器材。
- 运行 `一键下载_全部47件.ps1`：下载完整 47 件。

模型会保存到根目录 `downloaded_cc0_models/`。

## Blender 批量 2.5D

```bash
blender --background --python blender/batch_25d.py -- downloaded_cc0_models processed_25d
```

建议最终网页只加载 GLB；列表缩略图另外预渲染为 WebP。相机保持正交，统一 3/4 角度，材质高 roughness、低 metallic，避免产品渲染感。

## 重要说明

当前 ChatGPT 运行容器无法直接解析外网 CDN 二进制，因此压缩包中的 **官方网络模型本体没有伪装成已下载**；提供的是官方 CC0 一键下载器和完整处理链。`generated_base_models/` 中的 12 件 GLB 是已经包含在压缩包里的、可直接导入网页/Blender 的离线基础模型。
