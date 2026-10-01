# FRAMEFORGE OS · 专业影视分镜与镜头制作管理系统

> **Master Specification V1.0 Implementation Ready**  
> 单公司私有部署、以 Shot 为核心、面向专业影视管线的分镜、镜头规划、制作方式管理、素材版本、审片审批与交付平台。

---

## 🌟 核心特性 (Key Features)

1. **Shot = Single Source of Truth**：所有视图（分镜卡片板、视觉墙、镜头制作表、时间线、审片审批、工程导出）共享单一镜头实体，杜绝数据孤岛与重复修改。
2. **SMPTE 帧级精确时码引擎**：支持 `23.976`、`24`、`25`、`29.97 DF/NDF`、`30`、`48`、`50`、`59.94`、`60` fps；基于整数帧存储，零浮点累计漂移。
3. **智能旁白计时算法 (VO Auto-Timing)**：基于中英文文字量与标点停顿权重（逗号 `+8f`、句号 `+16f`、省略号 `+14f`），通过最大余数法自动平衡总片长，严格保护锁定镜头。
4. **制作方式精细化管理 (Production Method)**：实拍 (LIVE)、购买素材 (STOCK)、客户素材 (CLIENT)、历史资料 (ARCHIVE)、静帧 (STILL)、AE合成 (AE)、MG动效 (MG)、3D三维 (3D)、视效 (VFX)、字卡 (TYPE)。
5. **智能 Excel/CSV 导入引擎**：多工作表智能探测，支持别名词典模糊匹配、匹配置信度指示、导入前 Diff 预览与冲突检测。
6. **工业级多格式工程导出**：一键导出 CMX 3600 EDL (DaVinci/Premiere)、OpenTimelineIO (`.otio`)、SubRip (`.srt`) 旁白字幕及 Excel 制作表。
7. **不可猜测 Token 匿名审片分享**：免登录访客只读审片页面 (`/share/[token]`)，包含剧场预览监视器、分镜画册 (Cards) 与全片视觉墙 (Wall) 切换、一键打包下载及随时撤销。
8. **内外网分离与零数据驻留 (Zero-Residency)**：外网节点仅部署静态应用壳与 L4 TLS Passthrough 密文转发，全量业务数据、账号权限及媒体代理均位于公司内网。
9. **离线设计体系与排版**：100% 离线内嵌 Google Material Symbols SVG Sprite 注册表，采用更纱黑体 (Sarasa Gothic) 等宽数字排版，DaVinci Resolve / Linear 暗黑专业影视调色台风格。
10. **可插拔 AI Provider 契约层**：当前部署 100% 零 AI 运行与依赖，通过标准化 Provider 契约预留未来剧本拆镜、语音对齐等扩展。

---

## 🏗️ 架构与技术栈

```text
/
├── apps/
│   ├── web/                     # Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Zustand
│   ├── api/                     # FastAPI (Python 3.12+), SQLAlchemy 2, Pydantic v2, Argon2id, JWT
│   └── worker/                  # Redis + RQ Background Worker for async exports & media processing
│
├── packages/
│   ├── timecode/                # SMPTE Frame-accurate Engine & VO Auto-Timing
│   ├── types/                   # Domain TypeScript definitions (Production, Shot, Panel, Asset)
│   ├── ui/                      # Design tokens, Sarasa Gothic, Google Icon Sprite, i18n
│   └── contracts/               # Standard API Error formats & AI Provider contracts
│
├── infra/
│   ├── docker/                  # Production Dockerfiles (api, web, worker)
│   └── nginx/                   # Zero-residency external gateway & internal server configs
│
└── tests/                       # Complete automated unit & integration test suites
```

---

## 🚀 快速上手 (Quick Start)

### 方式 1：Docker Compose 生产编排（推荐）
```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 启动所有容器服务
docker compose up -d

# 3. 访问应用
# 前端工作台: http://localhost:3000
# 后端 API 文档: http://localhost:8000/docs
```

### 方式 2：单机独立模式 (Standalone Mode)
```bash
# 启动独立轻量服务 (端口 8080)
python storyboard-system/server.py
```

### 默认登录凭证
* **管理员邮箱**: `admin@company.internal`
* **管理员密码**: `FrameForge2026!Admin`
* **预载示范项目**: 测试样例。

---

## 🧪 自动化测试验证

系统配备 100% 通过的自动化测试套件：

```bash
# 运行全量 19 项单元、集成与万镜级基准测试
python tests/backend/test_phase0_runner.py ; python tests/test_phase1_runner.py ; python tests/test_phase2_runner.py ; python tests/test_phase3_runner.py

# 运行外网零驻留安全审计
python scripts/verify_zero_residency.py
```

---

## 📄 许可证
FrameForge OS 是单公司私有部署的专业影视制作管理系统，保留所有权利。
