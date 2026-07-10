/**
 * Windows 桌面窗口附着模块。
 *
 * 原理：Windows 桌面由 Progman → WorkerW → SHELLDLL_DefView 层级构成。
 * 将 Electron 窗口 SetParent 到 WorkerW 后，窗口会显示在壁纸之上、桌面图标之下。
 *
 * 附着目标优先级：
 * 1. sibling WorkerW（最标准，Win+D 后仍显示）
 * 2. Progman（部分机器没有 sibling WorkerW，但仍可附着）
 */
import koffi from "koffi";
import type { BrowserWindow } from "electron";

const user32 = koffi.load("user32.dll");
const kernel32 = koffi.load("kernel32.dll");

const HWND = koffi.alias("HWND", "void *");
type Hwnd = object | null;

export type DesktopAttachHost = "workerw" | "progman";

const FindWindowW = user32.func("HWND __stdcall FindWindowW(str16 _lpClassName, str16 _lpWindowName)");
const FindWindowExW = user32.func(
  "HWND __stdcall FindWindowExW(HWND hWndParent, HWND hWndChildAfter, str16 lpszClass, str16 lpszWindow)"
);
const GetParent = user32.func("HWND __stdcall GetParent(HWND hWnd)");
const SetParent = user32.func("HWND __stdcall SetParent(HWND hWndChild, HWND hWndNewParent)");
const ShowWindow = user32.func("int __stdcall ShowWindow(HWND hWnd, int nCmdShow)");
const GetLastError = kernel32.func("uint32 __stdcall GetLastError()");
const SetLastError = kernel32.func("void __stdcall SetLastError(uint32 dwErrCode)");
const SendMessageTimeoutW = user32.func(
  "uintptr_t __stdcall SendMessageTimeoutW(HWND hWnd, uint32 Msg, uintptr_t wParam, intptr_t lParam, uint32 fuFlags, uint32 uTimeout, _Out_ uintptr_t *lpdwResult)"
);

const WM_SPAWN_WORKER = 0x052c;
const SW_SHOWNA = 8;

const readHwnd = (window: BrowserWindow): Hwnd => {
  const handle = window.getNativeWindowHandle();
  return koffi.decode(handle, HWND);
};

const spawnDesktopWorker = (progman: Hwnd): void => {
  const resultPtr = koffi.alloc("uintptr_t", 1);
  SendMessageTimeoutW(progman, WM_SPAWN_WORKER, 0, 0, 0, 1000, resultPtr);
  koffi.free(resultPtr);
};

const findSiblingWorkerW = (): Hwnd => {
  const progman = FindWindowW("Progman", null);
  if (!progman) {
    return null;
  }

  spawnDesktopWorker(progman);

  let current: Hwnd = null;
  while (true) {
    current = FindWindowExW(null, current, "WorkerW", null);
    if (!current) {
      break;
    }

    const shellView = FindWindowExW(current, null, "SHELLDLL_DefView", null);
    if (shellView) {
      return FindWindowExW(null, current, "WorkerW", null);
    }
  }

  return null;
};

const findDesktopAttachTarget = (): { host: DesktopAttachHost; hwnd: Hwnd } | null => {
  const progman = FindWindowW("Progman", null);
  if (!progman) {
    return null;
  }

  spawnDesktopWorker(progman);

  const workerw = findSiblingWorkerW();
  if (workerw) {
    return { host: "workerw", hwnd: workerw };
  }

  return { host: "progman", hwnd: progman };
};

export const isDesktopHostAvailable = (): boolean => process.platform === "win32" && FindWindowW("Progman", null) !== null;

export const isWindowDesktopAttached = (window: BrowserWindow): boolean => {
  if (process.platform !== "win32") {
    return false;
  }

  try {
    const targetHwnd = readHwnd(window);
    const parent = GetParent(targetHwnd);
    return parent !== null && parent !== undefined;
  } catch {
    return false;
  }
};

export const detachWindowFromDesktop = (window: BrowserWindow): boolean => {
  if (process.platform !== "win32") {
    return false;
  }

  try {
    const targetHwnd = readHwnd(window);
    SetParent(targetHwnd, null);
    return true;
  } catch {
    return false;
  }
};

/** 已附着时同步尺寸/位置，避免缩放时整窗 detach/attach 闪烁。 */
export const syncDesktopWindowBounds = (window: BrowserWindow): void => {
  if (!isWindowDesktopAttached(window)) {
    return;
  }

  const bounds = window.getBounds();
  window.setBounds(bounds);
  ShowWindow(readHwnd(window), SW_SHOWNA);
};

export const attachWindowToDesktop = async (window: BrowserWindow): Promise<boolean> => {
  if (process.platform !== "win32") {
    return false;
  }

  try {
    const targetHwnd = readHwnd(window);
    const bounds = window.getBounds();

    detachWindowFromDesktop(window);

    const target = findDesktopAttachTarget();
    if (!target?.hwnd) {
      return false;
    }

    SetLastError(0);
    const previousParent = SetParent(targetHwnd, target.hwnd);
    const lastError = GetLastError();
    if (!previousParent && lastError !== 0) {
      return false;
    }

    // 交给 Electron 同步子窗口几何，比手写屏幕坐标 SetWindowPos 更稳
    window.setBounds(bounds);
    ShowWindow(targetHwnd, SW_SHOWNA);
    return true;
  } catch {
    return false;
  }
};
