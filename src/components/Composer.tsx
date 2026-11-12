import {useState} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {VStack, HStack, StackItem} from '@astryxdesign/core/Stack';
import {Avatar} from '@astryxdesign/core/Avatar';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Divider} from '@astryxdesign/core/Divider';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {VideoCameraIcon, PhotoIcon, FaceSmileIcon} from '@heroicons/react/24/solid';
import {me} from '../data';

export function Composer({onPost}: {onPost: (text: string) => void}) {
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim()) return;
    onPost(text.trim());
    setText('');
  };
  return (
    <Card elevation="low" padding={3}>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <Avatar name={me.name} src={me.avatar} size="md" tooltip={false} />
          <StackItem size="fill">
            <TextInput
              label="Create a post"
              isLabelHidden
              placeholder={`What's on your mind, ${me.name.split(' ')[0]}?`}
              value={text}
              onChange={setText}
              onEnter={submit}
              width="100%"
            />
          </StackItem>
        </HStack>
        <Divider />
        <HStack gap={1} justify="between" wrap="wrap">
          <Button label="Live video" variant="ghost" icon={<Icon icon={VideoCameraIcon} color="red" />} />
          <Button label="Photo/video" variant="ghost" icon={<Icon icon={PhotoIcon} color="green" />} />
          <Button label="Feeling/activity" variant="ghost" icon={<Icon icon={FaceSmileIcon} color="yellow" />} />
          {text.trim() && <Button label="Post" variant="primary" onClick={submit} />}
        </HStack>
      </VStack>
    </Card>
  );
}
