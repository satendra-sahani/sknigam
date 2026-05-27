// Politician (Insight) bottom-tab navigator.
// Matches Claude design's `InsightTabBar`: Home · Explore · Insights · Saved
// with gold top-underline on active tab.

import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/constants';
import { FONTS } from '../utils/theme';
import InsightHome from '../screens/politician/InsightHome';
import InsightExplore from '../screens/politician/InsightExplore';
import InsightInsights from '../screens/politician/InsightInsights';
import InsightSaved from '../screens/politician/InsightSaved';
import { InsightTabParamList } from '../types';

const Tab = createBottomTabNavigator<InsightTabParamList>();

function iconFor(route: keyof InsightTabParamList, focused: boolean): string {
  switch (route) {
    case 'InsightHome':
      return focused ? 'home' : 'home-outline';
    case 'InsightExplore':
      return focused ? 'compass' : 'compass-outline';
    case 'InsightInsights':
      return focused ? 'chart-bar' : 'chart-bar';
    case 'InsightSaved':
      return focused ? 'bookmark' : 'bookmark-outline';
    default:
      return 'circle-outline';
  }
}

const TAB_LABELS: Record<keyof InsightTabParamList, string> = {
  InsightHome: 'Home',
  InsightExplore: 'Explore',
  InsightInsights: 'Insights',
  InsightSaved: 'Saved',
};

export default function InsightTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.indigo,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.paper,
          borderTopColor: COLORS.hairlineSoft,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#0B1426',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.06,
          shadowRadius: 24,
        },
        tabBarLabelStyle: {
          fontSize: 9.5,
          fontWeight: '600',
          fontFamily: FONTS.uiSemiBold,
          letterSpacing: 0.2,
        },
        tabBarIcon: ({ color, focused }) => {
          const name = iconFor(route.name as keyof InsightTabParamList, focused);
          return (
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                backgroundColor: focused ? COLORS.indigoTint : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name={name} size={20} color={color} />
            </View>
          );
        },
      })}>
      <Tab.Screen
        name="InsightHome"
        component={InsightHome}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="InsightExplore"
        component={InsightExplore}
        options={{ title: 'Explore' }}
      />
      <Tab.Screen
        name="InsightInsights"
        component={InsightInsights}
        options={{ title: 'Insights' }}
      />
      <Tab.Screen
        name="InsightSaved"
        component={InsightSaved}
        options={{ title: 'Saved' }}
      />
    </Tab.Navigator>
  );
}
