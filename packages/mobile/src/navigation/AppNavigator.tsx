import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../utils/constants';
import { FONTS } from '../utils/theme';
import AnimatedSplash from '../components/AnimatedSplash';

// Minimum time the animated splash stays on screen even if the auth check
// resolves faster. The cascade + ring animations need ~3.5 s to feel
// purposeful; without this gate field staff would see the splash flash by
// in <500 ms on warm starts.
const SPLASH_MIN_MS = 3500;

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
  if (route === 'Home') return 'view-dashboard-outline';
  if (route === 'Assignments') return 'map-marker-multiple-outline';
  if (route === 'Explore') return 'compass-outline';
  return 'cloud-upload-outline';
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => (
          <Icon
            name={focused ? tabIcon(route.name).replace('-outline', '') : tabIcon(route.name)}
            size={size}
            color={color}
          />
        ),
        tabBarActiveTintColor: COLORS.indigo,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.paper,
          borderTopColor: COLORS.hairlineSoft,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          fontFamily: FONTS.uiSemiBold,
        },
        headerShown: false,
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Assignments" component={AssignmentsScreen} options={{ title: 'Booths' }} />
      <Tab.Screen name="Explore" component={StateScreen} options={{ title: 'Explore' }} />
      <Tab.Screen name="Queue" component={QueueScreen} options={{ title: 'Queue' }} />
    </Tab.Navigator>
  );
}

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMinSplashElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(id);
  }, []);

  if (isLoading || !minSplashElapsed) {
    return <AnimatedSplash />;
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

export default AppNavigator;
