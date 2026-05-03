import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { COLORS } from '../utils/constants';

import LoginScreen, { OtpVerificationScreen } from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AssignmentsScreen from '../screens/AssignmentsScreen';
import BoothVotersScreen from '../screens/BoothVotersScreen';
import VoterVisitScreen from '../screens/VoterVisitScreen';
import QueueScreen from '../screens/QueueScreen';
import StateScreen from '../screens/hierarchy/StateScreen';
import DistrictsScreen from '../screens/hierarchy/DistrictsScreen';
import ConstituenciesScreen from '../screens/hierarchy/ConstituenciesScreen';
import BoothsInAcScreen from '../screens/hierarchy/BoothsInAcScreen';

import { RootStackParamList, MainTabParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function tabIcon(route: keyof MainTabParamList) {
  if (route === 'Home') return 'view-dashboard';
  if (route === 'Assignments') return 'map-marker-multiple';
  if (route === 'Explore') return 'compass-outline';
  return 'cloud-upload';
}

function MainTabs() {
  const { t } = useI18n();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <Icon name={tabIcon(route.name)} size={size} color={color} />
        ),
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.grey400,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.grey200,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tab_home') }} />
      <Tab.Screen name="Assignments" component={AssignmentsScreen} options={{ title: t('tab_booths') }} />
      <Tab.Screen name="Explore" component={StateScreen} options={{ title: t('tab_explore') }} />
      <Tab.Screen name="Queue" component={QueueScreen} options={{ title: t('tab_sync') }} />
    </Tab.Navigator>
  );
}

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Icon name="vote" size={64} color={COLORS.primary} />
        <Text style={styles.splashText}>POLLSTICS</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="BoothVoters" component={BoothVotersScreen} />
            <Stack.Screen name="VoterVisit" component={VoterVisitScreen} />
            <Stack.Screen name="Districts" component={DistrictsScreen} />
            <Stack.Screen name="Constituencies" component={ConstituenciesScreen} />
            <Stack.Screen name="BoothsInAc" component={BoothsInAcScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    gap: 16,
  },
  splashText: { fontSize: 22, fontWeight: '800', color: COLORS.grey800 },
});

export default AppNavigator;
