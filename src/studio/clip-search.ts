import { type FolderGroup, formatFolderGroup } from '@/core/clip-scanner';

const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

const groupText = (group: FolderGroup) =>
  normalize(`${group.folderName} ${formatFolderGroup(group.folderName, group.clips).displayTitle}`);

export const filterClipGroups = (groups: FolderGroup[], query: string): FolderGroup[] => {
  const needle = normalize(query);
  if (!needle) return groups;
  return groups.flatMap((group) => {
    if (groupText(group).includes(needle)) return [group];
    const clips = group.clips.filter((clip) =>
      normalize(`${clip.timestampStr} ${clip.folder}`).includes(needle),
    );
    return clips.length > 0 ? [{ folderName: group.folderName, clips }] : [];
  });
};
