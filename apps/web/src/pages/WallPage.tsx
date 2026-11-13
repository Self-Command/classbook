import { Chip } from '@heroui/react';
import { IconMessage } from '@/components/icons';
import { MessageBoard } from '@/components/content/MessageBoard';
import { PageShell } from '@/components/content/PageShell';

export default function WallPage() {
  return (
    <PageShell
      action={
        <Chip color="accent" size="sm" variant="soft">
          <IconMessage className="size-3.5" />
          <Chip.Label>以真实姓名展示</Chip.Label>
        </Chip>
      }
      description="那些当面没说完的话，就写在这里吧。"
      eyebrow="纸短情长"
      title="班级留言墙"
    >
      <div className="mx-auto max-w-3xl">
        <MessageBoard
          description="按时间倒序，最新的话在最上面。"
          emptyDescription="第一个留下字迹的人，会被记得很久。"
          emptyTitle="留言墙还空着"
          heading="大家的留言"
        />
      </div>
    </PageShell>
  );
}