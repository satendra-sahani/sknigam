import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './hooks/useAuth';
import AppNavigator from './navigation/AppNavigator';
import { setupAutoSync } from './services/offlineQueue';
import { COLORS } from './utils/constants';

// Enable Network Inspection in Chrome DevTools
// This makes XHR/fetch requests visible in the Network tab
if (__DEV__) {
  // @ts-ignore
  global.XMLHttpRequest = global.originalXMLHttpRequest || global.XMLHttpRequest;
  // @ts-ignore
  global.FormData = global.originalFormData || global.FormData;
  // @ts-ignore
  global.Blob = global.originalBlob || global.Blob;
  // @ts-ignore
  global.FileReader = global.originalFileReader || global.FileReader;
}

// Suppress known harmless warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);

const App: React.FC = () => {
  useEffect(() => {
    // Set up auto-sync for offline queue when connectivity is restored
    const unsubscribe = setupAutoSync((syncedCount) => {
      console.log(`[OfflineSync] Synced ${syncedCount} queued items`);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.white}
          translucent={false}
        />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
