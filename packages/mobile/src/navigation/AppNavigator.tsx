import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../utils/constants';
import api from '../services/api';

import LoginScreen, { OtpVerificationScreen } from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CheckInScreen from '../screens/CheckInScreen';
import SubmitCountScreen from '../screens/SubmitCountScreen';
import VotersScreen from '../screens/VotersScreen';
import IncidentScreen from '../screens/IncidentScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

import { RootStackParamList, MainTabParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        if (response.data.success) {
          setUnreadCount(response.data.data?.count || 0);
        }
      } catch {
        // Ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'CheckIn':
              iconName = focused ? 'map-marker' : 'map-marker-outline';
              break;
            case 'Submit':
              iconName = focused
                ? 'clipboard-check'
                : 'clipboard-check-outline';
              break;
            case 'Voters':
              iconName = focused ? 'account-group' : 'account-group-outline';
              break;
            case 'Incidents':
              iconName = focused ? 'alert-circle' : 'alert-circle-outline';
              break;
            case 'Notifications':
              iconName = focused ? 'bell' : 'bell-outline';
              break;
            default:
              iconName = 'circle';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
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
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: COLORS.white,
          elevation: 1,
          shadowOpacity: 0.05,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: COLORS.grey800,
        },
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home', headerShown: false }}
      />
      <Tab.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{ title: 'Check-In' }}
      />
      <Tab.Screen
        name="Submit"
        component={SubmitCountScreen}
        options={{ title: 'Submit' }}
      />
      <Tab.Screen
        name="Voters"
        component={VotersScreen}
        options={{ title: 'Voters' }}
      />
      <Tab.Screen
        name="Incidents"
        component={IncidentScreen}
        options={{ title: 'Incidents' }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Alerts',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.danger,
            fontSize: 10,
            fontWeight: '700',
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
        }}
      />
    </Tab.Navigator>
  );
}

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Icon name="vote" size={64} color={COLORS.primary} />
        <Text style={styles.splashText}>Election Campaign</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="OtpVerification"
              component={OtpVerificationScreen}
            />
          </>
        ) : (
          <Stack.Screen name="MainTabs" component={MainTabs} />
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
  splashText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.grey800,
  },
});

export default AppNavigator;
