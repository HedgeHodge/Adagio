



import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LogScreen from '../screens/LogScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import { useAuth } from '../context/AuthContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MainApp = () => (
  <Tab.Navigator>
    <Tab.Screen 
      name="Home"
      component={HomeScreen} 
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="home" color={color} size={size} />
        ),
      }}
    />
    <Tab.Screen 
      name="Log" 
      component={LogScreen} 
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="history" color={color} size={size} />
        ),
      }}
    />
    <Tab.Screen 
      name="Settings" 
      component={SettingsScreen} 
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="cog" color={color} size={size} />
        ),
      }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { currentUser } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {currentUser ? (
          <Stack.Screen name="Main" component={MainApp} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;



