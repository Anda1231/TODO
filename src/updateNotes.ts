/**
 * 将主进程剥标签后的更新日志纯文本，解析为可结构化展示的章节。
 * 约定：`•`/`-`/`*` 为列表项；非列表短行在列表前视为章节标题。
 */

export type ReleaseNotesSection = {
  /** 章节标题，如「新增」「优化」 */
  title?: string;
  /** 列表条目 */
  items: string[];
  /** 无列表时的普通段落 */
  paragraphs: string[];
};

const BULLET_RE = /^[•\-\*]\s+(.*)$/;
const MD_HEADING_RE = /^#{1,6}\s+(.*)$/;

/** 解析更新日志纯文本为章节，供设置页美观展示 */
export const parseReleaseNotes = (text: string): ReleaseNotesSection[] => {
  const sections: ReleaseNotesSection[] = [];
  let current: ReleaseNotesSection = { items: [], paragraphs: [] };

  const flush = (): void => {
    if (!current.title && current.items.length === 0 && current.paragraphs.length === 0) {
      return;
    }
    // 仅一行且无条目时，当作段落，避免误当成标题
    if (current.title && current.items.length === 0 && current.paragraphs.length === 0) {
      current.paragraphs = [current.title];
      current.title = undefined;
    }
    sections.push(current);
    current = { items: [], paragraphs: [] };
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      current.items.push(bullet[1].trim());
      continue;
    }

    const mdHeading = line.match(MD_HEADING_RE);
    if (mdHeading) {
      flush();
      current.title = mdHeading[1].trim();
      continue;
    }

    // 已有列表内容时，新的非列表行开启下一节
    if (current.items.length > 0) {
      flush();
      current.title = line;
      continue;
    }

    if (!current.title && current.paragraphs.length === 0) {
      current.title = line;
      continue;
    }

    current.paragraphs.push(line);
  }

  flush();
  return sections;
};
