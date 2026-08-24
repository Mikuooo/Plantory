import { HeaderBar } from '@/components/header-bar';
import { AppSidebarAvatarButton } from '@/components/app-sidebar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ArchiveScreen() {
  return <ThemedView className="flex-1"><HeaderBar title="归档" subtitle="所有历史记录" leading={<AppSidebarAvatarButton />} /><ThemedText className="mt-[120px] px-6 text-center" themeColor="textSecondary">完成的养护和成长记录会出现在这里</ThemedText></ThemedView>;
}
