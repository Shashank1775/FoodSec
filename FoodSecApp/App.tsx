import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import HomeScreen from './app/screens/home/HomeScreen';
import ScanScreen from './app/screens/scan/ScanScreen';
import ItemsScreen from './app/screens/items/ItemsScreen';
import { ItemDetailsScreen } from './app/screens/items/ItemDetailsScreen';
import LoginScreen from './app/screens/auth/LoginScreen';
import RegisterScreen from './app/screens/auth/RegisterScreen';

import { AuthProvider, useAuth } from './app/contexts/AuthContext';
import { ItemsStackParamList, MainTabParamList, RootStackParamList } from './app/navigation/types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const ItemsStack = createNativeStackNavigator<ItemsStackParamList>();

const ItemsStackNavigator = () => (
  <ItemsStack.Navigator>
    <ItemsStack.Screen name="ItemsList" component={ItemsScreen} options={{ title: 'My Items' }} />
    <ItemsStack.Screen name="ItemDetails" component={ItemDetailsScreen} options={{ title: 'Item' }} />
  </ItemsStack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#4CAF50',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarIcon: ({ color, size }) => <MaterialIcons name="home" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="Scan"
      component={ScanScreen}
      options={{
        tabBarIcon: ({ color, size }) => <MaterialIcons name="camera" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="Items"
      component={ItemsStackNavigator}
      options={{
        tabBarIcon: ({ color, size }) => <MaterialIcons name="list" color={color} size={size} />,
      }}
    />
  </Tab.Navigator>
);

/** Auth gate: the navigator only ever contains the screens the current auth state allows. */
const Navigation = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <RootStack.Screen name="Main" component={MainTabs} />
      ) : (
        <>
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </RootStack.Navigator>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <NavigationContainer>
            <Navigation />
          </NavigationContainer>
          <StatusBar style="auto" />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
