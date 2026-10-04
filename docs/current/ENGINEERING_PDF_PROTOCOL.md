> **范围：当前版本记录/合同。** 旧功能基线无效；正文中的来源、实现状态及验收仅对应注明提交。下一代不继承旧实现或 UI；当前任务不得按历史待办自动执行。

# 工程 PDF 与 QR / Data Matrix 数据协议（设计）

状态：待实现与文件往返验收。用户授权自行确定码内数据；默认多片 QR 排成堆叠网格，可选 Data Matrix ECC200。此处“堆叠”是多个二维符号的排版，不指 PDF417，也不把原生 Structured Append 当成无限容量。

## 可打开的工程包

默认 `.frameforge.zip`：`manifest.json`、`project.json`、`media/<sha256>.<ext>`、`previews/`。JSON 为 UTF-8、有 schemaVersion；目录无需专有软件即可查看。PDF 通过 EmbeddedFiles/Associated Files 附带同一包，码页提供离线工程数据恢复路径。读取附件优先；查看器不支持附件时使用独立 ZIP 或扫码导入。

码内包含：schemaVersion、exportId、工程逻辑 ID、导出时间、标题/FPS/画幅、按允许导出字段裁剪的列定义与值、镜头顺序与时码、关联画板对象、媒体哈希/尺寸/裁剪参数、共享视图、必要版本引用、校验信息。原图大文件在附件；扫码恢复后明确列出缺失媒体引用。密码、账号凭据、分享 token、部署地址及未获准字段不得出现在码、附件或历史引用中。

## 分片格式 v1

每个码 UTF-8 文本帧：

```text
FFP1:<codec>:<bundleId>:<index>/<count>:<crc32>:<base45Payload>
```

- `codec` 为 `deflate-json`，`index` 从 0 起。码种只影响渲染，不影响帧协议。
- 工程 JSON 规范化后 UTF-8 编码并 DEFLATE 压缩；压缩流分片，再逐片 Base45 编码。全部码重复同一 bundleId/count；CRC32 针对该片原始压缩字节。
- 清单单独定义整体压缩长度、解压长度、压缩/原文 SHA256、schemaVersion、签名算法/公钥标识与签名。签名覆盖版本、exportId、长度和整体哈希；可采用 Ed25519。签名证明完整性/来源，不提供加密，也不是隐写水印。
- 分片可乱序扫描、去重；重复同序号但内容不同立即冲突。缺片提示缺少序号，允许补扫；全片齐备后先验长度/哈希/签名，再限额解压及 schema 验证，不能自动写入项目。
- 进入与 Excel/PDF 导入一致的 staging 流程：识别字段 → 映射 → 预览 → 添加/覆盖 → 原子提交。新项目重新映射内部 ID 并保留关系；覆盖指定项目必须检查权限与 revision。

QR/DM 原生 Structured Append 均最多 16 个符号；大于 16 片使用上述应用层协议，必须由 FrameForge 解码器重组，不能宣称普通扫码器会自动复原。参见 [Segno Structured Append](https://segno.readthedocs.io/en/latest/structured-append.html)、[Zint Data Matrix](https://zint.org.uk/manual/chapter/6/)。

## 打印与扫描预检

黑白矢量符号，QR 保留 4-module quiet zone；DM 保留对应符号规范 quiet zone。码下仅标工程包编号/片号/总片数与校验摘要，不写免责声明。二维码区域不叠可见/隐写图案；隐写作用于页面正文图像和工程媒体。

首轮候选 QR 纠错 Q、每片压缩字节约 600、模块边长至少 0.4mm；这是待基准测试参数，不是未经测量的容量保证。生成器根据实际帧长度算 symbol/module/page 尺寸，超限拆片/增加码页。DM 使用 ECC200 并独立测量印刷密度和解码器支持。

初始防耗尽限额建议：压缩 2MiB、解压 20MiB、最多 256 片；导出时预检页数和体积，过大用完整附件包并提示选择字段/范围，不静默截断。导入限制包路径穿越、重复项、解压比、对象数量及 schema 版本。

验收：原 PDF、打印/照片、乱序/重复/缺片、CRC/整包哈希失败、16片边界、QR与DM、缺媒体、工程包 schema version 升级/Legacy exporter mapping、字段裁剪、添加/覆盖回滚。保留实测设备/距离/照度/误读与成功率；工程包大小和原图完整性另核。

PDF 附件标准参考 [PDF Association: Files inside PDF](https://pdfa.org/files-inside-pdf/)。不可见水印的裁剪/截图抵抗试验按功能计划单列；协议校验不能替代水印的识别实验。
