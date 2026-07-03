/**
 * 诊断桌面固定能力：分别测试「Node 直接调 user32」与「PowerShell 调 user32」。
 * 在资源管理器可见的桌面环境下运行：npm run diagnose:desktop
 */
const { spawn } = require("node:child_process");
const koffi = require("koffi");

const user32 = koffi.load("user32.dll");
const kernel32 = koffi.load("kernel32.dll");

const HWND = koffi.alias("HWND", "void *");
const FindWindowW = user32.func("HWND __stdcall FindWindowW(str16 _lpClassName, str16 _lpWindowName)");
const FindWindowExW = user32.func(
  "HWND __stdcall FindWindowExW(HWND hWndParent, HWND hWndChildAfter, str16 lpszClass, str16 lpszWindow)"
);
const SetParent = user32.func("HWND __stdcall SetParent(HWND hWndChild, HWND hWndNewParent)");
const GetLastError = kernel32.func("uint32 __stdcall GetLastError()");
const SendMessageTimeoutW = user32.func(
  "uintptr_t __stdcall SendMessageTimeoutW(HWND hWnd, uint32 Msg, uintptr_t wParam, intptr_t lParam, uint32 fuFlags, uint32 uTimeout, _Out_ uintptr_t *lpdwResult)"
);

const findDesktopWorkerW = () => {
  const progman = FindWindowW("Progman", null);
  if (!progman) {
    return { progman: null, workerw: null };
  }

  const resultPtr = koffi.alloc("uintptr_t", 1);
  SendMessageTimeoutW(progman, 0x052c, 0, 0, 0, 1000, resultPtr);
  koffi.free(resultPtr);

  let workerw = null;
  let current = null;

  while (true) {
    current = FindWindowExW(null, current, "WorkerW", null);
    if (!current) break;

    const shellView = FindWindowExW(current, null, "SHELLDLL_DefView", null);
    if (shellView) {
      workerw = FindWindowExW(null, current, "WorkerW", null);
      break;
    }
  }

  return { progman, workerw: workerw || progman };
};

const testNative = () => {
  try {
    const { progman, workerw } = findDesktopWorkerW();
    const ok = Boolean(progman && workerw);
    return {
      ok,
      detail: `Progman=${progman ? "找到" : "未找到"}, WorkerW=${workerw ? "找到" : "未找到"}`
    };
  } catch (error) {
    return { ok: false, detail: `异常: ${error instanceof Error ? error.message : String(error)}` };
  }
};

const testPowerShell = () =>
  new Promise((resolve) => {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32Desktop {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
}
"@
$progman = [Win32Desktop]::FindWindow("Progman", $null)
if ($progman -eq [IntPtr]::Zero) { exit 2 }
exit 0
`;

    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }
    );

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolve({ ok: false, detail: `无法启动 PowerShell: ${error.message}` });
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ ok: true, detail: "PowerShell 可调用 user32.dll，Progman 已找到" });
        return;
      }

      resolve({
        ok: false,
        detail:
          code === 2
            ? "PowerShell 能运行，但未找到 Progman（桌面 shell 可能未就绪）"
            : `PowerShell 退出码 ${code}${stderr ? `，错误: ${stderr.trim()}` : ""}`
      });
    });
  });

const printSection = (title, result) => {
  const status = result.ok ? "通过" : "失败";
  console.log(`\n[${status}] ${title}`);
  console.log(`  ${result.detail}`);
};

const main = async () => {
  console.log("桌面固定诊断（请在正常桌面环境下运行）");
  console.log("=".repeat(48));

  printSection("Node 直接调用 user32.dll（应用将使用此方式）", testNative());
  printSection("PowerShell 调用 user32.dll（旧方式）", await testPowerShell());

  console.log("\n解读：");
  console.log("  - 若「Node 直接调用」通过，重启应用后桌面固定应能正常工作；");
  console.log("  - 若仅 PowerShell 失败而 Node 通过，说明多半是安全软件拦截了 PowerShell；");
  console.log("  - 若两者都失败，可能是 Explorer 未就绪，或系统限制了桌面层访问。");
};

void main();
