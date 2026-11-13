import {useRef} from 'react';
import {StatusBar} from 'expo-status-bar';
import {StyleSheet} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {WebView, type WebViewMessageEvent} from 'react-native-webview';
import {postHealth, readDeviceHealth} from './healthSync';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://facebook.calebbae.xyz';

export default function App() {
  const webRef = useRef<WebView>(null);

  const onMessage = async (event: WebViewMessageEvent) => {
    let msg: {type?: string; token?: string};
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type !== 'sync-health' || !msg.token) return;

    const reply = (result: {ok: boolean; saved?: number; error?: string}) => {
      webRef.current?.injectJavaScript(
        `window.__onHealthSync && window.__onHealthSync(${JSON.stringify(result)}); true;`,
      );
    };

    try {
      const reading = await readDeviceHealth();
      if (reading.samples.length === 0) {
        reply({ok: false, error: 'No health samples in the last day. Grant permission and try again.'});
        return;
      }
      const saved = await postHealth(WEB_URL, msg.token, reading);
      reply({ok: true, saved: saved.saved});
    } catch (err) {
      reply({ok: false, error: err instanceof Error ? err.message : 'Health sync failed'});
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <WebView
          ref={webRef}
          source={{uri: WEB_URL}}
          style={styles.webview}
          allowsBackForwardNavigationGestures
          startInLoadingState
          onMessage={onMessage}
          injectedJavaScriptBeforeContentLoaded="window.__META_SHELL__=true; true;"
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  webview: {flex: 1},
});
