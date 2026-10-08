import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCart } from '../context/CartContext';
import TabBar from '../components/TabBar';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import CartScreen from '../screens/CartScreen';
import TicketsScreen from '../screens/TicketsScreen';
import AccountScreen from '../screens/AccountScreen';

const Tab = createBottomTabNavigator();

const renderTabBar = props => <TabBar {...props} />;
const screenOptions = { headerShown: false };

export default function Tabs() {
  const { count } = useCart();
  return (
    <Tab.Navigator tabBar={renderTabBar} screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{ tabBarBadge: count ? Math.min(count, 99) : undefined }}
      />
      <Tab.Screen name="Tickets" component={TicketsScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
