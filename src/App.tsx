import {useState} from 'react';
import {Theme} from '@astryxdesign/core/theme';
import {AppShell} from '@astryxdesign/core/AppShell';
import {Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {VStack} from '@astryxdesign/core/Stack';
import {Center} from '@astryxdesign/core/Center';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {facebookTheme} from './theme';
import {Header, type Section} from './components/Header';
import {LeftNav} from './components/LeftNav';
import {RightPanel} from './components/RightPanel';
import {Stories} from './components/Stories';
import {Composer} from './components/Composer';
import {PostCard} from './components/PostCard';
import {BottomBar} from './components/BottomBar';
import {me, posts as seedPosts, type Post} from './data';

export default function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [section, setSection] = useState<Section>('home');
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const showContacts = useMediaQuery('(min-width: 1100px)');

  const addPost = (text: string) =>
    setPosts(p => [
      {id: `p${Date.now()}`, author: me, time: 'Just now', audience: 'Friends', text, likes: 0, comments: 0, shares: 0},
      ...p,
    ]);

  return (
    <Theme theme={facebookTheme} mode={mode}>
      <AppShell
        variant="wash"
        contentPadding={0}
        topNav={
          <Header
            section={section}
            onSectionChange={setSection}
            isMobile={isMobile}
            mode={mode}
            onToggleMode={() => setMode(m => (m === 'light' ? 'dark' : 'light'))}
          />
        }
        sideNav={<LeftNav />}>
        <Layout
          height="fill"
          padding={isMobile ? 0 : 4}
          end={showContacts && <RightPanel />}
          footer={isMobile && <BottomBar section={section} onSectionChange={setSection} />}
          content={
            <LayoutContent padding={isMobile ? 2 : 4}>
              <Center axis="horizontal" width="100%">
                <VStack gap={4} maxWidth={680} width="100%">
                {section === 'home' ? (
                  <>
                    <Stories />
                    <Composer onPost={addPost} />
                    {posts.map(p => (
                      <PostCard key={p.id} post={p} />
                    ))}
                  </>
                ) : (
                  <EmptyState
                    title={section[0].toUpperCase() + section.slice(1)}
                    description="This section is a placeholder in the UI clone."
                  />
                )}
                </VStack>
              </Center>
            </LayoutContent>
          }
        />
      </AppShell>
    </Theme>
  );
}
