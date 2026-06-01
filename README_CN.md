# codex-switch

[English](README.md) | **中文**

一个用于在多个 OpenAI Codex CLI 凭据 / Provider 配置之间切换的小工具。

每个 profile 有一个 **kind（类型）**：

- **official（官方）** —— 使用 Codex 内置的 OpenAI provider。切换时
  会重写 `~/.codex/auth.json`，并从 `~/.codex/config.toml` 中删除
  `model_provider` 字段。
- **custom（自定义）** —— 覆盖 `model_provider`，并写入对应的
  `[model_providers.<name>]` 表（例如 `tokenflux`、代理、本地
  Ollama 等）。

切换是原子的。`config.toml` 中除上述两处之外的其它内容（model、
personality、features、projects、mcp_servers、tui 等）都保持不变。

## 安装

```bash
cd /path/to/CodexSwitch
npm install
npm link
```

之后 `codex-switch` 命令就会出现在你的 PATH 中。

## 用法

直接运行会打开一个全屏 TUI（基于 Ink，左右两栏：profile 列表 + 详情，
底部一行快捷键提示）：

```bash
codex-switch
```

TUI 中的快捷键：

- `↑↓` / `j` `k` —— 移动光标
- `Enter` —— 切换到当前高亮的 profile
- `a` —— 新建 profile（先选 official 或 custom）
- `e` —— 编辑当前 profile
- `r` —— 重命名
- `d` —— 删除
- `i` —— 把当前 `~/.codex` 的状态导入为一个新 profile
- `q` / `Esc` —— 退出

如果想用在脚本里，可以用子命令：

```bash
codex-switch list                     # 列出所有 profile，* 标记当前激活
codex-switch current                  # 打印当前检测到的激活 profile 名
codex-switch use <name>               # 切换到指定 profile
codex-switch show <name>              # 打印 profile 详情（密钥已掩码）
codex-switch import [name]            # 把当前 ~/.codex 状态导入为 profile
codex-switch rm <name>                # 删除 profile
codex-switch rename <old> <new>       # 重命名
codex-switch --help
codex-switch --version
```

首次运行时会自动把当前的 `~/.codex` 状态导入为名为 `current` 的
profile。新建 **official** profile 时，工具会直接读取当前的
`~/.codex/auth.json`（请先 `codex login`），不需要手动编辑；新建
**custom** profile 时会用 `$EDITOR` 打开 TOML（providerBlock）和
JSON（authJson）模板供你填写。

## 数据存放位置

- Profile 文件：`~/.config/csw/profiles.json`（权限 0600）
- 备份目录：`~/.config/csw/backups/` —— 第一次切换时会把原始的
  `auth.json` 和 `config.toml` 各拷贝一份，仅备份一次。

profiles.json 以明文保存 API key / OAuth token，权限被设为 0600。
