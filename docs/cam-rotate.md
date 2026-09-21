# Rotate the TAT CAM key · 轮换腾讯云 CAM 密钥

## What this means / 这是什么意思

**EN:** Earlier remote deploys used a Tencent Cloud **CAM Access Key** (SecretId + SecretKey) so this Mac could call **TAT** (Tencent Automation Tools) and run shell on the Tokyo VM without SSH. That key was pasted into a chat once. Anyone who saw it could control the instance. **Rotate** = disable the old key, create a new one, store the new one only in a password manager — never in git, WeChat, or chat.

**中文：** 之前从 Mac 远程改东京机，用的是腾讯云 **CAM 访问密钥**（SecretId + SecretKey），通过 **TAT（自动化助手）** 在东京虚机上跑命令。这把密钥曾出现在聊天里，等于有人拿到就能动你的服务器。**轮换** = 作废旧密钥 → 新建一把 → 只放在密码管理器，绝不进 git / 微信 / 聊天。

Commit does not store CAM secrets. Helpers under `commit/.local/` stay gitignored.

## Steps / 操作步骤（你自己在控制台点）

1. Open [Tencent Cloud console](https://console.tencentcloud.com/) (international / the account that owns Tokyo).  
   打开腾讯云控制台（持有东京机那套账号）。
2. Go to **CAM** → **Users** → the sub-user used for TAT (or your root if that is what you used).  
   进入 **访问管理 CAM** → **用户** → 当时用于 TAT 的子用户（或误用了主账号密钥则进主账号）。
3. **API keys / Access keys** → find the key that was pasted into chat → **Disable**, then **Delete** when you are sure nothing still needs it.  
   **API 密钥** → 找到曾贴到聊天的那把 → **禁用**，确认不再需要后再 **删除**。
4. If you still need remote ops: **Create key** → copy SecretId / SecretKey **once** into 1Password / Bitwarden.  
   若还要远程运维：**新建密钥** → SecretId/SecretKey **只复制一次**进密码管理器。
5. Do **not** put the new key in this repo, `.env` committed to git, or chat with the agent. When a future deploy needs TAT, paste into the terminal for that session only, or use SSH instead.  
   **不要**把新密钥写进仓库、提交的 `.env`、或再发给 AI。以后要用 TAT，只在本机终端临时 `export`，或改用 SSH。

## Done when / 做完标准

- Old key: Disabled or deleted.  
  旧密钥：已禁用或删除。
- New key (if any): only in password manager.  
  新密钥（如有）：只在密码库。
- Chat history: treat as leaked; rotation is the fix.  
  聊天记录：当作已泄露；轮换就是补救。
